# Frontend Weight & Performance

Metered resources: bandwidth, function invocations triggered by client fetching, and image-optimisation quota. Users pay too: Core Web Vitals (LCP, INP, CLS) affect conversion and SEO.

## 1. Ship less JavaScript

- Check the build's bundle report (`next build` route sizes, `vite build` + `rollup-plugin-visualizer`, `source-map-explorer`). Flag heavy client dependencies imported into shared layouts: charting, date (moment), lodash (non-modular), icon packs imported whole, editors, maps, PDF libraries.
- Next.js: `'use client'` at the top of a large tree pulls everything below it into the client bundle. Push client boundaries down to the interactive leaves.
- Lazy-load below-the-fold and rarely used widgets (`next/dynamic`, `React.lazy`, `import()`).
- Prefer platform features over libraries: `<input type="date">`, `<dialog>`, CSS scroll-snap, `Intl` for formatting.

## 2. Fetch on the server, once

- Client-side fetching waterfalls (component A fetches, then renders B which fetches…) multiply round-trips and function invocations. Fetch in parallel on the server, or in a route loader.
- The same data fetched by multiple components: dedupe through a query cache (TanStack Query, SWR) or server-side request memoisation.

## 3. Images & fonts

- Use the framework image component or responsive `srcset`/`sizes`, modern formats, and explicit width and height to prevent CLS. Use `priority`/`fetchpriority="high"` only on the LCP image.
- Self-host fonts or use the framework's font loader, subset them, and use `font-display: swap`. Limit families and weights.

## 4. Third-party scripts

Tag managers, chat widgets, A/B tools and multiple analytics SDKs are often the biggest JS cost. Load them after interaction or idle (`strategy="lazyOnload"`, Partytown), and remove duplicates.

## 5. Interaction & navigation

- No `window.location.reload()` after mutations. Update local state.
- Avoid re-render storms: context providers holding fast-changing values at the root, or unmemoised large lists. Virtualise lists longer than a few hundred rows.
- Prefetching: framework link prefetch on viewport for large link grids can generate many requests and function calls. Disable it or make it hover-only for big lists of dynamic routes.

## Finding checklist

| Check | Typical impact |
| --- | --- |
| Heavy library in the shared layout / root client boundary | Medium–High |
| Client fetch waterfalls on key pages | Medium |
| Viewport prefetch across large grids of dynamic routes | Medium–High (function invocations) |
| Unsized or unoptimised hero images (LCP/CLS) | Medium |
| Many third-party scripts loaded eagerly | Medium |
| Full page reload after mutations | Medium |
