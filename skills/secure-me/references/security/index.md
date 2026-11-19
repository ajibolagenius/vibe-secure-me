# Security Mode: Playbook

Find vulnerabilities in code that exists (Audit Process), or design risks in code that doesn't exist yet (Threat Modeling). Covers both AI-generated "vibe-coded" apps, where security basics get skipped, and enterprise architecture flaws.

## Baselines

**OWASP Top 10:2025.** Use these IDs; the 2021 numbering is stale.

| ID | Category |
| --- | --- |
| A01 | Broken Access Control (now includes SSRF) |
| A02 | Security Misconfiguration |
| A03 | Software Supply Chain Failures |
| A04 | Cryptographic Failures |
| A05 | Injection |
| A06 | Insecure Design |
| A07 | Authentication Failures |
| A08 | Software or Data Integrity Failures |
| A09 | Security Logging and Alerting Failures |
| A10 | Mishandling of Exceptional Conditions |

**OWASP Top 10 for Agentic Applications (2026, released Dec 2025).** Use these for agents, tool use and MCP.

| ID | Risk |
| --- | --- |
| ASI01 | Agent Goal Hijack |
| ASI02 | Tool Misuse and Exploitation |
| ASI03 | Identity and Privilege Abuse |
| ASI04 | Agentic Supply Chain Vulnerabilities |
| ASI05 | Unexpected Code Execution |
| ASI06 | Memory and Context Poisoning |
| ASI07 | Insecure Inter-Agent Communication |
| ASI08 | Cascading Failures |
| ASI09 | Human-Agent Trust Exploitation |
| ASI10 | Rogue Agents |

Also: OWASP API Security Top 10 (2023), OWASP Mobile Top 10 (2024) / MASVS, OWASP Top 10 CI/CD Security Risks, OWASP Top 10 for LLM Applications (2025), CWE/MITRE, NIST, and cloud provider guidance.

## Focus keywords

When the user passes a focus, run only the matching steps, plus step 22, which is cheap and catches critical, already-known issues.

| Focus word | Steps |
| --- | --- |
| `secrets`, `env` | 1 |
| `db`, `rls`, `firebase`, `supabase` | 2, 9 |
| `auth`, `session`, `jwt` | 3 |
| `abuse`, `rate-limit` | 4 |
| `payments`, `billing`, `logic` | 5, 17 |
| `mobile`, `deeplink` | 6 |
| `ai`, `llm`, `prompt` | 7, 20 |
| `agents`, `mcp`, `tools` | 20, 7 |
| `deploy`, `headers` | 8 |
| `injection`, `input` | 9 |
| `web`, `xss`, `csrf`, `cors`, `ssrf` | 10 |
| `api`, `graphql`, `grpc` | 11 |
| `uploads`, `files` | 12 |
| `cloud`, `iam`, `iac`, `terraform` | 13 |
| `deps`, `supply-chain`, `ci`, `actions`, `npm` | 14, 22 |
| `docker`, `k8s`, `containers` | 15 |
| `crypto`, `hashing` | 16 |
| `errors`, `logging` | 21 |
| `web3`, `contracts` | 18 |
| `native`, `memory` | 19 |
| a path | All applicable steps, limited to that path and what it calls |

## Audit Methodology

1. **Reconnaissance:** done in SKILL.md Step 2. Note the trust boundaries, auth model and data sensitivity.
2. **Known-vulnerable versions first (step 22).** Compare installed framework and runtime versions against `references/security/threat-intel.md`. It takes minutes and catches unauthenticated RCEs.
3. **Automated pattern scanning:** run, or simulate, SAST, dependency scanning (`npm audit`, `osv-scanner`, `pip-audit`), secret scanning (`gitleaks`, `trufflehog`) and IaC scanning (`checkov`, `tfsec`) when the tools are available. Tool output is a lead, not a finding.
4. **Manual review:** walk the steps below. Spend most of your time on what tools miss: broken access control (BOLA/IDOR), business logic, race conditions, fail-open error paths, agent tool scopes and attack chains.
5. **Validation:** confirm each finding by tracing source to sink. Drop anything you can't trace.
6. **Report:** use the format below.

## Threat Modeling Mode (STRIDE)

Use this mode when there is no code yet, or the question is about a design: a proposed architecture, a new feature's data flow, an RFC, a diagram. Findings are design risks, not located vulnerabilities, so never cite file or line references you haven't verified.

1. **Decompose.** List actors (human and machine), processes, data stores and data flows. State what each flow carries and where it ends.
2. **Draw trust boundaries.** Mark every crossing between principals of different privilege: client → server, tenant → tenant, service → service, user code → sandbox, agent → tool, agent → agent. A design with no stated boundaries is itself the finding.
3. **Classify assets.** Rank credentials, PII, money movement, compute, model access and signing keys, and note which boundary protects each.
4. **Apply STRIDE to each element.** "No plausible threat" is a valid answer; don't invent one.
5. **Rate and propose controls.** Use Likelihood × Impact. Propose a control for each accepted risk, and list the risks the design accepts on purpose.

| Threat | Violates | Ask | Typical controls | Related steps |
| --- | --- | --- | --- | --- |
| **S**poofing | Authentication | Can an actor claim another's identity? | MFA/passkeys, mTLS, signed short-lived tokens, attestation | 3, 6, 20 |
| **T**ampering | Integrity | Can data or code be modified in transit, at rest, or in the pipeline? | Signatures, TLS 1.3, immutable builds, webhook verification, pinned actions | 5, 14, 16, 22 |
| **R**epudiation | Non-repudiation | Can an actor deny an action with no evidence? | Append-only audit logs, signed receipts | 21 |
| **I**nformation disclosure | Confidentiality | Can data leak across a boundary, through errors, or via inference? | Least privilege, RLS/tenant scoping, output filtering, scrubbed errors | 1, 2, 9, 21 |
| **D**enial of service | Availability | Can an actor exhaust compute, storage, quota or budget? | Rate limits, quotas, timeouts, spend caps (see also Audit mode) | 4, 5 |
| **E**levation of privilege | Authorization | Can an actor gain capability it wasn't granted? | Deny-by-default, per-object checks, sandboxing, human approval on destructive actions | 3, 7, 13, 15, 20 |

The three threats most often left out of design reviews: **T** in the build pipeline, **I** across tenant boundaries, and **E** wherever an agent or LLM can invoke tools.

**Output:** a table of `element | threat | scenario | severity | proposed control`, then the accepted-risk list, then the highest-leverage design changes ranked by risk reduced.

## Audit Process

Skip steps that don't apply to the stack.

1. **Secrets & environment variables.** Hardcoded keys and tokens. Secrets exposed through client-side env prefixes (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`, `PUBLIC_`). Secrets in git history. `.env` and `.dev.vars` missing from `.gitignore`. Secrets in committed agent config (`.mcp.json`, `.cursor/mcp.json`).
2. **Database access control.** Supabase RLS, Firebase Security Rules, Convex/Appwrite guards. This is the #1 source of critical findings in vibe-coded apps: 2026 scans found thousands of publicly readable Supabase and Firebase backends.
3. **Authentication & authorization.** JWT handling (reject `alg:none`, algorithm confusion), auth enforced only in middleware (bypassable; see threat-intel), Server Action and server function protection, password reset, sessions, and per-object authorization (BOLA).
4. **Rate limiting & abuse prevention.** Auth endpoints, OTP/SMS, AI calls and expensive operations. Counters must not be client-tamperable.
5. **Payments & business logic.** Client-side prices, unverified webhooks, discount stacking, workflow skipping, and DDo$ (Distributed Denial of Dollars).
6. **Mobile & deep links.** Keychain/Keystore token storage, API keys in bundles, intent redirection, deep-link hijacking, binary protections.
7. **AI / LLM integration (LLM Top 10).** Exposed keys, missing usage caps, direct and indirect prompt injection, improper output handling, system-prompt leakage.
8. **Deployment configuration.** Production settings, security headers (CSP, HSTS), exposed source maps or `.git`, preview environments using production secrets, dev servers or dev-only endpoints exposed to the network.
9. **Data access & input validation.** SQL/NoSQL injection, ORM raw queries, schema validation at trust boundaries.
10. **Web vulnerabilities.** XSS, CSRF, SSRF (cloud metadata), CORS wildcard with credentials, request smuggling, clickjacking.
11. **API, GraphQL & gRPC.** BOLA/IDOR, mass assignment, GraphQL introspection, batching and depth DoS, gRPC mTLS.
12. **File uploads & deserialization.** MIME checks, size caps on the real body, storage isolation, path traversal, Pickle and native deserialization, SVG/image processing of untrusted files.
13. **Cloud & infrastructure.** Public buckets, IAM `*`, IMDSv1, IaC secrets.
14. **CI/CD & supply chain (A03, CI/CD Top 10).** `pull_request_target`, cache poisoning, OIDC/trusted-publishing scope, script injection, unpinned actions, install-time scripts, worm indicators, slopsquatting, and AI agents in CI.
15. **Containers & Kubernetes.** Non-root users, minimal images, RBAC, privileged pods, exposed dashboards.
16. **Cryptography.** Argon2id/bcrypt, CSPRNG tokens, AES-GCM, TLS 1.2+ (prefer 1.3).
17. **Advanced & emerging threats.** Race conditions (TOCTOU), prototype pollution, SSTI, cache poisoning, subdomain takeover.
18. **Smart contracts & Web3** (if applicable). Reentrancy, oracle manipulation, rounding.
19. **Low-level memory safety** (if applicable). UAF, overflows, leaks in native code.
20. **Agentic systems & MCP (Agentic Top 10).** Agent tool scopes, MCP server and client trust, tool-poisoning and indirect injection paths, confirmation on destructive actions, agent identity and credentials, memory poisoning, and repo files that steer coding agents.
21. **Error handling, fail-open & logging (A10, A09).** Auth and authorization paths that fail open on exceptions, leaked stack traces, missing audit logs and alerts, secrets or PII in logs.
22. **Known-vulnerable components.** Installed versions of frameworks, runtimes and high-profile packages compared against `references/security/threat-intel.md` and live advisories.

## Reference files

| Step | Read |
| --- | --- |
| 1 | `references/security/secrets-and-env.md` |
| 2 | `references/security/database-security.md` |
| 3 | `references/security/authentication.md` |
| 4 | `references/security/rate-limiting.md` |
| 5 | `references/security/payments.md` |
| 6 | `references/security/mobile.md`, `references/security/mobile-security-reference.md` |
| 7 | `references/security/ai-integration.md`, `references/security/ai-and-advanced-reference.md` |
| 8 | `references/security/deployment.md` |
| 9 | `references/security/data-access.md` |
| 10 | `references/security/web-vulnerabilities.md`, `references/security/web-security-reference.md` |
| 11 | `references/security/api-security.md`, `references/security/web-security-reference.md` |
| 12 | `references/security/file-uploads.md` |
| 13 | `references/security/cloud-infrastructure.md`, `references/security/cloud-security-reference.md` |
| 14 | `references/security/cicd-supply-chain.md` |
| 15 | `references/security/container-security.md` |
| 16 | `references/security/cryptography.md` |
| 17 | `references/security/advanced-threats.md` |
| 18–19 | `references/security/ai-and-advanced-reference.md` |
| 20 | `references/security/agentic-and-mcp.md` |
| 21 | `references/security/error-handling-and-logging.md` |
| 22 | `references/security/threat-intel.md` |

Files named `*-reference.md` are OWASP/CWE-mapped root-cause summaries. The others carry stack-specific code. Read both when an area is central to the review.

## Severity

Rate on **Likelihood × Impact**, CVSS-style.

- **Exploitability:** attack vector, complexity, privileges required, user interaction.
- **Impact:** confidentiality, integrity, availability, blast radius, and chaining potential (e.g. SSRF → metadata credentials → account takeover).
- **Context:** data sensitivity, internet exposure, compensating controls.

| Rating | Typical shape |
| --- | --- |
| Critical | Unauthenticated, network-reachable, and leads to data breach, RCE, account takeover or money movement. |
| High | Needs low privilege or one precondition, with serious impact. |
| Medium | Needs unusual preconditions, or the impact is limited. |
| Low / Info | Defense-in-depth gaps and hardening. |

## Per-finding format

1. **Title and classification:** CWE ID, OWASP ID (2025), and ASI ID where relevant.
2. **Location:** file and line(s), endpoint or resource.
3. **Severity:** the rating plus a one-line justification.
4. **Root cause:** name the flaw and explain why the code allows it.
5. **Attack scenario:** what an attacker could achieve, described conceptually.
6. **Remediation:** before/after code or configuration. For credential exposure, always include **rotate**.

### Example

#### Critical

**`lib/supabase.ts:3`: Supabase `service_role` key exposed in client bundle (CWE-798; OWASP A02:2025, A07:2025)**

- **Severity:** Critical: anyone can extract it from the JS bundle without authenticating.
- **Root cause and impact:** the `service_role` key bypasses all Row-Level Security, and a `NEXT_PUBLIC_` variable inlines it into browser code. Anyone can read, modify or delete every row.
- **Remediation:** rotate the key now. Use the anon key client-side and keep `service_role` server-only.

```typescript
// Before
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!)
// After
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
```

#### High

**`app/api/checkout/route.ts:15`: Price taken from client request body (CWE-602; OWASP A06:2025)**

- **Severity:** High: any authenticated user can set an arbitrary price.
- **Root cause and impact:** the handler trusts `req.body.price`, so an attacker can buy anything for $0.01.
- **Remediation:** look up the price server-side from the product ID.

```typescript
// Before
line_items: [{ price_data: { unit_amount: req.body.price } }]
// After
const product = await db.products.findUnique({ where: { id: req.body.productId } })
line_items: [{ price: product.stripePriceId }]
```
