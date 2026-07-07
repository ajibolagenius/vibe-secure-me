# Web & API Security Reference

Baseline: **OWASP Top 10:2025**, **OWASP API Security Top 10 (2023)**.

## 1. Broken Access Control / IDOR (CWE-284, CWE-639; OWASP A01:2025; API1/API5:2023)
- **Root cause:** Authorization decisions made on the client, or object/function access enforced inconsistently server-side; trusting user-supplied identifiers without verifying ownership.
- **Attack scenario:** Changing an object identifier in a request (e.g., `/api/users/1234` → `1235`) returns another user's data — Broken Object Level Authorization (BOLA). Function-level variants (BFLA) let a normal user reach admin operations.
- **Remediation:** Enforce deny-by-default, server-side authorization on every object and function. Centralize entitlement checks. Use non-guessable IDs (UUIDs) as defense-in-depth.

## 2. SSRF (CWE-918; API7:2023)
- **Root cause:** Server fetches a user-supplied URL without validation, allowing requests to internal services or cloud metadata endpoints.
- **Attack scenario:** Attacker supplies a URL pointing at `169.254.169.254` (cloud metadata) or internal services.
- **Remediation:** Allowlist destination hosts/protocols; block private/link-local ranges (RFC1918, localhost); resolve DNS and re-validate the resolved IP.

## 3. SQL & NoSQL Injection (CWE-89, CWE-943; OWASP A05:2025)
- **Root cause:** Untrusted input concatenated into SQL or parsed into NoSQL query objects (`$ne`, `$where`).
- **Remediation:** Parameterized queries / prepared statements exclusively. For NoSQL, enforce types, reject keys starting with `$`, use schema validation.

## 4. Cross-Site Scripting — reflected/stored/DOM (CWE-79)
- **Root cause:** Untrusted data rendered into HTML/JS without contextual encoding; DOM sinks (`innerHTML`, `eval`).
- **Remediation:** Context-aware output encoding; framework auto-escaping; sanitize rich HTML with DOMPurify; strong Content-Security-Policy.

## 5. JWT / Session Vulnerabilities (CWE-347, CWE-384; OWASP A07:2025)
- **Root cause:** Trusting the token's `alg` header; accepting `alg:none`; algorithm confusion; weak secrets; missing `iss`/`aud`/`exp` validation.
- **Remediation:** Pin a fixed algorithm server-side; reject `none`; validate `iss`, `aud`, `exp`, `nbf`; strong ≥256-bit secrets; short access-token TTL.

## 6. GraphQL-Specific Risks
- **Introspection exposure:** Disable introspection and GraphiQL in production.
- **Batching/aliasing abuse:** Batched operations bypass rate limits. Remediate with per-object/operation rate limiting in code and block batching for sensitive objects.
- **Deeply nested DoS:** Cyclic types exhaust resources. Add query depth limiting and query cost analysis.

## 7. gRPC & HTTP/2 Attack Vectors
- **Insecure Transport:** Ensure gRPC services are not deployed using unencrypted plaintext channels. Verify Mutual TLS (mTLS).
- **HPACK Desynchronization:** Test HTTP/2 stack for header parsing desynchronization which leaks headers between sessions.
- **Streaming Resource Exhaustion:** Enforce `MaxConcurrentStreams`, keepalive enforcement, and strict per-call deadlines.

## 8. HTTP Request Smuggling (CWE-444; OWASP A02:2025)
- **Root cause:** Front-end and back-end disagree on message boundaries (CL.TE, TE.CL).
- **Remediation:** Reject requests containing both CL and TE; normalize/validate headers; prefer HTTP/2 end-to-end.

## 9. Race conditions / TOCTOU (CWE-362; OWASP A06/A10:2025)
- **Root cause:** Check-then-act on shared state without atomicity/locking.
- **Remediation:** Make sensitive state changes atomic via a single DB transaction (e.g., `SELECT ... FOR UPDATE`); use conditional updates; idempotency keys.

## 10. Prototype Pollution (CWE-1321)
- **Root cause:** Recursive merge/clone functions that let `__proto__`/`constructor` keys modify `Object.prototype`.
- **Remediation:** Reject prototype keys; use `Object.create(null)` maps; `Map` instead of objects.
