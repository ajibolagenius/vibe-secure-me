---
name: secure-me
description: Platform-agnostic security and production-readiness reviewer for any AI coding agent, with two modes. SECURITY finds exploitable vulnerabilities, mapped to OWASP Top 10:2025, API/Mobile/CI-CD/LLM Top 10, OWASP Agentic Top 10 (2026) and CWE, covering secrets, auth, RLS, injection, payments, MCP/agent risks, supply-chain worms, cloud and containers. AUDIT finds what burns money, exhausts quotas or falls over under real traffic, such as serverless CPU and invocation burn, egress and storage blowups, uncached reads, polling, N+1 queries, log volume, LLM token spend, media-host AUP risk, missing timeouts and spend caps. Use when asked to review, audit, harden, threat-model or check the security of code; on mentions of OWASP, CWE, CVEs, secrets or pentest prep; or when asked why a bill, quota or function usage is high, how to cut hosting cost, or whether an app is production-ready. Invoked with no arguments, it always asks which mode to run.
argument-hint: "[security | audit | both | threat-model] [focus area or path...]"
license: MIT
metadata:
  author: Ajibola Akelebe - Open Source Community
  version: "4.0.0"
  homepage: https://github.com/ajibolagenius/vibe-secure-me
  npm: https://www.npmjs.com/package/vibe-secure-me
---

# secure-me

One entry point, two modes. Each mode has its own playbook, references and report format.

| Mode | Question it answers | Baselines | Playbook |
| --- | --- | --- | --- |
| **Security** | Can someone break in, steal data, or abuse this? | OWASP Top 10:2025, API / Mobile / CI-CD / LLM Top 10, OWASP Agentic Top 10 (2026), CWE, recent CVEs and campaigns | `references/security/index.md` |
| **Audit** | Will this burn money, exhaust a quota, or fall over under real traffic? | Provider quotas and pricing dimensions, caching and query hygiene, reliability patterns | `references/audit/index.md` |

## Step 1: Choose the mode

Invocation arguments: `$ARGUMENTS`

If the line above is empty, or shows the literal text `$ARGUMENTS` because your agent does not substitute it, there are no command arguments. In that case read the arguments from whatever the user typed after the skill name, if anything.

Route on the first word of the arguments:

| First word | Mode |
| --- | --- |
| `security`, `sec`, `owasp`, `vuln`, `pentest` | Security |
| `threat-model`, `stride` | Security → Threat Modeling |
| `audit`, `cost`, `quota`, `perf`, `ops`, `bill` | Audit |
| `both`, `full`, `all` | Security, then Audit, as one combined report |

Any remaining words are the **focus**: area names (`auth`, `payments`, `storage`, `ai`…) or paths (`src/app/api`). Each playbook maps area names to its steps. With no focus, cover everything that applies to the stack.

### No arguments: always ask

When the skill is invoked bare (`/secure-me` with no text after it), **ask before doing anything else**. Don't infer the mode from the conversation, and don't start scanning. Ask both questions in one prompt. If your agent has a structured question tool (`AskUserQuestion` in Claude Code, or the equivalent in other agents), use it. Otherwise ask in plain text with the options numbered, then **stop and wait for the answer**.

**Question 1: "What should secure-me do?"**

1. **Security check**: find vulnerabilities an attacker could exploit. Covers leaked secrets, broken auth and access control (IDOR, RLS), injection, XSS/SSRF/CSRF, payment and business-logic flaws, AI/LLM, agent and MCP risks, supply-chain and CI/CD compromise, cloud, containers and known-vulnerable framework versions. Findings carry CWE/OWASP IDs, a severity, and a before/after fix.
2. **Audit**: find what will burn money, exhaust quotas or break under load. Covers serverless CPU and invocations, accidentally dynamic pages, missing caching, polling and timers, database egress and N+1 queries, storage and media bandwidth, log volume, LLM token spend, push/realtime storms, media-host policy (AUP) risk, missing timeouts, retries and spend caps. It is aware of platform limits on Vercel, Netlify, Cloudflare, AWS, Supabase, Firebase and others. Findings carry a cost/availability impact, a fix, and a way to verify it.
3. **Both**: security first, then audit, in one report.

**Question 2: "What should it cover?"**

1. **Whole codebase** (recommended for a first run)
2. **Current changes only**: the branch diff against the default branch, plus uncommitted work
3. **A specific area**: the user names paths or topics (e.g. `auth`, `checkout`, `src/app/api`)

### Natural-language triggers

When the skill was triggered by a request, not a bare command, route on clear intent. "Is this secure", "check for XSS" or "OWASP" go to Security. "Why is my Vercel bill high", "we hit the Supabase egress cap" or "is this production-ready for traffic" go to Audit. A broad "audit this app" is ambiguous, because "audit" means a security audit to many users. In that case ask Question 1.

## Step 2: Reconnaissance (shared)

Before reading any playbook detail, establish:

- **Stack:** languages, frameworks and **their installed versions** (from lockfiles, not `package.json` ranges), runtime versions.
- **Platform:** hosting, edge/CDN, database/BaaS, object storage, queues and cron, AI providers, from config files such as `vercel.json`, `netlify.toml`, `wrangler.toml`/`cloudflare.config.ts`, `serverless.yml`, `firebase.json`, `supabase/config.toml`, IaC and Dockerfiles.
- **Entry points:** routes, API handlers, server actions, webhooks, cron endpoints, workers, CLI and agent tools.
- **Trust boundaries and data sensitivity** (Security), or **traffic shape and metered resources** (Audit).

Then open the playbook for the chosen mode and follow it.

## Rules for both modes

- **Defensive only.** Explain root cause and impact at a conceptual level and give fixes. Never output working exploits, attack tooling, or step-by-step intrusion instructions.
- **Evidence over pattern-matching.** Report a file and line only after you've read it, and trace the source to the sink (or the request to the metered resource) before calling something a finding. Code that looks risky but is correctly handled is not a finding. A false positive costs the user trust.
- **Read references on demand.** Don't read them upfront. Open a reference when its step applies to this stack.
- **Skip what doesn't apply,** and say in one line which areas were skipped and why.
- **Report first, then fix.** Don't change code during the review. When the report is done, offer to apply fixes, and get confirmation before editing anything.
- **Time-sensitive facts expire.** CVE lists, quotas and prices in the references are dated. If you have web or advisory access (`npm audit`, `osv-scanner`, GitHub advisories, vendor pricing pages), confirm before stating a version is vulnerable or a quota is exact. If you don't, say the figure is as of the reference date.

## Report skeleton (both modes)

1. **Summary:** mode, scope, stack and platform detected, and the count of findings by severity. Put any Critical finding in the first lines.
2. **Findings,** ordered Critical → High → Medium → Low, using the per-finding format from the mode's playbook.
3. **Skipped areas,** one line each.
4. **Prioritized roadmap:** the fixes ranked by risk or cost removed per unit of effort.
5. **Offer next steps:** apply fixes; for Audit, write the applicable guardrails into the project's `AGENTS.md` / `CLAUDE.md`; for Security, run the other mode.

For **Both**, use one summary and two findings sections, Security and then Audit, merged into one roadmap.

## Proactive guardrails while writing code

These rules apply whenever you generate or change code, even when nobody has invoked the skill. Before writing code that touches auth, payments, database access, APIs, uploads, AI calls or user data, follow the security playbook's principles. Before writing data fetching, rendering, media handling, background work, polling or logging, follow the audit playbook's guardrails. Prevention is cheaper than detection. If you notice a Critical issue while doing unrelated work, flag it at the top of your response.

**Core principle (Security):** never trust the client. Every price, user ID, role, subscription status, feature flag and rate-limit counter must be enforced server-side.

**Core principle (Audit):** every request should cost what it must and nothing more. Static beats dynamic, cached beats uncached, event-driven beats polling, and bounded beats unbounded.
