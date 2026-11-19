# Rendering, Server Compute & Caching

Metered resources: function invocations, active CPU or duration (GB-s), edge requests, and origin bandwidth. The aim is for anonymous traffic to be served from the CDN, with zero function or DB work for most requests.

## 1. Keep public routes static

Reading request-specific data high in the tree opts every page below it into on-demand rendering.

| Framework | What makes a route dynamic | Keep it static by |
| --- | --- | --- |
| Next.js App Router | `cookies()`, `headers()`, `draftMode()`, `searchParams`, `auth.getUser()` / session reads, `fetch(..., { cache: 'no-store' })`, `export const dynamic = 'force-dynamic'` in a layout | Moving session UI into client components or authenticated sub-layouts. `generateStaticParams` + `revalidate` for detail pages. Check the build output: `○`/`●` good, `ƒ` dynamic. |
| Next.js Pages Router | `getServerSideProps` on public pages | `getStaticProps` + `revalidate` (ISR) |
| Nuxt | SSR everywhere by default | `routeRules: { '/': { prerender: true }, '/blog/**': { isr: 3600 } }` |
| SvelteKit | Default SSR | `export const prerender = true`, or adapter ISR config |
| Remix / React Router 7 | Loaders run on every request | `Cache-Control` headers from loaders, prerender config for static routes |
| Astro | `output: 'server'` | `output: 'static'` (or hybrid) with `export const prerender = true` on public pages |

**Finding pattern:** a root layout or global shell (header, nav, role banner) that reads the session. One component makes the whole site dynamic. Public pages to protect: home, marketing, pricing, legal, login/register, blog/docs, public profiles and listings, offline page.

## 2. Fast-path anonymous middleware

Middleware or edge functions that run on every request should do **no network I/O** for anonymous visitors on public routes.

```ts
// middleware.ts / proxy.ts
export async function middleware(req: NextRequest) {
  const hasSession = req.cookies.getAll().some(c => c.name.startsWith('sb-'))   // or your auth cookie
  if (!hasSession && !isProtected(req.nextUrl.pathname)) return NextResponse.next() // zero I/O
  // only now refresh the session / call the auth provider
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|webp|css|js)$).*)'] }
```

Also flag middleware `matcher`s that include static assets, images and `_next/*`. Middleware is a performance layer, not an authorization layer (see Security mode, threat-intel CVE-2025-29927).

## 3. Deduplicate auth & profile reads

- One single-flight helper for browser session and role lookup: check the local session first, cache the role and profile in memory per user, and invalidate on auth state change. Multiple mounted components each calling `getUser()` or querying `profiles` on every navigation is a multiplier.
- Server side: wrap per-request lookups in React `cache()` (or the framework's request-scoped memo) so a layout, page and components share one query.

## 4. Cache hot reads

| Layer | Use for | Examples |
| --- | --- | --- |
| CDN / HTTP | Public pages, public GET APIs, OG images, media | `Cache-Control: public, s-maxage=600, stale-while-revalidate=86400` |
| Framework data cache | Repeated SSR queries shared across users | Next `revalidate`, `unstable_cache(fn, keys, { revalidate, tags })` / `'use cache'` + `cacheLife`, Nuxt `cachedFunction`, SvelteKit `setHeaders` |
| Request memo | Same query repeated within one render | React `cache()` |
| Durable edge KV | Cross-isolate/region persistence on Workers | Cloudflare KV, Cache API, R2-backed caches, Durable Objects |

- **Public API routes and OG image routes must set `s-maxage`.** Without it, every request (and every link unfurl) hits a function.
- Cache keys: query strings (`utm_*`, `fbclid`), `Vary: Cookie` or per-user headers on public responses split the cache into near-zero hit rates. Normalise or strip them.
- In-memory caches (`new Map()` at module scope) don't survive across serverless instances or isolates. Treat them as best-effort only, and never as the main cache on Workers or Lambda.
- Invalidate on mutation (`revalidateTag`, `revalidatePath`, purge API) instead of using short TTLs everywhere.
- **Never cache personalised or authenticated responses publicly.** That is a data leak (cache poisoning / deception). Use `private, no-store` for them.

## 5. Eliminate server-side timers and long work on the request path

- No `setInterval` / `setTimeout` loops in serverless or edge runtimes. They either die with the instance or keep it billing. Use the platform's cron or queues.
- Move slow work (emails, image processing, webhooks fan-out, AI calls) off the request path into a queue or background function (`waitUntil`/`after()` for small fire-and-forget work, a real queue for anything that must complete).
- Oversized function memory or timeout raises cost per invocation. Flag `maxDuration` set to the maximum "just in case" on routes that should finish in milliseconds.

## 6. Throttle write-on-read

- View and impression counters: skip bots and crawlers (`User-Agent` check, or the platform's bot signal), batch or aggregate (increment in KV or Redis, flush periodically), or use an analytics service rather than a DB write per view.
- `last_active_at` / presence: update at most once per N minutes per user (≥ 5 min), checked client-side **and** server-side.

## 7. Mutations

- Never `window.location.reload()` or full `router.refresh()` the world after a mutation. Update local state optimistically or re-fetch the affected slice. A reload re-runs every server render and data fetch on the page.

## Finding checklist

| Check | Typical impact |
| --- | --- |
| Session read in root layout / global shell → all public routes dynamic | High |
| Middleware calls auth/DB for anonymous requests | High |
| Public GET API or OG route without `s-maxage` | Medium–High (scales with shares and crawlers) |
| Same auth/profile query from multiple components per navigation | Medium–High |
| Server `setInterval` in a serverless/edge runtime | High |
| View-count DB write on every request, bots included | Medium–High |
| Public responses vary on cookies, or cache keys include tracking params | Medium |
| Authenticated response cached publicly | Critical (data leak, report it in Security mode too) |
