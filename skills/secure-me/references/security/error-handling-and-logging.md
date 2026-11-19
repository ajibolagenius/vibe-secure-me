# Error Handling, Fail-Open & Security Logging

Baseline: **OWASP A10:2025 Mishandling of Exceptional Conditions** and **A09:2025 Security Logging and Alerting Failures**.

## Fail-open authorization (A10)

The most damaging form: a check that throws, times out or returns `undefined`, where the code treats that as "allowed".

```typescript
// BAD: any error in the lookup grants access
async function canEdit(userId: string, docId: string) {
  try {
    const doc = await db.doc.findUnique({ where: { id: docId } })
    return doc?.ownerId === userId || !doc   // missing doc => true
  } catch {
    return true                               // DB hiccup => true
  }
}

// GOOD: deny by default; only an explicit positive result allows
async function canEdit(userId: string, docId: string): Promise<boolean> {
  const doc = await db.doc.findUnique({ where: { id: docId }, select: { ownerId: true } })
  return doc !== null && doc.ownerId === userId
}
```

Look for these patterns:

- `catch { return true }`, `catch { next() }`, or a `catch` that logs and continues inside auth, payment, rate-limit or feature-entitlement code.
- External auth or entitlement calls (IdP, billing API, feature-flag service, rate-limit store such as Redis/Upstash) whose failure path **skips** the check. When Redis is down, a rate limiter that allows every request turns into a brute-force window. Decide fail-open vs fail-closed deliberately for each control, and fail closed for auth and money.
- Webhook handlers that return `200` before verification finishes, or that treat a signature-verification exception as success.
- `Promise.allSettled` / `Promise.all` results where a rejected authorization promise is ignored.
- Go `if err != nil { log(err) }` with no `return`. Python bare `except: pass`. Missing `default:` deny in a role `switch`.
- Partial-failure states: money debited and the order never created, or a role granted and the audit write failed, with no transaction or compensating action.

## Information leakage through errors

- Stack traces, SQL errors, ORM messages or framework debug pages returned to clients in production.
- Different error messages or timings for "user not found" and "wrong password" (account enumeration). The same applies to password reset and signup.
- Raw upstream error bodies, which can contain API keys or internal hostnames, passed through to the client.

**Fix:** return a generic error with a correlation ID to the client, and log the details server-side.

## Resource and edge conditions

- Unbounded input sizes (JSON body, file, array length, regex input: watch for ReDoS), no timeouts on outbound calls, and unhandled promise rejections that crash the process (DoS).
- Integer overflow or negative values in quantities and amounts. `NaN` passing numeric comparisons in JS (`NaN > limit` is `false`, so "not over the limit").
- Missing handling for `null` or empty results that later code assumes are present.

## Security logging & alerting (A09)

**Must log** (who, what, when, from where, result): logins and failures, MFA changes, password resets, role or permission changes, access-denied events, admin actions, API key creation, payment state changes, webhook verification failures, and agent tool calls (step 20).

**Must not log:** passwords, tokens, session cookies, full card numbers, API keys, raw `Authorization` headers, or full request bodies of auth and payment endpoints. Look for `console.log(req.body)`, `logger.info(headers)` and request-logging middleware without redaction.

**Integrity and alerting:**

- Audit logs should be append-only, or shipped off-host, and kept apart from app logs that devs routinely purge.
- An alert on log volume or failed logins is worth more than a log nobody reads. Flag "logs exist but no alerting" as a finding for apps handling money or PII.
- Log injection: strip CR/LF from user-controlled values before they go into line-based logs.
- See Audit mode, `references/audit/logging-and-observability.md`, for the cost side of log volume.

## Finding checklist

| Check | Typical severity |
| --- | --- |
| Auth, payment or entitlement check fails open on exception | Critical/High |
| Rate limiter fails open while protecting auth/OTP endpoints | High |
| Stack traces or SQL errors returned in production | Medium |
| Secrets or tokens written to logs | High |
| No audit trail for admin or role changes | Medium |
| Account enumeration through error differences | Low/Medium |
