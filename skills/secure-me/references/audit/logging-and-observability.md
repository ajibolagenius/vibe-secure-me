# Logging, Analytics & Observability Volume

Metered resources: log ingestion and retention (e.g. Supabase log ingestion caps, Vercel/Netlify log drains, Datadog/New Relic/CloudWatch GB ingested), trace spans, analytics events, and DB writes for homemade analytics.

## 1. Log less, log structured

- No `console.log` of full request or response bodies, large objects or arrays in hot paths. One log line per request, structured (JSON) with a request ID, is the target.
- Use log levels: `debug` off in production, controlled by env var.
- Logging inside loops (per item, per row, per chunk of a stream) multiplies volume.
- Noisy expected errors (404s from bots, aborted streams, validation failures) at `error` level inflate volume and bury real alerts. Downgrade them, or sample.
- Security overlap: never log secrets, tokens, cookies or full auth/payment bodies (Security step 21).

## 2. Sample and cap

- Traces and spans: head-sample (e.g. 1–10%) for high-traffic routes, and always keep errors and slow requests.
- Client error reporting (Sentry etc.): set `sampleRate` / `tracesSampleRate` and filter known-noise errors (browser extensions, ResizeObserver loop, aborted fetches). Session replay at 100% is a bill.
- Set ingestion caps and retention per environment. Preview and staging don't need 30-day retention.

## 3. Database-backed analytics

- View counters, impressions and click tracking that write to the primary DB on every request: skip bots (`User-Agent`, platform bot signals), batch through KV or Redis or a queue, and flush periodically. Or use a dedicated analytics product.
- Presence and activity: throttle `last_active_at`-style writes to ≥ 5 minutes per user.
- These writes also generate DB logs and WAL, so they count against log-ingestion caps twice.

## 4. Platform-specific notes

- Supabase: Postgres, API and auth logs count against log ingestion. Chatty `RAISE NOTICE` in functions and triggers, and request-per-view patterns, inflate it.
- Serverless platforms often bill or cap log drains separately. Verbose middleware logging runs on *every* request, assets included if the matcher is broad.

## Finding checklist

| Check | Typical impact |
| --- | --- |
| Full request/response bodies logged in hot paths or middleware | High (also a security issue) |
| Per-view analytics DB writes, bots included | Medium–High |
| Tracing or session replay at 100% on high-traffic routes | Medium–High |
| Logging inside loops or streams | Medium |
| Expected/noisy errors logged at `error` without filtering | Low–Medium |
| No ingestion caps or retention limits | Medium |
