# Security Audit Skill — Generic, Framework-Agnostic (SKILL.md + Platform References)

## TL;DR
- This document is a complete, framework-agnostic security-audit skill for an agentic AI coding assistant, structured as a Claude Agent Skill (`SKILL.md` + three reference files: web, mobile, cloud), covering both common and edge-case vulnerabilities with root cause, exploit pattern (conceptual/defensive), detection, remediation code, and CVSS-style rating guidance for each.
- It maps to current authoritative baselines: OWASP Top 10:2025 (released November 6, 2025 at the OWASP Global AppSec Conference in Washington, D.C. — the first update since 2021 — with Broken Access Control still #1 for the fourth consecutive edition and two new categories: Software Supply Chain Failures A03 and Mishandling of Exceptional Conditions A10), OWASP API Security Top 10 (2023), OWASP Mobile Top 10 (2024) / MASVS, OWASP Top 10 CI/CD Security Risks, CWE/MITRE, NIST, and cloud provider guidance.
- Use it defensively: the skill's workflow is scope → automated pattern scan → manual review checklist → risk-rated reporting, and every entry is remediation-oriented (no working exploit code).

---

# FILE 1 — SKILL.md (Overview / Orchestration)

```yaml
---
name: security-audit
description: >
  Comprehensive, framework-agnostic security auditor for web, mobile, and cloud
  codebases and infrastructure. Use this skill whenever the user asks to review,
  audit, harden, threat-model, or "check the security" of any code, API,
  repository, mobile app, container, IaC, or cloud configuration — even if they
  do not use the word "security." Also trigger on mentions of OWASP, CWE,
  penetration test prep, secure code review, vulnerability assessment, secrets
  scanning, IAM review, or compliance hardening. Produces a risk-rated,
  remediation-focused report. Defensive use only.
---
```

## Purpose and scope
This skill turns a general coding agent into a defensive security auditor. It identifies vulnerabilities, explains root causes, shows how they would be found/exploited at a conceptual level (to guide detection), and provides concrete secure-code remediation. It never outputs working exploits, attack tooling, or step-by-step intrusion instructions. If a request is clearly offensive (attacking systems the user does not own), refuse and redirect to defensive alternatives.

The skill covers three platform reference files:
- `references/web-security-reference.md` — web apps and APIs.
- `references/mobile-security-reference.md` — iOS/Android/React Native.
- `references/cloud-security-reference.md` — AWS/GCP/Azure, containers, K8s, serverless, IaC, CI/CD.

## When to invoke
Trigger on: "audit this repo," "is this secure," "review my auth," "check my S3/IAM," "harden my Dockerfile/K8s," "review my API," "scan for secrets," "threat model this feature," pre-release security review, or bug-bounty-report triage (defensive remediation only).

## Audit methodology (workflow)
1. **Reconnaissance & scoping.** Identify the stack, languages, frameworks, entry points, trust boundaries, data sensitivity, auth model, third-party dependencies, and deployment targets. Build an asset/attack-surface inventory. Ask which platform reference(s) apply. Establish rules of engagement (defensive, in-scope assets only).
2. **Automated pattern scanning.** Run/simulate SAST, dependency/SCA, secret scanning, and IaC scanning. Recommended open tools: Semgrep (SAST), OWASP Dependency-Check / Dependabot / Snyk (SCA), Trufflehog / detect-secrets / Gitleaks (secrets), Checkov or Trivy (IaC/containers), MobSF (mobile). Map findings to CWE and OWASP categories.
3. **Manual review checklist.** Walk each platform reference's checklist. Focus on issues tools miss: broken access control/business logic, authZ at object level (BOLA/IDOR), authentication flows, race conditions, and design flaws.
4. **Validation & triage.** Confirm true positives via code tracing (source→sink). Rate each finding.
5. **Reporting.** Produce a structured report.

## Severity / risk rating guidance
Use a CVSS-style mental model of **Likelihood × Impact**. OWASP Top 10:2025 derived per-CWE average Exploit and Impact scores from CVSS (v2/v3) mapped to 175,000+ CVE records (up from ~125,000 in 2021) across 643 unique CWEs; per the OWASP Top 10:2025 Introduction, CVSS v4 was not used this cycle because its fundamentally changed scoring model no longer cleanly separates the Exploit and Impact sub-scores. For each finding, reason about:
- **Exploitability:** attack vector (network/adjacent/local), complexity, privileges required, user interaction.
- **Impact:** confidentiality, integrity, availability; blast radius; whether it chains to escalation (e.g., SSRF → cloud metadata → account takeover).
- **Context multipliers:** data sensitivity, exposure (internet-facing vs internal), compensating controls, exploited-in-the-wild status.
Assign Critical / High / Medium / Low / Info. Prefer CVSS v3.1 base vectors when a numeric score is needed.

## Report format (output template)
For each finding:
- **Title** and unique ID
- **Classification:** CWE ID + OWASP category (Top 10 / API / Mobile / CI-CD)
- **Location:** file/line, endpoint, resource, or config key
- **Severity:** rating + short CVSS-style justification (likelihood × impact)
- **Root cause:** the architectural/code reason
- **Evidence / detection:** the pattern observed
- **Impact / attack scenario:** conceptual, defensive
- **Remediation:** concrete secure-code/config fix with example
- **References:** OWASP/CWE/NIST/vendor docs
End with an executive summary (counts by severity), a prioritized remediation roadmap, and residual-risk notes.

## Guardrails
- Defensive only. No working exploit code, no malware, no live-attack tooling instructions.
- Never exfiltrate secrets found during audits; redact them in reports.
- Distinguish confirmed issues from theoretical ones. Avoid false-positive inflation.
- Treat untrusted skills/inputs cautiously (supply-chain hygiene applies to the auditor too).

---

# FILE 2 — references/web-security-reference.md

Baseline: **OWASP Top 10:2025** — A01 Broken Access Control (SSRF now folded in), A02 Security Misconfiguration, A03 Software Supply Chain Failures, A04 Cryptographic Failures, A05 Injection, A06 Insecure Design, A07 Authentication Failures, A08 Software or Data Integrity Failures, A09 Security Logging & Alerting Failures, A10 Mishandling of Exceptional Conditions. Plus **OWASP API Security Top 10 (2023)**.

## 1. Broken Access Control / IDOR (CWE-284, CWE-639; OWASP A01:2025; API1/API5:2023)
- **Root cause:** Authorization decisions made on the client, or object/function access enforced inconsistently server-side; trusting user-supplied identifiers without verifying ownership. Broken Access Control remains OWASP's #1 risk for the fourth consecutive edition; per OWASP A01:2025, 100% of applications tested were found to have some form of broken access control (3.73% of apps contain at least one related CWE).
- **Attack scenario (conceptual):** Changing an object identifier in a request (e.g., `/api/users/1234` → `1235`) returns another user's data — Broken Object Level Authorization (BOLA). Per Salt Security's analysis of the OWASP API Security Top 10 2023, "BOLA is represented in about 40% of all API attacks and is the most common API security threat." Function-level variants (BFLA) let a normal user reach admin operations.
- **Detection:** Look for routes that read IDs from the request and query data without an ownership/tenant check; authZ only at gateway not in resolvers/handlers; missing role checks on admin routes. Two-account test: create as user A, access as user B.
- **Remediation:** Enforce deny-by-default, server-side authorization on every object and function. Centralize entitlement checks. Use non-guessable IDs (UUIDs) as defense-in-depth (not a substitute for checks). Example (Node/Express):
```js
// Enforce ownership server-side on every object access
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order || order.userId !== req.user.id) return res.sendStatus(404); // don't leak existence
  res.json(order);
});
```
- **Severity:** Typically High–Critical (direct data exposure / privilege escalation).

## 2. SSRF (CWE-918; OWASP A01:2025 — folded into Broken Access Control; API7:2023)
- **Root cause:** Server fetches a user-supplied URL without validation, allowing requests to internal services or cloud metadata endpoints.
- **Attack scenario:** Attacker supplies a URL pointing at `169.254.169.254` (cloud metadata) or internal services; server proxies the request. In cloud, this can yield IAM credentials (see cloud reference, IMDS).
- **Detection:** Endpoints that fetch remote resources (`/proxy?url=`, webhooks, URL preview, PDF/image fetchers, SSO metadata fetch). Look for user input flowing into HTTP clients without allowlisting.
- **Remediation:** Allowlist destination hosts/protocols; block private/link-local ranges (RFC1918, 169.254.0.0/16, localhost); resolve DNS and re-validate the resolved IP; disallow redirects to private ranges; use `https` only. Combine with network egress controls and IMDSv2. Example:
```python
import ipaddress, socket
from urllib.parse import urlparse
ALLOWED = {"api.partner.com"}
def safe_fetch_target(url):
    u = urlparse(url)
    if u.scheme != "https" or u.hostname not in ALLOWED:
        raise ValueError("blocked")
    ip = ipaddress.ip_address(socket.gethostbyname(u.hostname))
    if ip.is_private or ip.is_loopback or ip.is_link_local:
        raise ValueError("blocked internal")
    return url
```
- **Severity:** High–Critical (esp. in cloud with reachable metadata).

## 3. SQL Injection (CWE-89; OWASP A05:2025)
- **Root cause:** Untrusted input concatenated into SQL.
- **Detection:** String-built queries; ORMs used with raw fragments; dynamic `ORDER BY`/table names from input.
- **Remediation:** Parameterized queries / prepared statements exclusively; allowlist for identifiers; least-privilege DB accounts. Example:
```js
// GOOD: parameterized
db.query('SELECT * FROM users WHERE email = $1', [email]);
```
- **Severity:** High–Critical.

## 4. NoSQL Injection (CWE-943; OWASP A05:2025) — relevant to MongoDB stacks
- **Root cause:** User input parsed into query objects allows operator injection (`$ne`, `$gt`, `$regex`, `$where`); body/query parsers auto-convert `password[$ne]=x` into objects. `$where` executes server-side JavaScript.
- **Attack scenario:** `{"username":"admin","password":{"$ne":null}}` bypasses auth; `$where` enables JS execution/DoS.
- **Detection:** User input merged directly into query objects; use of `$where`, `mapReduce`, `$accumulator`; decoding request bodies into generic maps.
- **Remediation:** Enforce types (coerce to `String`); reject keys starting with `$`; use schema validation (Mongoose strict schemas, Zod/Joi/Pydantic); disable server-side JS (`javascriptEnabled: false`); wrap values in `$eq`. Example:
```js
const username = String(req.body.username);
const password = String(req.body.password);
const user = await User.findOne({ username, password }); // types enforced
```
- **Severity:** High (auth bypass, data exposure, DoS).

## 5. Command Injection (CWE-78; OWASP A05:2025)
- **Root cause:** User input passed to a shell.
- **Remediation:** Avoid shells; use array-argument APIs (`execFile`, `subprocess.run([...], shell=False)`); allowlist inputs. Example:
```python
subprocess.run(["convert", user_file, "out.png"], shell=False, check=True)
```
- **Severity:** Critical (RCE).

## 6. Server-Side Template Injection (CWE-1336/CWE-94; OWASP A05:2025)
- **Root cause:** User input embedded into server-side templates (Jinja2, Twig, Freemarker, Velocity, Mako), evaluated as template code.
- **Attack scenario:** Injected template expressions (e.g., math like `{{7*7}}` rendering `49`) confirm evaluation; can escalate to RCE.
- **Detection:** Templates constructed from user input; polyglot fuzz `${{<%[%'"}}%\` producing errors/evaluation.
- **Remediation:** Never build templates from user input — pass data as bound variables to static templates; use logic-less/sandboxed templates; sanitize. Example:
```python
# GOOD: data as context, template is static
render_template("hello.html", name=user_name)
```
- **Severity:** High–Critical.

## 7. XXE (CWE-611; OWASP A02/A05:2025)
- **Root cause:** XML parser resolves external entities.
- **Remediation:** Disable DTDs/external entities in the parser; prefer JSON. Example (Java): `factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);`
- **Severity:** High (file read, SSRF, DoS).

## 8. Cross-Site Scripting — reflected/stored/DOM (CWE-79; OWASP A05:2025)
- **Root cause:** Untrusted data rendered into HTML/JS without contextual encoding; DOM sinks (`innerHTML`, `eval`).
- **Remediation:** Context-aware output encoding; framework auto-escaping (React escapes by default — avoid `dangerouslySetInnerHTML`); sanitize rich HTML with DOMPurify; strong Content-Security-Policy; use `textContent` not `innerHTML`. Example:
```js
element.textContent = userInput;              // safe
node.innerHTML = DOMPurify.sanitize(userHtml); // if HTML needed
```
- **Severity:** Medium–High (High if stored/admin context).

## 9. CSRF (CWE-352; OWASP A01:2025)
- **Root cause:** State-changing requests authenticated solely by ambient cookies.
- **Remediation:** SameSite=Lax/Strict cookies; anti-CSRF tokens (synchronizer/double-submit); require custom headers for JSON APIs; re-auth for sensitive actions. Example: set `SameSite=Strict; Secure; HttpOnly` and validate a per-session CSRF token on unsafe methods.
- **Severity:** Medium–High.

## 10. CORS Misconfiguration (CWE-942; OWASP A02:2025)
- **Root cause:** Reflecting arbitrary `Origin`, allowing `null`, or trusting all subdomains, combined with `Access-Control-Allow-Credentials: true`.
- **Attack scenario:** Reflected origin + credentials lets an attacker site read authenticated responses. Trusting `*.example.com` is exploitable via subdomain takeover/XSS.
- **Detection:** Send varied `Origin` values; check if reflected and whether credentials are allowed; check for `null` acceptance and wildcard-subdomain trust.
- **Remediation:** Strict allowlist of exact origins; never reflect arbitrary origins; never combine `*`/reflected origin with credentials; avoid `null`; prefer header-based auth to reduce cookie exposure.
- **Severity:** Medium–High (High with credentials + sensitive data).

## 11. JWT / session vulnerabilities (CWE-347, CWE-384; OWASP A07:2025)
- **Root cause:** Trusting the token's `alg` header; accepting `alg:none`; algorithm confusion (RS256→HS256 using public key as HMAC secret); weak secrets; missing `iss`/`aud`/`exp` validation; not rotating session IDs after login; session fixation.
- **Attack scenario:** `alg:none` strips signatures; algorithm confusion forges tokens with the public key; missing `aud` check enables cross-tenant token reuse.
- **Detection:** Verifier keyed off header `alg`; no fixed allowlist; missing claim checks; long-lived tokens; tokens in URLs/localStorage.
- **Remediation:** Pin a fixed algorithm server-side; reject `none`; validate `iss`, `aud`, `exp`, `nbf`; strong ≥256-bit secrets in a KMS/secret manager; short access-token TTL + rotation; rotate session ID on login; server-side revocation. Example (Node `jsonwebtoken`):
```js
jwt.verify(token, publicKey, { algorithms: ['RS256'], issuer: ISS, audience: AUD });
```
- **Severity:** High–Critical (auth bypass/account takeover).

## 12. Insecure password reset & authentication flows (CWE-640; OWASP A07:2025)
- **Root cause:** Predictable/long-lived reset tokens, host-header-based reset links, user enumeration via differential responses, missing rate limits/MFA.
- **Remediation:** High-entropy single-use tokens with short expiry; don't trust Host header for links; uniform responses to prevent enumeration; rate-limit and add MFA; align password policy to NIST SP 800-63B (check against breached-password lists, avoid forced rotation/complexity theater).
- **Severity:** High.

## 13. Insecure Deserialization / Software & Data Integrity (CWE-502; OWASP A08:2025)
- **Root cause:** Deserializing untrusted data into objects (Java native, Python `pickle`, PHP `unserialize`), or trusting unsigned updates/CI artifacts.
- **Remediation:** Avoid native deserialization of untrusted input; use data-only formats (JSON) with schema validation; sign and verify artifacts/updates; integrity-check deserialized data. Example (Python): use `json.loads`, never `pickle.loads`, on untrusted input.
- **Severity:** High–Critical (RCE).

## 14. Mass Assignment / BOPLA (CWE-915; API3:2023)
- **Root cause:** Binding client input directly to models, letting attackers set protected fields (`isAdmin`, `role`).
- **Remediation:** Explicit allowlists (DTOs / `pick`) of writable fields; schema validation; ignore/reject unknown fields. Example:
```js
const { name, email } = req.body;      // allowlist
await User.update(id, { name, email }); // never spread req.body
```
- **Severity:** High (privilege escalation).

## 15. GraphQL-specific risks (API1/API4/API8:2023; OWASP GraphQL Cheat Sheet)
- **Introspection exposure:** Disable introspection and GraphiQL/Voyager in production; disable field-suggestion hints. Defense-in-depth (attackers can still brute-force fields).
- **Batching/aliasing abuse:** Batched or aliased operations bypass request-count rate limits and enable enumeration/brute force undetected by WAFs. Remediate with per-object/operation rate limiting in code, blocking batching for sensitive objects, and cost analysis counting each aliased resolution.
- **Deeply nested/recursive query DoS:** Cyclic types + unbounded lists exhaust resources. Add query depth limiting (`graphql-depth-limit`, `graphql-java MaxQueryDepthInstrumentation`), amount limiting, pagination, timeouts, and query cost/complexity analysis (`graphql-cost-analysis`, `MaxQueryComplexityInstrumentation`).
- **Resolver-level BOLA:** Enforce authorization in resolvers on both edges and nodes, not just at the gateway. OWASP API4:2023 explicitly names "GraphQL batching" as a resource-consumption limit; its Example #1 shows a single `POST /graphql` batching mutations `pic1` through `pic999`, and states verbatim: "Because the API does not limit the number of times the uploadPic operation can be attempted, the call will lead to exhaustion of server memory and Denial of Service."
- **Severity:** Medium–Critical depending on data/DoS impact.

## 16. Rate limiting / Unrestricted Resource Consumption (CWE-770; API4:2023)
- **Remediation:** Per-user/IP rate limits and quotas, payload-size caps, pagination, timeouts, concurrency limits; throttle sensitive operations (OTP, password recovery).
- **Severity:** Medium–High (DoS, brute force, cost).

## 17. Race conditions / TOCTOU (CWE-362, CWE-367; OWASP A06/A10:2025)
- **Root cause:** Check-then-act on shared state without atomicity/locking; a "race window" between check and use.
- **Attack scenario (conceptual):** Concurrent requests exploit a sub-state to overrun a limit — redeem a coupon/gift card multiple times, withdraw beyond balance, reuse a CAPTCHA/OTP, or bypass anti-brute-force limits. Modern "single-packet attack" techniques (PortSwigger research, James Kettle, Black Hat USA 2023) remove network jitter to line up race windows.
- **Detection:** Code with separate read-check and write steps on the same record (`if (coupon.notUsed){ apply(); markUsed(); }`, `if (balance>=amt){ withdraw(); }`) without transactions/locks. Note PHP's native session handler serializes per session — test with distinct session tokens.
- **Remediation:** Make sensitive state changes atomic via a single DB transaction with appropriate isolation (e.g., SERIALIZABLE or `SELECT ... FOR UPDATE`); use atomic conditional updates (`UPDATE ... WHERE status='unused'` checking rows-affected); uniqueness constraints; optimistic (version column) or pessimistic locking; idempotency keys for financial/one-time ops. Don't use sessions to guard DB limits. Example:
```sql
UPDATE coupons SET used = true WHERE code = $1 AND used = false; -- rows_affected must be 1
```
- **Severity:** Medium–High (financial/business-logic impact).

## 18. Business logic flaws (CWE-840; OWASP A06:2025 Insecure Design)
- **Root cause:** Design assumptions attackers violate (negative quantities, workflow step skipping, price manipulation, discount stacking).
- **Detection:** Threat-model each flow; test boundary/negative values and out-of-order steps.
- **Remediation:** Server-side invariants, threat modeling, abuse-case tests, deny-by-default state machines.
- **Severity:** Varies (often High).

## 19. HTTP Request Smuggling (CWE-444; OWASP A02:2025)
- **Root cause:** Front-end and back-end disagree on message boundaries (CL.TE, TE.CL, TE.TE, H2.CL/H2.TE downgrade).
- **Attack scenario:** Ambiguous `Content-Length`/`Transfer-Encoding` headers desynchronize the connection, enabling request poisoning, cache poisoning, or bypassing controls.
- **Detection:** Requests with both CL and TE; timing/differential responses. Tools like the HTTP Request Smuggler / smuggler.py aid detection.
- **Remediation:** Reject requests containing both CL and TE (respond 400); normalize/validate headers; prefer HTTP/2 end-to-end and disable downgrade/connection reuse where feasible; keep proxies/servers patched.
- **Severity:** High.

## 20. Web cache poisoning / deception (CWE-444/CWE-524; OWASP A02:2025)
- **Root cause:** Unkeyed inputs (headers) influence cached responses.
- **Remediation:** Include all response-affecting inputs in the cache key; avoid caching responses that vary on unkeyed headers; sanitize headers.
- **Severity:** Medium–High.

## 21. Clickjacking (CWE-1021; OWASP A02:2025)
- **Remediation:** `Content-Security-Policy: frame-ancestors 'none'` (or specific origins); `X-Frame-Options: DENY`.
- **Severity:** Low–Medium.

## 22. Open redirect (CWE-601; OWASP A01:2025)
- **Remediation:** Allowlist redirect targets; avoid using user input for redirects; use relative paths/mapping keys.
- **Severity:** Low–Medium (higher when chained with OAuth token theft).

## 23. Subdomain takeover (CWE-350; OWASP A02:2025)
- **Root cause:** Dangling DNS record (often CNAME) pointing to a deprovisioned third-party service that an attacker can claim.
- **Attack scenario:** Attacker registers the abandoned resource and serves content on a trusted subdomain — enabling phishing, cookie theft, CORS/CSP bypass, and OAuth-redirect abuse.
- **Detection:** Enumerate subdomains; check for CNAMEs resolving to unclaimed services / NXDOMAIN. Tools: subfinder/amass + nuclei/dnsReaper; cloud asset inventory alerts.
- **Remediation:** Remove DNS records before decommissioning resources; make DNS cleanup part of the decommission checklist; continuous monitoring.
- **Severity:** High–Critical (per severity of what the subdomain is trusted for).

## 24. Prototype pollution (CWE-1321; OWASP A08:2025) — relevant to Node/JS stacks
- **Root cause:** Recursive merge/clone or path-set functions that let `__proto__`/`constructor`/`prototype` keys modify `Object.prototype`.
- **Attack scenario:** Polluted prototype changes app-wide behavior, enabling DoS, property tampering, or gadget-chained RCE.
- **Detection:** Deep-merge/`extend`/`set(obj,path,val)` on untrusted input without key filtering; vulnerable libs (older `jQuery.extend` — e.g. CVE-2019-11358 — lodash merge variants).
- **Remediation:** Reject `__proto__`/`constructor`/`prototype` keys; use `Object.create(null)` maps; `Map` instead of objects; `Object.freeze(Object.prototype)` as defense-in-depth; schema validation. Example:
```js
for (const k of Object.keys(input)) {
  if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
  // ...safe assignment
}
```
- **Severity:** Medium–High (High if RCE gadget present).

## 25. Security misconfiguration (CWE-16; OWASP A02:2025)
- **Root cause:** Default creds, verbose errors, debug endpoints, missing security headers, unnecessary features. Security Misconfiguration surged from #5 (2021) to #2 (2025), affecting 3% of tested applications, reflecting how much application behavior now depends on configuration.
- **Remediation:** Hardened baselines; disable defaults/debug; security headers (CSP, HSTS, X-Content-Type-Options); least-functionality; config as code with review.
- **Severity:** Varies (Medium default).

## 26. Cryptographic failures (CWE-327/CWE-331; OWASP A04:2025)
- **Remediation:** TLS 1.2+/1.3; strong ciphers; AES-GCM; Argon2/bcrypt/scrypt for passwords; CSPRNG; no MD5/SHA1 for security; manage keys in a KMS.
- **Severity:** Medium–Critical.

## 27. Software supply chain / vulnerable & outdated components (CWE-1104/CWE-1357/CWE-1395; OWASP A03:2025)
- **Root cause:** Known-vuln dependencies; typosquatting/dependency confusion; compromised maintainers; transitive dependencies. This is a new/expanded 2025 category and, per OWASP Top 10:2025, despite having the fewest occurrences in testing data it has the highest average exploit and impact scores from CVEs.
- **Remediation:** SCA (Dependabot/Snyk/OWASP Dependency-Check); SBOM; pin versions and lockfiles; verify integrity/signatures; prefer trusted registries; monitor advisories. (See CI/CD in cloud reference for pipeline supply-chain.)
- **Severity:** Medium–Critical.

## 28. Security logging/alerting failures & mishandling of exceptional conditions (CWE-778/CWE-703; OWASP A09/A10:2025)
- **Root cause:** Insufficient logging, no alerting, verbose error leakage, failing open, unhandled edge conditions (A10 is a new 2025 category focused on improper error handling, logical errors, and failing open).
- **Remediation:** Log security events (authN/Z failures, input validation, high-value actions) without secrets/PII; centralize + alert; fail closed; handle exceptions deliberately; generic client error messages.
- **Severity:** Medium (amplifies other incidents).

## 29. Secrets/credential exposure in code or repos (CWE-798/CWE-540; OWASP A02/A05:2025)
- **Remediation:** Secret scanning in pre-commit + CI (Trufflehog/Gitleaks/detect-secrets); move secrets to env/secret managers; rotate leaked secrets; scrub git history; never log secrets.
- **Severity:** High–Critical.

---

# FILE 3 — references/mobile-security-reference.md

Baseline: **OWASP Mobile Top 10 (2024)** — M1 Improper Credential Usage, M2 Inadequate Supply Chain Security, M3 Insecure Authentication/Authorization, M4 Insufficient Input/Output Validation, M5 Insecure Communication, M6 Inadequate Privacy Controls, M7 Insufficient Binary Protections, M8 Security Misconfiguration, M9 Insecure Data Storage, M10 Insufficient Cryptography. Aligns with **OWASP MASVS/MASTG**. Note many server-side issues from the web reference also apply to mobile backends.

## 1. Improper credential usage / hardcoded secrets (M1; CWE-798)
- **Root cause:** Hardcoded API keys/credentials in the app binary; credentials handled insecurely. Binaries are decompilable, so embedded secrets are extractable.
- **Attack scenario:** Reverse-engineering the APK/IPA reveals API keys enabling free/premium access or backend abuse.
- **Detection:** Grep decompiled code/resources/strings for keys, tokens, endpoints; scan binaries with MobSF; check `strings`/plist/`res`.
- **Remediation:** Never ship secrets in the client; fetch short-lived tokens from a backend; store tokens in Keychain (iOS)/Keystore (Android); use attestation (Play Integrity API) to gate backend access. Rotate any exposed keys.
- **Severity:** High–Critical.

## 2. Inadequate supply chain security (M2; CWE-1357)
- **Root cause:** Vulnerable/malicious third-party SDKs and libraries; insecure build/distribution. A vulnerable SDK can add exported components to the merged manifest that developers miss.
- **Remediation:** Vet and pin SDKs; SCA (Dependabot); review merged manifest; minimize SDKs; monitor advisories; verify build integrity.
- **Severity:** Medium–Critical.

## 3. Insecure authentication/authorization (M3; CWE-287/CWE-285)
- **Root cause:** Client-side-only auth checks; weak session handling; predictable tokens; missing server-side authZ.
- **Remediation:** Enforce authN/Z server-side; secure session tokens; short PIN policies avoided; biometric via `BiometricPrompt`/`LAContext` with fallback; re-auth for sensitive actions; OAuth 2.0 Authorization Code + PKCE for public clients.
- **Severity:** High.

## 4. Insufficient input/output validation (M4; CWE-20)
- **Remediation:** Validate/sanitize all external input (deep links, IPC, network, files); parameterized local queries; output encoding in WebViews.
- **Severity:** Medium–High.

## 5. Insecure communication / cert pinning & TLS (M5; CWE-295/CWE-319)
- **Root cause:** Cleartext traffic; disabled/soft cert validation (accepting self-signed/invalid certs); no pinning where warranted.
- **Attack scenario:** MITM on hostile networks intercepts traffic when validation is weakened.
- **Detection:** Custom `TrustManager`/`HostnameVerifier` that accept all; `NSAllowsArbitraryLoads`/weakened ATS; missing HTTPS.
- **Remediation:** Enforce TLS 1.2+/1.3; never disable validation; consider SPKI public-key pinning via Android Network Security Config or OkHttp `CertificatePinner`, or iOS `URLSession` delegate — but pin public-key hashes, keep backup pins, and plan rotation (pinning is operationally fragile; Android/OkHttp docs explicitly warn it can break apps on certificate rollover). Use Network Security Config with backup pins + pin expiration where possible.
- **Severity:** Medium–High.

## 6. Inadequate privacy controls (M6)
- **Remediation:** Minimize data collection; accurate privacy manifests; mask sensitive UI fields; avoid sending PII over SMS; disclose trackers.
- **Severity:** Medium.

## 7. Insufficient binary protections / code tampering & reverse engineering (M7; CWE-919; formerly M8/M9 2016)
- **Root cause:** No obfuscation, anti-tampering, or integrity checks; repackaged apps unlock features/inject malware.
- **Remediation:** Obfuscation (R8/ProGuard); integrity/anti-tamper checks; Play Integrity API (note: SafetyNet Attestation was fully retired January 2025 — migrate to Play Integrity) / DeviceCheck/App Attest on iOS; root/jailbreak detection as defense-in-depth; keep secrets/logic server-side (client protections are not a substitute).
- **Severity:** Medium (higher for high-value apps).

## 8. Security misconfiguration incl. IPC: deep links, intents, universal links (M8; CWE-926/CWE-939)
- **Root cause:** Over-exported components; unvalidated intent extras; intent redirection (forwarding attacker-supplied nested intents under the app's identity); deep-link/URL-scheme hijacking; WebView misconfig.
- **Attack scenario (conceptual):** A malicious app sends a crafted intent; a vulnerable exported/proxy component forwards it to a protected component or grants URI permissions to private ContentProviders, enabling data theft/account takeover. Google's Android Security Team classifies intent redirection as severe, and Play can remove apps that leave it unfixed.
- **Detection:** `android:exported="true"` without permission; components with intent-filters; code that unparcels a nested `Intent` extra and immediately `startActivity`; `startActivityForResult`/`setResult` echoing untrusted intents; WebView `setJavaScriptEnabled` + untrusted URL loads; unverified deep-link hosts (`contains`/`startsWith` checks).
- **Remediation:** Set `exported=false` by default; require signature-level permissions on internal components; validate/sanitize intent data; use `IntentSanitizer`, strip `FLAG_GRANT_*` flags, and immutable `PendingIntent`; verify redirect targets against an allowlist; App Links / Universal Links with host verification (Digital Asset Links); harden WebViews (Android 16 adds by-default intent-redirection hardening). Example:
```xml
<activity android:name=".InternalActivity" android:exported="false"/>
```
- **Severity:** Medium–High.

## 9. Insecure data storage (M9; CWE-312/CWE-922)
- **Root cause:** Sensitive data in plaintext `SharedPreferences`/`UserDefaults`/SQLite/files; keychain/keystore misuse.
- **Detection:** Plaintext tokens/PII on device; unencrypted DBs; secrets in logs/backups.
- **Remediation:** iOS Keychain (with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`) / Secure Enclave; Android Keystore (hardware-backed, `setIsStrongBoxBacked(true)` where available) + `EncryptedSharedPreferences`/`EncryptedFile`; SQLCipher (AES-256) for local DBs; exclude sensitive data from backups; never log secrets.
- **Severity:** High (esp. with device access/malware).

## 10. Insufficient cryptography (M10; CWE-327)
- **Root cause:** Weak algorithms (MD5, custom crypto), hardcoded keys, predictable IV/OTP (e.g., time-based).
- **Remediation:** Vetted libraries (Tink, CryptoKit); AES-GCM; keys in Keystore/Keychain; CSPRNG (`SecureRandom`, not time-seeded); align with NIST (MASVS-CRYPTO aligns to NIST SP 800-175B / 800-57p1). Example:
```java
int otp = 100000 + new SecureRandom().nextInt(900000); // not System.currentTimeMillis()
```
- **Severity:** Medium–High.

## 11. React Native specifics (relevant to the user's stack)
- **Root cause:** Secrets in JS bundle (extractable); insecure `AsyncStorage` (unencrypted); insecure bridge/native modules; over-broad deep-link handling; vulnerable npm deps; OTA update integrity.
- **Remediation:** Use `react-native-keychain` / encrypted storage (not plain AsyncStorage) for secrets; keep secrets server-side; validate deep links; SCA on npm deps; sign/verify OTA updates (CodePush integrity); apply the web reference for the JS/backend layers.
- **Severity:** Medium–High.

---

# FILE 4 — references/cloud-security-reference.md

Baseline: cloud provider Well-Architected security guidance (AWS/GCP/Azure), CIS Benchmarks, **OWASP Top 10 CI/CD Security Risks**, CWE, NIST. Principle throughout: least privilege, deny-by-default, defense-in-depth, encrypt everywhere, log/monitor, shift-left IaC scanning.

## 1. Public storage bucket exposure (CWE-732/CWE-284)
- **Root cause:** Overly permissive bucket policies/ACLs (`Principal: *`, public-read/write), disabled Block Public Access.
- **Attack scenario:** Anonymous enumeration/download of sensitive objects — a leading cause of cloud data breaches.
- **Detection:** IAM Access Analyzer, AWS Config, CSPM, `check-no-public-access`; look for wildcard principals, public ACLs, disabled BPA; Azure public blob access; GCP `allUsers`/`allAuthenticatedUsers`.
- **Remediation:** Enable S3 Block Public Access (account + bucket); disable ACLs (Object Ownership = bucket owner enforced); least-privilege bucket/IAM policies scoped to specific ARNs; default encryption (SSE-S3/SSE-KMS); enforce HTTPS; versioning + logging. Example (Terraform):
```hcl
resource "aws_s3_bucket_public_access_block" "b" {
  bucket = aws_s3_bucket.b.id
  block_public_acls = true; block_public_policy = true
  ignore_public_acls = true; restrict_public_buckets = true
}
```
- **Severity:** High–Critical.

## 2. Overly permissive IAM (CWE-732/CWE-269)
- **Root cause:** Wildcard actions/resources (`"Action":"*"`, `"Resource":"*"`), broad managed policies, unused/stale privileges, long-lived access keys.
- **Attack scenario:** A compromised identity with broad rights enables data theft/deletion and lateral movement/privilege escalation.
- **Detection:** IAM Access Analyzer (validate + external-access preview), CloudTrail-based last-accessed analysis, policy validators (Parliament/Policy Sentry); grep IaC for `"*"`.
- **Remediation:** Least privilege with resource-level scoping and conditions (source IP, VPC, tags, MFA); prefer roles/short-lived creds over static keys; permission boundaries/SCPs; regular access reviews; remove stale identities. Example (scoped): allow only `s3:GetObject` on one bucket ARN with a condition.
- **Severity:** High–Critical.

## 3. Security group / firewall misconfiguration (CWE-284)
- **Root cause:** `0.0.0.0/0` ingress on sensitive ports (22/3389/DB ports); overly broad egress.
- **Detection:** IaC scanners (Checkov/Trivy) flag open ingress; CSPM; review SG/NSG/firewall rules.
- **Remediation:** Restrict source CIDRs; use bastions/SSM Session Manager instead of open SSH; segment networks; least-privilege egress; private subnets for data stores.
- **Severity:** High.

## 4. Cloud SSRF / metadata service exploitation — AWS IMDS (CWE-918/CWE-441)
- **Root cause:** App-layer SSRF plus reachable IMDSv1 (simple GET, no session token) lets an attacker retrieve the instance role's temporary IAM credentials from `169.254.169.254`.
- **Attack scenario:** SSRF → fetch `/latest/meta-data/iam/security-credentials/<role>` → assume instance identity → access AWS resources per the role's (often over-broad) permissions.
- **Detection:** Check `HttpTokens` = `optional` (IMDSv1 enabled) via Security Hub control EC2.8 / Config rule `ec2-imdsv2-check`; app endpoints fetching user URLs; over-privileged instance roles.
- **Remediation:** Enforce IMDSv2 (`HttpTokens: required`) org-wide via SCP/Config; set hop limit to 1; fix SSRF (allowlist, block link-local); least-privilege instance roles; VPC endpoints; monitor CloudTrail for anomalous role use. Azure: use Managed Identity with scoped tokens; GCP: metadata access controls + org policy. Example (CloudFormation launch template): `MetadataOptions: { HttpTokens: required, HttpPutResponseHopLimit: 1 }`.
- **Severity:** Critical (path to account compromise).

## 5. Container security — images & Docker (CWE-1104/CWE-250)
- **Root cause:** Running as root; vulnerable/outdated base images; secrets baked into layers; excessive capabilities; writable/privileged containers.
- **Detection:** Trivy/Grype image scans; Dockerfile analysis; check for `USER root`, `--privileged`, embedded secrets, `latest` tags.
- **Remediation:** Minimal/distroless base images; non-root `USER`; drop capabilities; read-only root filesystem; no secrets in images (use runtime secret injection); pin digests; scan in CI. Example:
```dockerfile
FROM gcr.io/distroless/nodejs20
USER 10001
COPY --chown=10001:10001 app /app
```
- **Severity:** Medium–High.

## 6. Kubernetes RBAC & exposed dashboards (CWE-284/CWE-269)
- **Root cause:** `cluster-admin`/wildcard roles; default service-account token auto-mount; anonymous API access; exposed dashboard; no network policies; sensitive data in ConfigMaps; `escalate`/`bind`/`impersonate` verbs.
- **Attack scenario:** An exposed unauthenticated dashboard or over-privileged pod token lets an attacker deploy workloads (e.g., cryptomining), read secrets, or take over the cluster (cf. the 2018 Tesla exposed-dashboard cryptomining incident discovered by RedLock).
- **Detection:** kube-bench (CIS); audit Roles/ClusterRoles for `*`; check `--anonymous-auth`; dashboard exposure; `automountServiceAccountToken`; secrets in ConfigMaps.
- **Remediation:** Least-privilege RBAC (namespaced Roles, no blanket cluster-admin); disable anonymous auth (`--anonymous-auth=false`); don't expose the dashboard (VPN/port-forward only); network policies (default-deny); disable default SA token automount; store secrets in Secrets (encrypted at rest) or external vault; admission control (OPA Gatekeeper/Kyverno); keep versions patched. Example:
```yaml
kind: Role
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get","list"]   # no wildcards
```
- **Severity:** High–Critical.

## 7. Serverless-specific risks (CWE-269/CWE-668)
- **Root cause:** Over-scoped function execution roles; event-data injection; secrets in env vars; over-long timeouts; unvalidated event triggers.
- **Attack scenario:** A compromised function with broad IAM becomes a pivot; malicious event payloads (from queues, uploads, webhooks) inject into downstream logic.
- **Detection:** Review per-function IAM (avoid wildcards); treat all event sources as untrusted input; check env-var secrets.
- **Remediation:** One least-privilege role per function; validate/sanitize event payloads; secrets in a secret manager (not env vars where avoidable); short timeouts; input allowlists.
- **Severity:** Medium–High.

## 8. IaC misconfiguration patterns (CWE-1188/CWE-16)
- **Root cause:** Insecure defaults propagated across environments via modules; public buckets, open SGs, wildcard IAM, unencrypted storage, missing logging in Terraform/CloudFormation; unscanned Git-sourced modules; plaintext secrets in state.
- **Detection:** Checkov (largest policy library — 3,000+ checks, multi-framework), Trivy (`trivy config`, the successor to tfsec), TFLint (lint, not security); pre-commit + CI gates; note tfsec is in maintenance mode (folded into Trivy) and Terrascan was archived by Tenable in November 2025. Watch the Git-module blind spot (scanners miss `.terraform/modules` unless configured).
- **Remediation:** Scan IaC in CI as a merge gate (start advisory, then blocking); least-privilege modules; encrypt state in remote backends; no secrets in code/state; document suppressions with justification+expiry. Example (GitHub Actions): run Checkov + Trivy on PRs touching `**.tf`.
- **Severity:** Varies (Medium–High).

## 9. Secrets management failures (CWE-798/CWE-522)
- **Root cause:** Hardcoded credentials, secrets in env vars/logs/IaC/state, secrets in container layers.
- **Remediation:** Central secret managers (AWS Secrets Manager/SSM, Vault, Azure Key Vault, GCP Secret Manager); short-lived dynamic creds; rotation; secret scanning in CI; encrypt at rest; least-privilege access to secrets.
- **Severity:** High–Critical.

## 10. Logging & monitoring gaps (CWE-778; OWASP A09:2025)
- **Root cause:** Disabled/centralization-less audit logs; no alerting; tamperable logs.
- **Remediation:** Enable CloudTrail/Cloud Audit Logs/Azure Activity Log across accounts/regions; centralize + immutable storage; alert on anomalies (metadata access, root use, IAM changes, data egress); retain per compliance.
- **Severity:** Medium (amplifies incidents).

## 11. CI/CD pipeline security (OWASP Top 10 CI/CD Security Risks)
- **CICD-SEC-1 Insufficient Flow Control:** enforce branch protection, required reviews, deployment approvals.
- **CICD-SEC-2 Inadequate IAM:** least-privilege pipeline identities; OIDC short-lived cloud creds instead of stored keys.
- **CICD-SEC-3 Dependency Chain Abuse:** dependency confusion/typosquatting defenses; pin + verify; private registries.
- **CICD-SEC-4 Poisoned Pipeline Execution (PPE):** Direct (D-PPE: edit pipeline config), Indirect (I-PPE: edit referenced scripts/Makefiles), and Public (3PE: fork PRs). Root cause: pipelines executing unreviewed code with access to secrets. Remediation: don't run untrusted fork PRs with secrets (avoid `pull_request_target` + checkout of fork code); require approval; isolate build from secrets; pin actions to commit SHAs (mutable tags like `@v1` can be moved by a compromised maintainer).
- **CICD-SEC-5 Insufficient PBAC:** scope pipeline permissions to the job; ephemeral runners.
- **CICD-SEC-6 Insufficient Credential Hygiene:** rotate, scope, and scan for secrets; no long-lived tokens.
- **CICD-SEC-7 Insecure System Configuration:** harden CI platform config.
- **CICD-SEC-8 Ungoverned 3rd-Party Services:** govern integrations/marketplace apps.
- **CICD-SEC-9 Improper Artifact Integrity Validation:** sign and verify artifacts (Sigstore/cosign); SLSA provenance; secure artifact storage.
- **CICD-SEC-10 Insufficient Logging/Visibility:** centralize pipeline logs and alert.
- **Detection:** Review workflow files (`.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`) for fork-PR triggers, mutable action tags, inline secrets, and missing approvals.
- **Severity:** High–Critical (pipeline compromise = production compromise; cf. SolarWinds, Codecov).

## 12. Multi-tenancy isolation failures (CWE-668/CWE-1385)
- **Root cause:** Shared resources without tenant scoping; missing tenant checks (a cloud/SaaS form of BOLA); cross-tenant token reuse (missing `aud`).
- **Detection:** Verify every data path filters by tenant ID server-side; test cross-tenant access with two tenant accounts.
- **Remediation:** Enforce tenant isolation at data and network layers; scope tokens per tenant and validate `aud`; consider per-tenant keys/namespaces; test isolation continuously.
- **Severity:** High–Critical.

## 13. Cryptography & encryption in the cloud (CWE-311/CWE-327)
- **Remediation:** Encrypt at rest (KMS/CMEK) and in transit (TLS); enforce via bucket/volume policies; manage keys with rotation and least-privilege key policies; avoid embedding keys.
- **Severity:** Medium–High.

---

## Cross-cutting notes & caveats
- **Standards recency:** OWASP Top 10:2025 was released November 6, 2025 at the OWASP Global AppSec Conference in Washington, D.C. (first update since 2021); the API Top 10 is the 2023 edition; the Mobile Top 10 is 2024. Confirm current editions at audit time.
- **Tools referenced** (Semgrep, Checkov, Trivy, MobSF, Dependabot, Snyk, Trufflehog, kube-bench, IAM Access Analyzer, etc.) are examples, not endorsements; validate their findings — scanners cannot fully cover design flaws, access control, or business logic, and OWASP explicitly cautions against any claim of full Top 10 coverage.
- **Defensive scope:** All exploit descriptions are conceptual to guide detection/remediation. Do not use against systems without authorization.
- **Single-source / directional claims:** Some figures (e.g., specific research throughput benchmarks for single-packet race-condition techniques, or the "~40% of API attacks are BOLA" statistic from Salt Security) come from individual vendor/research sources; treat them as directional rather than definitive.

## Recommendations (how to adopt this skill)
1. **Stand it up as a real Agent Skill.** Create a `security-audit/` folder with `SKILL.md` (File 1 verbatim, keeping the "pushy" description so Claude doesn't under-trigger) and a `references/` directory holding the three platform files. This matches Anthropic's Agent Skills format (folder + `SKILL.md` with YAML frontmatter `name`/`description`, progressive disclosure of references on demand). Only load from trusted sources.
2. **Wire in tooling for the automated pass.** Add a `scripts/` directory (optional) that shells out to Semgrep, Trivy/Checkov, Gitleaks, and — for the user's stack — MobSF for React Native builds and IAM Access Analyzer for Supabase/AWS-adjacent infra. Have the skill map every tool finding to CWE + OWASP category so the manual pass can focus on what tools miss.
3. **Tailor the first runs to the user's stack** (React/Next.js, Node, Python, MongoDB, Supabase, React Native): prioritize NoSQL injection (§Web-4), Broken Access Control/RLS-equivalent authZ and Supabase Row-Level-Security review (§Web-1), JWT validation (§Web-11, Supabase issues JWTs), prototype pollution (§Web-24), secrets in Next.js env/`NEXT_PUBLIC_` exposure (§Web-29), and React Native storage/secrets (§Mobile-11).
4. **Gate CI on the highest-leverage checks first:** secret scanning + SCA + IaC scanning as blocking merge gates; SAST advisory-then-blocking once false positives are tuned.
5. **Thresholds that change the plan:** if the app is internet-facing and handles PII/payments, treat any Critical/High as release-blocking; if a scanner's false-positive rate is high, keep it advisory until tuned; escalate a finding a tier when it plausibly chains (e.g., SSRF on an EC2/instance-role host → treat as Critical due to IMDS credential-theft path).