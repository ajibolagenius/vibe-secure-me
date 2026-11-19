# Reliability & Resilience

What turns a vendor hiccup or a traffic spike into an outage, data loss, or a runaway bill.

## 1. Timeouts on everything outbound

- Every `fetch`, SDK call, DB query and AI request needs a timeout (`AbortSignal.timeout(ms)`, SDK `timeout` options, DB `statement_timeout`). Without one, a slow dependency holds functions open until the platform kills them, and you pay for the whole wait.
- The timeout must be shorter than the function's own max duration, so you can return a clean error.

## 2. Retries done right

- Retry only idempotent operations and retryable errors (network errors, 429, 502/503/504). Use exponential backoff **with jitter** and a max attempt count, and respect `Retry-After`.
- Don't stack retry layers (SDK + HTTP client + queue + your loop), because the attempts multiply.
- A circuit breaker or short-term failure cache for dependencies that are down, so every request doesn't wait out the timeout.

## 3. Idempotency

- Webhook handlers (Stripe, GitHub, payment providers) receive duplicates and retries. Dedupe on the event ID in a unique-constrained table before side effects.
- Payment and order creation: idempotency keys on the provider calls and on your own `POST` endpoints.
- Cron and queue jobs can run twice or overlap. Use locks or processed-markers.

## 4. Order of operations (no data loss)

- **Replace flows:** write the new reference first, then delete the old resource best-effort.
- **Moves and migrations:** copy, verify, update the reference, and only then delete the source. Support `--dry-run`, and make it resumable.
- Multi-step writes that must succeed together go in a DB transaction, or use an outbox pattern for external side effects.

## 5. Graceful degradation at quota limits

- When a quota or rate limit is hit (AI provider 429, DB connection limit, image-optimisation quota, edge request cap), the app should degrade: cached or stale content, a queued request, or a clear message. It shouldn't crash pages.
- Non-critical features (recommendations, analytics, avatars) must not take down critical paths (checkout, login) when they fail. Isolate them with error boundaries and `Promise.allSettled`.

## 6. Vendor concentration

- Single vendors whose policy enforcement can disable the *whole account* (media hosts with AUP enforcement, platforms with fair-use suspensions, free tiers that pause on inactivity or overage) are a reliability risk. Name them, and propose a fallback or alternative for anything user-facing.
- Free tiers that pause the project (e.g. after inactivity) or prohibit commercial use are a production-readiness finding for revenue-generating apps.
- Keep domains, DNS, schedules and env config declared in code and backed up, so you can move platforms.

## 7. Health & alerting

- A health check that exercises real dependencies (DB, cache) cheaply, and doesn't run heavy queries on every probe.
- Alerts on error rate, latency, quota usage (e.g. 80% of a monthly cap) and spend. Finding out from the dashboard after the project is paused is too late.

## Finding checklist

| Check | Typical impact |
| --- | --- |
| No timeouts on outbound calls in request paths | High |
| Non-idempotent webhook or payment handling | High (double charges, duplicate orders) |
| Delete-before-write on replace/migrate | High (data loss) |
| Retries without backoff, or stacked retry layers | Medium–High |
| Optional feature failure breaks critical page | Medium–High |
| Production app on a free tier that pauses or forbids commercial use | Medium–High |
| No quota or spend alerts | Medium |
