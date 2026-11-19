# Vibe Secure Me

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Vibe Secure Me** is a platform-agnostic skill for agentic AI coding assistants (Claude Code, Gemini, Codex, Cursor, Antigravity and others). It has two modes:

| Mode | Finds | Baselines |
| --- | --- | --- |
| **Security** | Vulnerabilities an attacker could exploit: leaked secrets, broken auth and access control (IDOR, RLS), injection, XSS/SSRF, payment logic, AI/agent and MCP risks, supply-chain worms and CI/CD compromise, cloud, containers, known-vulnerable framework versions | OWASP Top 10:2025, API / Mobile / CI-CD / LLM Top 10, OWASP Agentic Top 10 (2026), CWE |
| **Audit** | What will burn money, exhaust quotas or fall over under load: accidentally dynamic pages, serverless CPU and invocation burn, missing caching, polling, N+1 queries, storage and media egress, log volume, LLM token spend, push/realtime storms, media-host AUP risk, missing timeouts and spend caps | Platform metering on Vercel, Netlify, Cloudflare, AWS, Supabase, Firebase and more |

## Features

- **Two modes, one command:** run `/secure-me` with no arguments and it asks whether to audit or check security, explaining each. Pass `security`, `audit`, `both` or `threat-model` to skip the question.
- **Current threat intel:** covers recent framework CVEs (Next.js/React Server Components), 2025–2026 npm worm campaigns, GitHub Actions cache-poisoning and OIDC attacks, MCP and coding-agent CVEs, and slopsquatting.
- **Evidence-based findings:** every finding is traced from source to sink (or from request to the metered resource), with a CWE/OWASP mapping or a cost-impact rating and a before/after fix.
- **Guardrails, not just reports:** the audit can write its applicable rules into your project's `AGENTS.md` / `CLAUDE.md`, so your agent stops reintroducing the problems.
- **Defensive only:** no exploit payloads or attack tooling.

## Installation

You can install this skill into your project so your AI assistant can access it.

**Method 1: Manual Drop-in (Works for any AI IDE / Agent)**
Copy the `SKILL.md` contents into your AI's custom instructions file (e.g., `.cursorrules`, `.windsurfrules`, `CLAUDE.md`, or your agent's system prompt).
Alternatively, clone this repository directly into your project's agent skills directory:
```bash
git clone https://github.com/ajibolagenius/vibe-secure-me.git .agent-skills/secure-me
```

**Method 2: Via npm (any agent)**
```bash
npx vibe-secure-me install
```
Installs into `~/.claude/skills/secure-me`. Use `--project` to install into `./.claude/skills` so the skill ships with a repository, `--dir <path>` to target another agent's skills directory, and `--force` to overwrite an existing copy. Remove it with `npx vibe-secure-me uninstall`.

**Method 3: Via curl (no Node required)**
```bash
curl -fsSL https://raw.githubusercontent.com/ajibolagenius/vibe-secure-me/main/install.sh | bash
```
This installs the pinned release, not the tip of `main`. `SKILL.md` is read as instructions by an agent, so tracking a moving branch would mean any push lands directly in your agent's context — the installer defaults to an immutable tag instead.

| Variable | Effect |
| --- | --- |
| `SECURE_ME_REF` | Install a different tag, or `main` to track the branch |
| `SECURE_ME_DIR` | Install into a project, e.g. `./.claude/skills` |
| `SECURE_ME_REPO` | Install from a fork, as `owner/repo` |

An existing install is moved to a timestamped backup rather than overwritten; the two most recent backups are kept and older ones removed.

**Method 4: Via Claude Code plugin**
```
/plugin marketplace add ajibolagenius/vibe-secure-me
/plugin install vibe-secure-me@vibe-secure-me
```
Updates then arrive through `/plugin update vibe-secure-me`.

**Method 5: Via Antigravity CLI**
If you are using Google Antigravity, you can install it directly as a plugin:
```bash
agy plugin install https://github.com/ajibolagenius/vibe-secure-me.git
```

## Usage

```
/secure-me                          # asks: Security check, Audit, or Both — and what scope
/secure-me security                 # full security review
/secure-me security auth payments   # only the auth and payments steps
/secure-me audit                    # full cost / quota / reliability audit
/secure-me audit storage src/app    # one area, one path
/secure-me both                     # security, then audit, one combined report
/secure-me threat-model             # STRIDE review of a design with no code yet
```

Agents without slash commands work the same way through natural language: *"check the security of my auth flow"*, *"why is my Vercel bill so high?"*, *"we keep hitting the Supabase egress cap"*. A bare or ambiguous request ("audit this app") gets the mode question.

Either mode returns findings ordered Critical → Low, a list of skipped areas and a prioritized roadmap, then offers to apply fixes.

## Repository layout

```
plugin.json                      Antigravity plugin manifest
.claude-plugin/                  Claude Code plugin + marketplace manifests
skills/secure-me/SKILL.md                    Router: mode selection, shared rules, report skeleton
skills/secure-me/references/security/        Security playbook (index.md) + 24 deep-dive references
skills/secure-me/references/audit/           Audit playbook (index.md) + 9 deep-dive references
bin/cli.js                       npm installer
install.sh                       curl installer
```

`SKILL.md` is what the agent loads when the skill triggers. It picks the mode, then sends the agent to that mode's `index.md` playbook. The playbook sends it to individual references only for the areas the codebase actually has. That keeps the always-loaded footprint small while the depth stays available.

`references/security/threat-intel.md` and `references/audit/platforms.md` contain dated facts (CVEs, campaigns, quotas). Refresh them when you cut a release.

## Development

```bash
npm test                    # verify the packaged skill and the benchmark corpus
claude plugin validate .    # check the Claude Code manifests
```

### Benchmark suite

`tests/` holds a corpus for **security mode**: 16 known-vulnerable cases and 4 control cases — code that superficially resembles a vulnerability but is correctly written. Control cases matter as much as detection ones: an auditor that flags everything has perfect recall and no value, so a finding raised against a control case counts as a false positive.

```bash
node tests/run.js validate            # corpus integrity (runs in CI)
node tests/run.js manifest            # emit the audit worklist for an eval run
node tests/run.js score results.json  # recall and false-positive rate
```

CI validates corpus integrity only. Scoring detection quality requires running an agent over the fixtures — see [tests/README.md](tests/README.md).

CI runs both on every push, plus a version-agreement check across `package.json`, `plugin.json`, and `.claude-plugin/plugin.json` — bump all three together when releasing. `SKILL.md` carries its own independent content version.

### Releasing

1. Bump the version in `package.json`, `plugin.json`, and `.claude-plugin/plugin.json`.
2. Bump `PINNED_REF` in `install.sh` to match. CI fails if it drifts, so this can't be forgotten silently.
3. Merge, then publish a GitHub release tagged `v<version>`.

The release triggers `.github/workflows/publish.yml`, which re-runs the checks and publishes to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements) — a signed attestation linking the published tarball to the commit and workflow that produced it. Publishing by hand from a laptop produces no such attestation, so prefer the release flow. It requires an `NPM_TOKEN` secret with publish rights.

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

When adding a reference file, link it from its mode's `index.md` reference table. `node bin/cli.js verify` fails on a link to a missing file, and on a reference file that nothing links to.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
