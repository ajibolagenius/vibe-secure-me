---
name: secure-me
description: Comprehensive, framework-agnostic security auditor. Audits codebases for common vulnerabilities introduced by AI coding assistants in "vibe-coded" applications, as well as complex enterprise attack vectors across web, API, mobile, cloud, low-level architecture, and agentic AI platforms. Trigger this skill whenever the user asks to review, audit, harden, threat-model, or "check the security" of any code, API, repository, mobile app, container, IaC, or cloud configuration. Also trigger on mentions of OWASP, CWE, penetration test prep, secure code review, vulnerability assessment, secrets scanning, IAM review, or compliance hardening.
license: MIT
metadata:
  author: Ajibola Akelebe - Open Source Community
  version: "3.2.0"
  homepage: https://github.com/ajibolagenius/vibe-secure-me
---

# Security Audit Skill (secure-me)

Audit code for security vulnerabilities commonly introduced by AI code generation (prevalent in "vibe-coded" apps built rapidly with AI assistance where security fundamentals get skipped), as well as complex architectural flaws in enterprise systems.

This skill is a complete, framework-agnostic security auditor mapping to current authoritative baselines including **OWASP Top 10:2025**, **OWASP API Security Top 10 (2023)**, **OWASP Mobile Top 10 (2024) / MASVS**, **OWASP Top 10 CI/CD Security Risks**, **OWASP Top 10 for LLM Applications (2025)**, CWE/MITRE, NIST, and cloud provider guidance.

Use it defensively. It identifies vulnerabilities, explains root causes, shows how they would be found/exploited at a conceptual level, and provides concrete secure-code remediation. **Never output working exploits, attack tooling, or step-by-step intrusion instructions.**

## The Core Principle

Never trust the client. Every price, user ID, role, subscription status, feature flag, and rate limit counter must be validated or enforced server-side. If it exists only in the browser, mobile bundle, or request body, an attacker controls it.

## Audit Methodology (Workflow)

Use this workflow when reviewing code that exists. If the target is a design, architecture, or proposal with no implementation to read, use **Threat Modeling Mode** below instead.

1. **Reconnaissance & Scoping:** Identify the stack, languages, frameworks, entry points, trust boundaries, data sensitivity, auth model, third-party dependencies, and deployment targets.
2. **Automated Pattern Scanning Simulation:** Run/simulate SAST, dependency/SCA, secret scanning, and IaC scanning.
3. **Manual Review Checklist:** Walk the relevant audit process steps below. Focus on issues tools miss: broken access control (BOLA/IDOR), business logic flaws, race conditions, design flaws, and complex attack chains.
4. **Validation & Triage:** Confirm true positives via code tracing (source → sink).
5. **Reporting:** Produce a structured, risk-rated report.

## Threat Modeling Mode (STRIDE)

The Audit Process below reviews code that exists. Use this mode instead when there is no code to read yet, or when the question is about a design rather than an implementation — a proposed architecture, a new feature's data flow, an RFC, a diagram, or a request to "threat-model" something. Findings here are design risks, not located vulnerabilities, so do not report file/line references you have not verified.

**Procedure:**

1. **Decompose.** List the actors (human and machine), processes, data stores, and data flows. State what each flow carries and where it terminates.
2. **Draw trust boundaries.** Mark every point where data or control crosses between principals of different privilege: client → server, tenant → tenant, service → service, user code → sandbox, agent → tool. Threats concentrate here; a design with no articulated boundaries is the finding.
3. **Classify assets.** Rank what an attacker wants — credentials, PII, money movement, compute, model access — and note which boundaries protect each.
4. **Apply STRIDE per element.** Walk the table below against each process, store, and flow. An element with no plausible threat in a category is a legitimate answer; say so rather than inventing one.
5. **Rate and propose controls.** Use the same Likelihood × Impact model as the Audit Process. Propose a control per accepted risk, and name the risks the design deliberately accepts.

**STRIDE categories:**

| Threat | Violates | Ask | Typical controls | Related audit step |
| --- | --- | --- | --- | --- |
| **S**poofing | Authentication | Can an actor claim another's identity? | MFA, mTLS, signed tokens, short-lived credentials, attestation | 3, 6 |
| **T**ampering | Integrity | Can data or code be modified in transit, at rest, or in the pipeline? | Signatures, TLS 1.3, integrity checks, immutable builds, webhook verification | 5, 14, 16 |
| **R**epudiation | Non-repudiation | Can an actor deny an action with no evidence? | Append-only audit logs, signed receipts, tamper-evident storage | 8 |
| **I**nformation disclosure | Confidentiality | Can data leak across a boundary, through errors, or via inference? | Least privilege, encryption, RLS/tenant scoping, output filtering, scrubbed errors | 1, 2, 9 |
| **D**enial of service | Availability | Can an actor exhaust compute, storage, quota, or budget? | Rate limits, quotas, timeouts, backpressure, spend caps | 4, 5 |
| **E**levation of privilege | Authorization | Can an actor gain capability they were not granted? | Deny-by-default authorization, per-object checks, sandboxing, human-in-the-loop on destructive actions | 3, 7, 13, 15 |

Pay particular attention to **T** in the build pipeline, **I** across tenant boundaries, and **E** wherever an agent or LLM can invoke tools — these are the three most commonly omitted from design reviews.

**Output:** a table of `element | threat category | scenario | severity | proposed control`, then the accepted-risk list, then the highest-leverage design changes ranked by risk reduced. When the design is later implemented, hand off to the Audit Process to verify the controls exist in code.

## Audit Process

Examine the codebase systematically. Skip steps that aren't relevant to the current technology stack.

1. **Secrets & Environment Variables** — Scan for hardcoded API keys, tokens, or credentials. Check for secrets exposed via client-side env var prefixes (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`). Verify `.env` is in `.gitignore`.
2. **Database Access Control** — Check Supabase RLS policies, Firebase Security Rules, or Convex auth guards. This is the #1 source of critical vulnerabilities in vibe-coded apps.
3. **Authentication & Authorization** — Validate JWT handling (reject `alg:none`, algorithm confusion), middleware auth, Server Action protection, password reset flows, and session management. Enforce server-side authorization on every object (BOLA prevention) and function.
4. **Rate Limiting & Abuse Prevention** — Ensure auth endpoints, AI calls, and expensive operations have rate limits (Unrestricted Resource Consumption). Verify rate limit counters can't be tampered with.
5. **Payment Security & Business Logic** — Check for client-side price manipulation, webhook signature verification, discount stacking, workflow circumvention, and DDo$ (Distributed Denial of Dollars).
6. **Mobile Security & Deep Links** — Verify secure token storage (Keychain/Keystore), API key protection, intent redirection, deep-link/URL-scheme hijacking, and insufficient binary protections.
7. **AI / LLM Integration (OWASP LLM Top 10)** — Check for exposed AI API keys, missing usage caps, Direct and Indirect Prompt Injection vectors, Excessive Agency in agentic workflows, and unsafe output rendering (Improper Output Handling).
8. **Deployment Configuration** — Verify production settings, security headers (CSP, HSTS), source map exposure, and environment separation.
9. **Data Access & Input Validation** — Check for SQL injection, NoSQL operator injection (`$ne`, `$where`), ORM misuse, and missing input validation.
10. **Web Vulnerabilities (OWASP Top 10 2025)** — Check for XSS (DOM/Stored/Reflected), CSRF, SSRF (metadata service exploitation), CORS misconfigurations (wildcard + credentials), HTTP Request Smuggling, and Clickjacking.
11. **API, GraphQL & gRPC Security** — Prevent REST IDOR/BOLA, GraphQL introspection/batching attacks, deep nested query DoS, gRPC mTLS failures, and HPACK desynchronization.
12. **File Upload Security & Deserialization** — Verify MIME type checks, limit sizes, isolate uploaded files, and prevent insecure deserialization (Pickle, native Java).
13. **Cloud & Infrastructure Security** — Secure S3 buckets (Block Public Access), enforce IAM Least Privilege (no `*`), prevent IMDSv1 SSRF credential theft, and manage IaC (Terraform) secrets.
14. **CI/CD & Supply Chain (OWASP CI/CD Top 10)** — Secure GitHub Actions workflows, prevent Poisoned Pipeline Execution (PPE), avoid untrusted fork PR triggers, and manage NPM dependency risks (Dependency Confusion).
15. **Container & Kubernetes Security** — Ensure non-root users, minimal base images, secure port mapping, least-privilege RBAC, and prevent exposed dashboards or privileged pods.
16. **Cryptography Best Practices** — Verify secure password hashing (Argon2/bcrypt), CSPRNG for random tokens, and proper encryption modes (TLS 1.3, AES-GCM).
17. **Advanced & Emerging Threats** — Catch overlooked flaws like Race Conditions (TOCTOU), Prototype Pollution to RCE, Server-Side Template Injection (SSTI), Web Cache Poisoning, and Subdomain Takeover.
18. **Smart Contracts & Web3** — (If applicable) Audit for Reentrancy (CEI pattern), Flash Loan price oracle manipulation, and arithmetic rounding errors.
19. **Low-Level Memory Safety** — (If applicable) Detect Memory Leaks, Use-After-Free (UAF), and Buffer Overflows in C/C++ native addons or backend binaries.

## Reference Files

Do not read these upfront. When an audit step applies to the codebase under review, read the matching file(s) before reporting on that area — they carry the detailed root causes, attack scenarios, and before/after remediation code that this file only summarizes.

| Audit step | Read |
| --- | --- |
| 1. Secrets & env vars | `references/secrets-and-env.md` |
| 2. Database access control | `references/database-security.md` |
| 3. Authentication & authorization | `references/authentication.md` |
| 4. Rate limiting & abuse | `references/rate-limiting.md` |
| 5. Payments & business logic | `references/payments.md` |
| 6. Mobile & deep links | `references/mobile.md`, `references/mobile-security-reference.md` |
| 7. AI / LLM integration | `references/ai-integration.md`, `references/ai-and-advanced-reference.md` |
| 8. Deployment configuration | `references/deployment.md` |
| 9. Data access & input validation | `references/data-access.md` |
| 10. Web vulnerabilities | `references/web-vulnerabilities.md`, `references/web-security-reference.md` |
| 11. API, GraphQL & gRPC | `references/api-security.md`, `references/web-security-reference.md` |
| 12. File uploads & deserialization | `references/file-uploads.md` |
| 13. Cloud & infrastructure | `references/cloud-infrastructure.md`, `references/cloud-security-reference.md` |
| 14. CI/CD & supply chain | `references/cicd-supply-chain.md` |
| 15. Containers & Kubernetes | `references/container-security.md` |
| 16. Cryptography | `references/cryptography.md` |
| 17. Advanced & emerging threats | `references/advanced-threats.md` |
| 18–19. Smart contracts, memory safety | `references/ai-and-advanced-reference.md` |

Files named `*-reference.md` are the OWASP/CWE-mapped root-cause summaries; the others carry stack-specific code examples. Read both when an area is central to the audit.

## Severity / Risk Rating Guidance

Use a CVSS-style mental model of **Likelihood × Impact**.
- **Exploitability:** attack vector (network/adjacent/local), complexity, privileges required, user interaction.
- **Impact:** confidentiality, integrity, availability; blast radius; chaining potential (e.g., SSRF → cloud metadata → account takeover).
- **Context multipliers:** data sensitivity, exposure (internet-facing vs internal), compensating controls.

Assign Critical / High / Medium / Low / Info.

## Output Format

Organize findings by severity: **Critical** → **High** → **Medium** → **Low**.

For each issue:
1. **Title and Classification:** Include CWE ID and OWASP category.
2. **Location:** State the file, relevant line(s), endpoint, or resource.
3. **Severity:** Rating + short CVSS-style justification.
4. **Vulnerability & Root Cause:** Name it and explain the architectural/code reason.
5. **Attack Scenario (Impact):** Explain what an attacker could do (concrete, defensive explanation).
6. **Remediation:** Show a before/after code fix or secure configuration.

Skip areas with no issues. End with a prioritized summary/remediation roadmap.

### Example Output

#### Critical

**`lib/supabase.ts:3` — Supabase `service_role` key exposed in client bundle (CWE-798; OWASP A02:2025)**

- **Severity:** Critical (High Likelihood x High Impact).
- **Root Cause & Impact:** The `service_role` key bypasses all Row-Level Security. It is exposed via a client-side environment variable. Anyone can extract it from the browser bundle and read, modify, or delete every row in your database.
- **Remediation:** Rotate the key immediately and move it to server-side only. Use the anon key client-side.

```typescript
// Before
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!)

// After
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
```

#### High

**`app/api/checkout/route.ts:15` — Price taken from client request body (CWE-602; OWASP A06:2025 Insecure Design)**

- **Severity:** High (High Likelihood x Medium Impact).
- **Root Cause & Impact:** The application trusts the client-provided `req.body.price`. An attacker can set any price (including $0.01) by modifying the request intercepting the traffic. Prices must be looked up server-side.
- **Remediation:** Look up the price server-side using the product ID.

```typescript
// Before
const session = await stripe.checkout.sessions.create({
  line_items: [{ price_data: { unit_amount: req.body.price } }]
})

// After
const product = await db.products.findUnique({ where: { id: req.body.productId } })
const session = await stripe.checkout.sessions.create({
  line_items: [{ price: product.stripePriceId }]
})
```

## Proactive Generation Guardrails

When generating new code, these rules apply proactively. Before writing code that touches auth, payments, database access, APIs, AI integrations, or user data, consult these security principles to avoid introducing the vulnerability in the first place. Prevention is better than detection. If you find a critical issue, flag it immediately at the top of your response.
