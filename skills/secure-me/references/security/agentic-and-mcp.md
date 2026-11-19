# Agentic Systems & MCP Security

Baseline: **OWASP Top 10 for Agentic Applications (2026)** (ASI01–ASI10). This file covers applications that run agents: an LLM that picks and calls tools in a loop, MCP servers and clients, multi-agent systems. It also covers the repo itself as input to the user's coding agents. For plain chat or completion features, see `references/security/ai-integration.md`.

**Rule of thumb:** the model is not a security boundary. Anything the agent reads (user input, web pages, emails, tickets, PR text, tool results, file contents, MCP tool descriptions) can carry instructions. Design so that a fully hijacked model still can't do serious damage.

## 1. Goal hijack & indirect injection (ASI01, ASI06)

Look for agents that read attacker-reachable content **and** hold privileged tools in the same loop. That pairing is the "lethal trifecta": private data access, exposure to untrusted content, and a way to exfiltrate (HTTP fetch, email, writing to public places, rendering images or links).

- **Finding:** one agent reads inbound email or support tickets and can also query the customer DB and send email.
- **Controls:** split agents by trust level (a quarantined reader with no tools passes structured data to a privileged actor). Strip or neutralise markup and hidden Unicode (TAG-block characters, zero-width) from tool results. Block model-generated URLs and images that could carry data out. Require human confirmation for side effects triggered after untrusted content entered the context.
- **Memory poisoning (ASI06):** persistent memory, vector stores or "notes" an agent writes and later reads back are a stored-injection channel. Scope memory per user or tenant, record provenance, and never let content from user A's session reach user B's context.

## 2. Tool misuse & excessive capability (ASI02, ASI05)

```python
# BAD: generic, unbounded tools
tools = [run_shell, execute_sql, http_request, write_file]

# GOOD: narrow, typed, scoped tools
@tool
def get_order_status(order_id: str, *, ctx: RequestContext) -> OrderStatus:
    order = db.orders.get(order_id)
    if order is None or order.owner_id != ctx.user_id:   # authz on the *user*, not the agent
        raise NotFound()
    return OrderStatus.from_model(order)
```

- Validate every tool argument against a schema **server-side**. The model's arguments are untrusted input, so the injection rules from steps 9 and 10 apply (SQL, shell, path traversal, SSRF in `fetch_url` tools).
- Authorize every tool call **as the end user**, never with the agent's ambient service credentials. An agent with a service-role DB key plus an injected prompt is BOLA at scale.
- **Unexpected code execution (ASI05):** "code interpreter", `eval`, notebook or shell tools must run in a sandbox (container, gVisor or Firecracker, WASM) with no network by default, no host mounts, CPU/memory/time limits, and no secrets in the environment.
- Destructive or irreversible actions (payments, deletes, sending messages, deploys, permission changes) need explicit human approval that shows the real parameters. Rate-limit and budget every tool.

## 3. Identity & privilege (ASI03)

- Give each agent its own identity with short-lived, least-privilege credentials, scoped per task or session where possible. Don't share one god-token across agents.
- Check for OAuth tokens passed straight through to downstream APIs ("token passthrough"), long-lived PATs in agent env vars, and a single MCP client credential reused across servers. A malicious server must not receive another server's tokens (see the MCP TypeScript SDK issue in threat-intel).
- Log every tool call with the agent identity, the on-behalf-of user, the arguments and the result status (step 21).

## 4. MCP servers you build

- **Transport:** local `stdio` servers run with the user's privileges. Remote HTTP servers must authenticate every request (OAuth 2.1 per the MCP authorization spec), validate the token **audience** is this server, and never forward the client's token upstream.
- **Network binding:** bind local servers and inspectors to `127.0.0.1`, never `0.0.0.0`. Check `Origin`/`Host` to stop DNS-rebinding and CSRF from the browser. Several 2025–2026 RCEs were browser → localhost MCP tooling.
- **Command construction:** never build shell commands from tool arguments. Use `execFile`/`spawn` with an argument array, with no `shell: true`, and allowlist the binaries.
- **Output:** the content you return becomes model context. Don't relay third-party text (issues, commits, web pages) unmarked when it could carry instructions.
- **Session IDs** must be unguessable and bound to the authenticated user. Don't use them as auth.

## 5. MCP servers and clients you consume (ASI04)

- **Tool poisoning / rug pull:** a server's tool *descriptions* go straight into the model's context and can carry hidden instructions. They can also change after approval. Pin server versions and review descriptions, including hidden Unicode.
- Treat `npx some-mcp-server` in a config like any dependency: pinned version, known publisher, and review before upgrades. Unpinned `@latest` in `.mcp.json` means the server's next publish runs on every developer machine.
- Agents must not be able to write their own MCP or tool config (`.mcp.json`, `.cursor/mcp.json`, `.vscode/settings.json`, `~/.claude.json`). A prompt-injected edit to these files has repeatedly turned into command execution.

## 6. The repo as attack surface for coding agents

Repos now contain files that coding agents treat as instructions: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*`, `.windsurfrules`, `.github/copilot-instructions.md`, `GEMINI.md`, skill folders, MCP configs and hook settings (`.claude/settings.json`). Check:

- **Hidden or obfuscated content** in these files: zero-width or TAG-block Unicode, HTML comments, very long lines, or base64 blobs that tell the agent to run commands, fetch URLs, disable checks or exfiltrate env vars.
- **Committed hooks and permissions** that auto-run shell commands or grant broad tool permissions to anyone who opens the repo.
- **Secrets in MCP configs** (API keys in `env` blocks of a committed `.mcp.json`). Move them to the user's env or keychain.
- **AI agents in CI** (`claude`, `gemini`, `codex`, Copilot-agent or custom LLM steps) triggered by `issues`, `issue_comment`, `pull_request_target` or `discussion`. Any outside user can write that text. These jobs need no secrets beyond the minimum, `permissions:` set to read-only by default, no write-capable tokens reachable by the model, and no `--dangerously-skip-permissions` / `--yolo` / `--trust-all-tools` style flags. The Cline (2026) and Nx s1ngularity (2025) incidents both ran through AI in a CI or dev context.

## 7. Multi-agent systems (ASI07, ASI08, ASI10)

- Messages between agents are untrusted input. Authenticate agent-to-agent channels, and validate structured messages against a schema. Don't pass raw model text as a command.
- **Cascading failures (ASI08):** bound loop iterations, recursion depth, fan-out, tokens and wall-clock time for each task. Add a global kill switch. A runaway agent is a security problem and a cost problem; see Audit mode, `references/audit/ai-spend.md`.
- **Rogue agents (ASI10):** monitor for agents acting outside their declared scope (new tools, new destinations, unusual volumes), and make revocation instant.

## 8. Human-agent trust (ASI09)

Approval prompts must show what will actually happen: the full command, recipient, amount and diff, not the model's summary of it. Watch for approval fatigue in UIs that ask for confirmation on every trivial step, because users then rubber-stamp the dangerous one.

## Finding checklist

| Check | Typical severity |
| --- | --- |
| Agent with untrusted input + private data + an exfiltration channel, no approval gate | Critical |
| Tool calls executed with service credentials, no per-user authz | Critical/High |
| Shell/code tool without a sandbox, or shell built from tool args | Critical |
| Remote MCP server without auth, or local one bound to `0.0.0.0` | High |
| LLM step in CI triggered by outsider-writable events with secrets or write tokens | High/Critical |
| Unpinned third-party MCP server in a committed config | Medium |
| Hidden-instruction content in agent instruction files | High (and report it to the user immediately) |
| No iteration, token or time bounds on agent loops | Medium |
