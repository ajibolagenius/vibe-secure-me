# Audit Mode: Playbook

Find what will burn money, exhaust a quota, or fall over under real traffic. Free and low tiers fail hard (paused projects, `429`s, `Error 1027`, suspended accounts), and paid tiers fail expensively. Most causes are the same few patterns. Pages that should be static render dynamically. Reads that should be cached aren't. Clients poll, media downloads in full, logs are verbose, and nothing has a bound on it.

This mode is platform-agnostic. Identify the platform first, then use `references/audit/platforms.md` to learn which dimensions it meters.

## Focus keywords

| Focus word | Steps |
| --- | --- |
| `compute`, `cpu`, `functions`, `rendering`, `ssr` | 1, 2 |
| `cache`, `cdn` | 2 |
| `db`, `database`, `queries`, `supabase`, `postgres` | 3 |
| `storage`, `media`, `egress`, `images`, `video` | 4 |
| `polling`, `cron`, `jobs`, `queues` | 5 |
| `realtime`, `push`, `sw`, `websocket` | 6 |
| `ai`, `llm`, `tokens` | 7 |
| `logs`, `analytics`, `observability` | 8 |
| `frontend`, `bundle`, `perf`, `vitals` | 9 |
| `reliability`, `timeouts`, `retries`, `migrations` | 10 |
| `platform`, `limits`, `billing`, `spend` | 11 |
| a path | All applicable steps, limited to that path |

## Methodology

1. **Map the metered resources.** From SKILL.md Step 2 you know the platform. List what it bills or caps: function invocations, active CPU or duration, edge requests, bandwidth and egress, DB compute/rows/connections, storage GB, log ingestion, LLM tokens, image transformations, build minutes. Each finding must name the resource it burns.
2. **Find the multipliers.** For each hot path (home page, public detail pages, feeds, API routes hit by every page), work out *per page view* or *per user per hour*: function invocations, DB queries, rows returned, bytes egressed, log lines, tokens. Anything multiplied by bots, polling intervals, list length (N+1) or mounted components is where the bill comes from.
3. **Walk the steps** below that apply. Read the matching reference before reporting on an area.
4. **Quantify when you can.** "Polls `/api/pricing` every 5 s → 720 invocations per open tab per hour" beats "polling is wasteful". Use real numbers from the code (intervals, page sizes, limits). Label traffic assumptions as assumptions.
5. **Report** using the format below, then offer to write the guardrails into the project's `AGENTS.md`.

## Audit steps

1. **Rendering mode & server compute.** Public routes forced dynamic by `cookies()`/`headers()`/session reads in root layouts. Middleware that calls the auth or DB on every request, including anonymous ones. Server-side timers. Repeated auth/profile lookups. Heavy work on the request path.
2. **Caching & CDN.** Uncached hot reads, public APIs without `Cache-Control`/`s-maxage`, framework cache misuse, cache keys exploded by query strings or cookies, OG image routes rendering on every share.
3. **Database queries & connections.** `select *`, unpaginated lists, PostgREST's 1,000-row cap silently truncating jobs, N+1, missing indexes on filtered columns, per-request connections from serverless without a pooler, write-on-read hot rows.
4. **Storage, media & egress.** User media on a metered or low-cap host, uncompressed uploads, full-resolution media loaded for thumbnails or locked previews, `preload="auto"` video grids, missing immutable cache headers and `Range` support, orphaned objects, media-host AUP risk.
5. **Polling, background work & cron.** Client `setInterval` polling of slow-changing data, unauthenticated cron endpoints, unbounded fan-out jobs, retries without backoff, work that should be a queue.
6. **Service workers, push & realtime.** Push re-subscribe `POST` on every load, edge-cached `sw.js`, duplicate SW registration or update loops, unfiltered or never-closed realtime channels, anonymous realtime connections.
7. **AI / LLM spend.** No `max_tokens`, no per-user quotas, no prompt caching, the biggest model for trivial tasks, unbounded agent loops, regenerating embeddings, retries that multiply tokens, streams that keep billing after the client disconnects.
8. **Logging, analytics & observability.** Verbose logs in hot paths, full request and response bodies logged, view-count writes on every request including bots, presence heartbeats, unsampled tracing.
9. **Frontend weight & performance.** Large client bundles, client-side fetching waterfalls, unoptimised images and fonts, third-party scripts, `window.location.reload()` after mutations, Core Web Vitals regressions.
10. **Reliability & resilience.** Missing timeouts, retries without backoff and jitter, non-idempotent webhooks and jobs, non-resumable migrations, single-vendor hard dependencies, missing graceful degradation when a quota is hit.
11. **Platform limits & spend controls.** Spend caps and budget alerts are off, edge bundle near its size limit, function timeout or memory oversized, free-tier pause and commercial-use terms, dashboard-only config (crons, domains) that deploys will overwrite.

Cost abuse is where Audit meets Security. Expensive endpoints with no auth or rate limit (AI calls, uploads, email/SMS, image transforms, cron routes) are both a bill risk and a DDo$ vector. Report them here with their cost impact, and note that Security mode step 4 covers the abuse angle.

## Reference files

| Step | Read |
| --- | --- |
| 1–2 | `references/audit/compute-and-caching.md` |
| 3 | `references/audit/database.md` |
| 4 | `references/audit/storage-and-media.md` |
| 5–6 | `references/audit/background-and-realtime.md` |
| 7 | `references/audit/ai-spend.md` |
| 8 | `references/audit/logging-and-observability.md` |
| 9 | `references/audit/frontend-performance.md` |
| 10 | `references/audit/reliability.md` |
| 11 | `references/audit/platforms.md` |

## Impact rating

| Rating | Typical shape |
| --- | --- |
| Critical | Can take the app offline or produce an unbounded bill at current or plausible traffic. One bot crawl, one viral share or one malicious user is enough. Examples: unauthenticated AI endpoint, polling storm on every page, a quota that pauses the project. |
| High | Cost or load grows faster than traffic (N+1, fan-out, per-component duplicate fetches), or a free/low-tier cap will be hit with normal growth. |
| Medium | Waste proportional to traffic: a dynamic page that could be static, a missing cache header, `select *`. |
| Low | Hygiene and future-proofing. |

## Per-finding format

1. **Title and category:** e.g. "Root layout forces every public route dynamic (Rendering/Compute)".
2. **Location:** file and line(s), route or config key.
3. **Impact:** the rating, **the metered resource**, and the multiplier, e.g. "every anonymous page view → 1 function invocation + 1 Supabase auth call; ~40k/day at current traffic".
4. **Why it costs:** the mechanism, in one or two sentences.
5. **Fix:** before/after code or config.
6. **Verify:** how to confirm the fix worked: build output (`○` vs `ƒ`), response headers (`x-vercel-cache: HIT`, `cf-cache-status: HIT`), the network tab on an anonymous load, or a dashboard metric to watch.

### Example

#### High

**`src/app/layout.tsx:12`: `supabase.auth.getUser()` in root layout makes every route dynamic (Rendering/Compute)**

- **Impact:** High. Function invocations and active CPU, plus Supabase auth requests. Every public page (`/`, `/pricing`, `/blog/*`) renders on demand instead of from the CDN, so each anonymous view costs 1 invocation + 1 auth round-trip.
- **Why it costs:** reading cookies or session in the root layout opts the whole tree out of static rendering.
- **Fix:** move the session-dependent header into a client component, or into an authenticated sub-layout.

```tsx
// Before: src/app/layout.tsx
const { data: { user } } = await supabase.auth.getUser()
return <html><body><Header user={user} />{children}</body></html>

// After: layout stays static; the header resolves the session on the client
return <html><body><HeaderClient />{children}</body></html>
```

- **Verify:** `next build` lists `/`, `/pricing` and `/blog/[slug]` as `○` or `●`, not `ƒ`.

## Pre-ship verification checklist

Adapt to the stack. Skip lines that don't apply.

1. **Route classification:** the production build shows public routes as static or ISR, not dynamic (Next.js `○`/`●` vs `ƒ`; Nuxt/SvelteKit/Astro prerender output).
2. **Edge bundle size:** the compressed worker or edge-function bundle is comfortably under the plan limit. Check the platform's current limit.
3. **Anonymous network audit** (incognito, load `/` and a public detail page):
   - zero `POST` requests fired automatically on load
   - zero full-resolution media requests for locked, blurred or offscreen items
   - repeat requests to public pages, public APIs and OG images return CDN cache hits
   - `sw.js` is served with `max-age=0, must-revalidate`
4. **Abuse checks:** unauthenticated requests to cron, upload/delete, AI and email/SMS endpoints return `401`/`403`.
5. **Bounds:** every outbound call has a timeout, every list query has a limit, every LLM call has `max_tokens`, and every agent loop has an iteration cap.
6. **Spend controls:** budget alerts or hard caps are set on hosting, database, storage and AI providers.
7. **Static analysis:** type-check and lint pass.

## Guardrails file (offer after the report)

The audit's guardrails are most useful as standing rules the user's agent follows on every change. After reporting, offer to write the rules **that apply to this stack** into the project's `AGENTS.md`, or whichever instructions file the project already uses (`CLAUDE.md`, `.cursorrules`, `GEMINI.md`). Take them from the references for the steps that had findings, plus the pre-ship checklist, rewritten for the detected framework and platform. Only write it after the user agrees. Merge into an existing file rather than overwriting it.
