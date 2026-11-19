# Platform Limits & Spend Controls

**As of: November 2026. Quotas and prices change often.** Use this file to learn *which dimensions* each platform meters and where its traps are. Confirm exact numbers on the vendor's pricing or limits page before quoting them. If you can't, say "as of Nov 2026".

Universal checks for every platform:

- Is a **spend cap or budget alert** configured? If not, that's a finding for any app with public traffic.
- Are **crons, domains, env vars and routes declared in code**, so a deploy can't overwrite dashboard settings?
- Do the **free-tier terms** fit the use: commercial use allowed, inactivity pause, what happens at the cap (hard stop, throttle, or overage billing)?
- Are function **timeout and memory** sized to need, not set to the maximum?

## Vercel

- **Meters:** function invocations, active CPU and provisioned memory (Fluid compute), edge requests, fast data transfer/bandwidth, ISR reads and writes, image optimisation (transformations and cache), log drains, build minutes.
- **Traps:** routes that are dynamic by accident (see compute-and-caching), middleware on every request including assets, the Hobby plan being **non-commercial**, unbounded image-optimisation sources, and overages on Pro unless the spend management limit is set. Newer teams may default to fixed-tier CDN pricing; check the team's billing mode.
- **Controls:** Spend Management (hard limit with pause, or alerts), firewall and bot rules, `vercel.json` `crons`, `maxDuration` per route.

## Netlify

- **Meters:** credit-based plans on newer accounts (deploys, bandwidth, function compute and requests draw from one credit pool). Legacy plans meter bandwidth, build minutes and function invocations separately.
- **Traps:** one project exhausting the shared credit pool can **pause the whole account**. Frequent production deploys cost credits. Function logs and edge-function invocations on every request.
- **Controls:** usage alerts, `netlify.toml` for headers, redirects and scheduled functions, deploy-preview limits.

## Cloudflare (Workers, Pages, R2, KV, D1, Durable Objects)

- **Meters:** Workers requests and CPU time per request (Free: daily request cap and a low CPU-ms limit; beyond the daily cap requests fail with **Error 1027** until reset), KV reads and writes, D1 rows read and written, Durable Object requests and duration, R2 Class A/B operations and storage (**R2 egress is free**), Images transformations.
- **Traps:**
  - In-memory caches don't persist across isolates. Use the Cache API, KV, or an R2/Durable Object-backed response store for ISR / `unstable_cache` on Workers (e.g. OpenNext / vinext adapters).
  - Worker bundle size limits. Check the current plan limit, then measure the compressed upload (`wrangler deploy --dry-run --outdir`).
  - `*.r2.dev` public URLs are rate-limited and not meant for production. Use a custom domain.
  - Dashboard-configured routes and cron triggers get overwritten by CLI or CI deploys unless they're declared in `wrangler.toml` / `cloudflare.config.ts` (`routes`/`domains`, `triggers.crons` / `scheduled`).
- **Secrets:** only public build-time vars (`NEXT_PUBLIC_*`) belong in build variables. Private keys (`*_SECRET*`, service-role keys, `CRON_SECRET`, email API keys) go in Worker secrets (`wrangler secret put`). Keep `.dev.vars` and `.env.local` gitignored.
- **Cron:** dispatch native Cron Triggers through a `scheduled()` handler. If HTTP cron routes exist, require `Authorization: Bearer ${CRON_SECRET}`.

## AWS (Lambda, API Gateway, CloudFront, S3, Amplify)

- **Meters:** Lambda requests and GB-seconds, provisioned concurrency (billed while idle), API Gateway requests, **NAT Gateway hourly + per-GB processing** (a classic surprise for Lambdas in a VPC calling the internet), data transfer out, CloudWatch Logs ingestion and retention (default retention is *never expire*), S3 requests and egress.
- **Traps:** Lambdas in a VPC routing S3 or DynamoDB traffic through NAT instead of VPC endpoints, CloudWatch log groups with infinite retention, recursive invocation loops (S3 → Lambda → same bucket), and oversized memory settings.
- **Controls:** AWS Budgets with alerts and actions, Cost Anomaly Detection, reserved concurrency as a hard cap per function, log retention policies in IaC.

## Supabase

- **Meters:** database size, egress (with separate cached egress), storage size, MAUs, Edge Function invocations, Realtime concurrent connections and messages, and log ingestion. Compute size per project.
- **Traps:** free projects **pause after inactivity**. The free tier's storage, egress and log caps are hit fast by user media, `select('*')` on public pages, polling, and per-view writes. PostgREST's default 1,000-row response cap silently truncates batch jobs. Unfiltered Realtime subscriptions. Missing indexes on RLS predicate columns.
- **Controls:** the spend cap on Pro (on by default; turning it off allows overages), usage dashboards, Supavisor pooling (transaction mode) for serverless, and moving media to R2 or another CDN-backed store.

## Firebase / Google Cloud

- **Meters:** Firestore document reads, writes and deletes (per document, not per query), Realtime Database bandwidth and connections, Cloud Functions invocations/GB-s/egress, Storage egress, Hosting bandwidth.
- **Traps:** `onSnapshot` listeners on large queries (re-bills reads on reconnect), client-side counting by reading whole collections, functions triggered on writes that write again (loops), and the Blaze plan with no budget.
- **Controls:** Cloud Billing budgets with alerts (budgets alert, they don't cap; capping needs a Pub/Sub-triggered function that disables billing), `count()` aggregation queries, App Check against abuse.

## Render / Railway / Fly.io / Heroku-style PaaS

- **Meters:** instance hours or usage-based CPU/RAM, bandwidth, managed DB size, and always-on vs scale-to-zero.
- **Traps:** free instances that sleep (cold starts for users), autoscaling with no max, and usage-based plans with no hard limit.
- **Controls:** set max instances or replicas and usage limits, and alert on spend.

## Neon / PlanetScale / Turso / MongoDB Atlas

- **Meters:** compute hours (Neon autosuspend), rows read and written (PlanetScale, Turso), storage, branches, and data transfer.
- **Traps:** unindexed queries billed per row scanned, long-lived connections or pollers preventing scale-to-zero, and preview-branch sprawl.

## AI providers

See `references/audit/ai-spend.md`. Set hard limits in every console, and treat them as a backstop rather than the control.
