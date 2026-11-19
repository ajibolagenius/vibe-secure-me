# Polling, Background Work, Cron, Service Workers, Push & Realtime

Metered resources: function invocations, DB queries, realtime concurrent connections and messages, push sends, and log volume.

## 1. Kill client polling of slow-changing data

```ts
// BAD: 720 requests per open tab per hour, forever
useEffect(() => { const id = setInterval(loadPricing, 5000); return () => clearInterval(id) }, [])

// GOOD: fetch on mount, refetch on focus or after a mutation
useEffect(() => { loadPricing() }, [])
// or: SWR / TanStack Query with refetchOnWindowFocus and a sensible staleTime
```

- Pricing, packages, config, feature flags and profile data don't need polling. Fetch on mount, on tab focus (`visibilitychange`), or after an explicit mutation.
- If something genuinely needs liveness, use realtime or SSE with filters, or poll with backoff that **stops when the tab is hidden**.
- Count the multipliers: one interval inside a component rendered in a list means N intervals.

## 2. Cron & scheduled work

- **Every cron-invoked HTTP route requires auth**, e.g. `Authorization: Bearer ${CRON_SECRET}` compared in constant time. Return `401` otherwise. An open cron route lets anyone trigger your most expensive job.
- **Declare schedules and domains in code** (`vercel.json` `crons`, `wrangler.toml` / `cloudflare.config.ts` `triggers`, `netlify.toml` scheduled functions, EventBridge in IaC), so a CLI or CI deploy doesn't silently overwrite schedules configured in the dashboard.
- On Cloudflare Workers, prefer a native `scheduled()` handler over an HTTP cron route.
- Jobs must be **bounded** (batch size, max runtime) and **idempotent**, since cron can fire twice or overlap. Take a lock or use a processed-marker.

## 3. Queues & fan-out

- Work that fans out (send 10k emails, reprocess all images) belongs in a queue (SQS, Cloudflare Queues, Upstash QStash, Inngest, Trigger.dev, Supabase Queues/pgmq) with concurrency limits. Don't use one function looping until timeout.
- Retries need exponential backoff with jitter and a max attempt count, plus a dead-letter queue. A tight retry loop on a failing dependency multiplies cost while it's down.

## 4. Service workers

- **No unconditional `POST` on load or SW activation.** `POST /api/push/subscribe` on every page load or SW start is a classic storm. Check current state first (a status endpoint plus a `localStorage` TTL cache of ≥ 12 h), and only write when the subscription endpoint or keys actually changed.
- **Never let the edge cache `sw.js`.** Serve it with `Cache-Control: public, max-age=0, must-revalidate` (plus `Service-Worker-Allowed: /` if scope requires it), so a buggy SW can always be replaced. Serve the `manifest.json` / `manifest.webmanifest` with `no-cache`.
- One registration and update path. Duplicate `registration.update()` polling across hooks multiplies requests.
- SW fetch handlers that bypass the HTTP cache or re-fetch on every navigation defeat CDN caching.

## 5. Realtime (Supabase Realtime, Firebase listeners, Pusher/Ably, WebSockets)

- Open channels **only for authenticated users who need live updates**, and only on screens that show live data. No realtime for anonymous visitors on public pages.
- Always use **server-side filters** (`filter: 'room_id=eq.123'`). Subscribing to an entire table broadcasts every change to every client, which is a cost issue and often a data leak.
- **Always unsubscribe on unmount** (`supabase.removeChannel(ch)`, `unsubscribe()`). Leaked channels pile up across route changes.
- Firebase `onSnapshot` on large queries re-bills document reads on reconnect. Scope the queries and limit them.
- Presence and heartbeat intervals: ≥ 30 s for presence pings, and DB writes for `last_seen` throttled to ≥ 5 min.

## Finding checklist

| Check | Typical impact |
| --- | --- |
| Client `setInterval` polling on a page every visitor loads | High–Critical |
| Push subscribe `POST` on every load / SW activation | High |
| Cron route without secret check | High (abuse) |
| `sw.js` cached at the edge | Medium (can't ship a fix to broken clients) |
| Unfiltered realtime subscription / no cleanup on unmount | High |
| Realtime opened for anonymous visitors | Medium–High |
| Schedules configured only in a dashboard | Medium (silently lost on deploy) |
| Fan-out in a single function; retries without backoff | Medium–High |
