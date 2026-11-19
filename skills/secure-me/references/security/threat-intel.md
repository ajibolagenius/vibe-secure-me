# Threat Intel: Known-Vulnerable Components & Recent Campaigns

**As of: November 2026.** This file goes stale. Use it as a checklist of *what to look for*, then confirm against live sources when you can (`npm audit`, `osv-scanner`, `pip-audit`, GitHub Security Advisories, vendor advisories). Several 2026 entries come from secondary reporting, so verify the advisory ID before quoting it to the user. If you can't verify, say "per threat-intel as of Nov 2026".

How to check:

1. Read **installed** versions from the lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `poetry.lock`, `uv.lock`), not the semver range in the manifest.
2. Find the runtime version (`.nvmrc`, `engines`, `Dockerfile` `FROM`, platform settings).
3. Compare against the entries below. Report a match as a finding: **Critical** for unauthenticated RCE or auth bypass on an internet-facing app, otherwise rated on reachability.
4. The fix is almost always "upgrade to the latest patch release of your minor line". Name the minimum fixed version when it's known.

---

## Next.js / React Server Components

| When | Issue | Affected / condition | Fix |
| --- | --- | --- | --- |
| Mar 2025 | **CVE-2025-29927**: middleware authorization bypass via the internal `x-middleware-subrequest` header | Self-hosted Next.js (`next start`, standalone) that enforces auth **only** in middleware | ≥ 12.3.5 / 13.5.9 / 14.2.25 / 15.2.3. Also strip the header at the proxy. **Lesson:** middleware is not an authorization layer; check auth again in each route handler, server action and data access function. |
| Dec 2025 | **CVE-2025-55182 ("React2Shell")**: unauthenticated RCE through unsafe deserialization in the RSC Flight protocol, CVSS 10.0, exploited in the wild within hours | `react-server-dom-webpack/-parcel/-turbopack` 19.0.0–19.2.0, which includes Next.js 15.x/16.x App Router apps even without explicit server actions | React ≥ 19.0.1 / 19.1.2 / 19.2.1 and the matching patched Next.js release. Follow-ups CVE-2025-55183 (server function source exposure), CVE-2025-55184 and CVE-2025-67779 (DoS) need the later patches. Rotate secrets if the app was exposed while unpatched. |
| 2026 | CVE-2026-23870: RSC / App Router DoS | App Router | Latest patch |
| 2026 | CVE-2026-44578: SSRF via WebSocket upgrade handling | Self-hosted Node server | Latest patch |
| 2026 | CVE-2026-94485: `next dev` exposes a Model Context Protocol endpoint | 16.0.0–16.3.8, dangerous when the dev server is bound to `0.0.0.0` or tunnelled | Upgrade; never expose dev servers |
| Oct 2026 | **CVE-2026-96889** (GHSA-2464-fhr4-w9xw): RCE through image/SVG processing | Node runtime processing untrusted SVG through `sharp` on glibc Linux; `next/og` on Node may be exposed even without `dangerouslyAllowSVG` | 15.5.28 (with sharp ≥ 0.35.5) or 16.4.1 |
| Oct 2026 | GHSA-673q-mjm6-r5xr: unauthenticated RCE in `use cache` | 16.x with Cache Components where a `use cache` function returns typed arrays (unusual) | 16.4.1 |
| Oct 2026 | Server Actions DoS (high) | App Router | 15.5.28 / 16.4.1 |

## Node.js runtime

- **CVE-2026-111497**: Brotli decompression RCE. Fixed in 22.23.4, 24.22.1 and 26.12.1.
- **End of life, no fixes:** Node 20, 23 and 25. Running an EOL runtime in production is a finding (High if internet-facing), because future CVEs won't be patched. Check Dockerfiles, CI matrices and platform runtime settings.

## npm / PyPI supply-chain campaigns

Pattern: a maintainer account or a CI pipeline is compromised. Malicious versions run code at install time, harvest tokens (npm, GitHub, cloud, CI secrets, SSH keys), and often republish themselves into the victim's other packages.

| When | Campaign | Notable details |
| --- | --- | --- |
| Mar 2025 | `tj-actions/changed-files` (CVE-2025-30066) | A popular GitHub Action was retagged to dump CI secrets into logs. Shows why actions must be pinned to commit SHAs. |
| Aug 2025 | **Nx "s1ngularity"** | Malicious `nx` versions ran `postinstall` that invoked locally installed **AI coding CLIs** with permission-bypass flags to hunt for secrets, then pushed them to public repos named `s1ngularity-repository*`. Root cause: script injection in a `pull_request_target` workflow. |
| Sep 2025 | `chalk` / `debug` + 16 others | Maintainer phished through a lookalike npm domain. Browser-side crypto-wallet drainer. |
| Sep 2025 | **Shai-Hulud** worm | About 500 packages. Used `trufflehog` to harvest secrets. Indicators: a public repo named `Shai-Hulud`, `.github/workflows/shai-hulud-workflow.yml`. |
| Nov 2025 | **Shai-Hulud 2.0** | About 800 packages (Zapier, ENS, PostHog, Postman SDKs). `preinstall` drops `setup_bun.js` / `bun_environment.js`. Indicators: repos described "Sha1-Hulud: The Second Coming", `.github/workflows/discussion.yaml`, a self-hosted runner named `SHA1HULUD`. Has a destructive fallback. |
| May 2026 | **TanStack** (CVE-2026-45321) | `pull_request_target` → Actions **cache poisoning** → OIDC token minted in the release job → 84 malicious versions across 42 `@tanstack/*` packages **with valid provenance**. Provenance does not prove the build was clean. |
| May 2026 | "Mini Shai-Hulud" (TeamPCP) | 160+ npm and PyPI packages, including Mistral AI and UiPath. Credential theft plus a persistent daemon that can wipe the home directory. |
| Jun 2026 | Red Hat npm packages | 32 packages, published through GitHub Actions OIDC (a pipeline compromise, not a stolen token). |
| Jun 2026 | **Miasma / binding.gyp** | Code runs at install through `binding.gyp` (node-gyp), so **`--ignore-scripts` checks on `package.json` scripts miss it**. 57 packages, including `@vapi-ai/server-sdk`. |
| Aug 2026 | **ChainDrop** | 444 packages and 1,300+ versions in about 4 hours, starting at `keyv`, `cacheable` and `ecto`. Payload is Bun-loaded and harvests CI/CD credentials, with Ethereum dead-drop C2. |

**What to check in the repo:**

- Lockfile entries for packages from these campaigns at versions published inside the compromise windows. Point the user to the vendor IoC lists (StepSecurity, Socket, Aikido, Snyk, Datadog, Microsoft) for exact versions, and don't guess version numbers.
- Unexpected workflow files (`shai-hulud-workflow.yml`, `discussion.yaml`), unknown self-hosted runners, `setup_bun.js` / `bun_environment.js` in `node_modules`, and unexpected `binding.gyp` in pure-JS packages.
- If any match: **rotate everything** reachable from machines and CI that installed the package: npm and GitHub tokens, cloud keys, CI secrets, SSH keys, and `.env` contents.

## AI coding agents, MCP & agent tooling

| When | Issue | Lesson |
| --- | --- | --- |
| 2025 | `mcp-remote` CVE-2025-6514 (OS command injection through a malicious OAuth `authorization_endpoint`, CVSS 9.6); MCP Inspector CVE-2025-49596 (RCE through CSRF to a localhost proxy) | Connecting to an untrusted MCP server is running untrusted code. Local dev tools listening on localhost are reachable from the browser. |
| 2025 | Cursor CVE-2025-54135 / CVE-2025-54136: prompt injection writes or swaps MCP config → command execution | An agent that can write its own tool config can escalate itself. |
| 2025 | Framelink Figma MCP CVE-2025-53967; Anthropic reference Git MCP server CVE-2025-68143/68144/68145 (injection through commit messages, branch names, repo metadata) | Any data a tool returns (designs, commits, issues) is an injection channel. |
| 2026 | Windsurf CVE-2026-30615: attacker HTML registers a malicious MCP STDIO server | Same class. Several other IDEs and agents were reported vulnerable to command injection through MCP JSON config. |
| 2026 | Context7 MCP CVE-2026-75130: poisoned "custom instructions" executed as trusted directives | Documentation and context servers are an injection channel too. |
| 2026 | MCP TypeScript SDK CVE-2026-104850: a malicious server can receive the client's refresh token and client secret | Keep MCP SDKs patched, and scope OAuth tokens per server. |
| 2026 | MCPJam Inspector CVE-2026-23744 (RCE, 9.8); Kong Konnect MCP CVE-2026-13341 (indirect injection → unintended API calls) | Treat dev and inspector tools as attack surface. |
| Feb–Mar 2026 | An autonomous bot attacked major OSS repos through `pull_request_target` checkouts and branch-name injection. The **Cline** compromise went through an **AI issue-triage workflow** on `issues: opened` | An LLM in CI that reads issue or PR text is a prompt-injection entry point into a credentialed job. |

## Vibe-coded backend exposures (pattern, not a CVE)

2026 reporting repeatedly found BaaS backends readable without auth: a Firebase instance with `allow read: if true` (hundreds of millions of records); a Supabase project with RLS disabled and a key embedded in the frontend (about 1.5M API tokens); scans finding 16,000+ publicly readable Supabase databases; and about 5,000 of 380,000 scanned AI-built apps leaking data. **Always run step 2 (database access control) on any Supabase, Firebase or BaaS project.**

## Slopsquatting

AI assistants hallucinate plausible package names, and attackers register them. Different models repeat the *same* hallucinated names, which makes the attack practical (e.g. `react-codeshift`, Jan 2026). Typo-distance checks miss most of them. For every dependency added recently, especially by an AI, check that it exists, is the intended project, has real history and maintainers, and isn't days old.

---

### Sources (for maintainers updating this file)

- Next.js/React Oct 2026: netlify.com/changelog/2026-10-14-nextjs-react-security-vulnerabilities, aviatrix.ai threat research, cyberpress.org
- npm campaigns: microsoft.com/en-us/security/blog/2026/08/04/chaindrop-supply-chain-compromise-anatomy-self-propagating-worm, stepsecurity.io/blog/chaindrop-npm-worm, orca.security/resources/blog/tanstack-npm-supply-chain-worm, snyk.io/blog/node-gyp-supply-chain-compromise-self-propagating-npm-worm-binding-gyp, csa.gov.sg advisory AD-2026-009
- GitHub Actions: wiz.io/blog/github-actions-security-pwn-request-reckoning, socket.dev/blog/github-actions-checkout-blocks-pull-request-target-checkouts
- MCP/agents: valyu.ai/blogs/mcp-ai-agent-vulnerabilities, ox.security MCP STDIO advisory, sentinelone.com CVE-2026-75130
- Vibe-coded leaks: cybernews.com/news/16000-supabase-databases-exposed, labs.cloudsecurityalliance.org (AI codegen vulnerability debt, Apr 2026)
- Slopsquatting: labs.cloudsecurityalliance.org slopsquatting note (May 2026), socket.dev/glossary/slopsquatting
