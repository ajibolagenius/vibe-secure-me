# Object Storage, Media & Egress

Metered resources: storage GB, egress and bandwidth (often the most expensive line), cached egress, image transformations, and Class A/B operations.

## 1. Put media on the right host

- **High-volume user media (images, video, audio) doesn't belong on capped or metered-egress tiers.** Examples are the Supabase Storage free/low tiers, Firebase Storage and S3 behind direct public URLs. Prefer **zero- or low-egress object storage behind a CDN on a custom domain**: Cloudflare R2 via `media.<domain>` (not the rate-limited `*.r2.dev` dev URL), Backblaze B2 + CDN, Bunny Storage, or S3 + CloudFront with caching.
- Keep BaaS storage for small private files.
- **Check the media host's Acceptable Use Policy before choosing it.** Some image and video platforms (e.g. Cloudinary) enforce content moderation and can block **both uploads and delivery** for an account on AUP violations, which breaks every asset in the app at once. For UGC or adult-adjacent content, use general-purpose object storage you control. A single-vendor media dependency with an AUP trigger is a reliability finding.

## 2. Shrink before upload

- Images: compress and resize client-side (WebP/AVIF, bounded width such as 1600–2048 px) before upload, plus generate thumbnails.
- Video: re-encode and cap (e.g. 720p H.264/AAC MP4) client-side with WebCodecs/ffmpeg.wasm, or server-side in a background job. Never serve raw phone uploads (4K HEVC, 100+ MB).
- Strip EXIF (also a privacy issue: GPS).

## 3. Don't download what isn't shown

- Locked, paywalled or blurred previews must **never** mount `<video>` or request full-resolution images. Render CSS placeholders, or tiny pre-blurred thumbnails generated at upload time. A blurred full-res image costs full egress, and the original is still downloadable, which is a security issue too.
- Video grids and feeds: poster images plus `preload="none"` or `preload="metadata"`, never `preload="auto"`. Play on interaction or on viewport entry.
- `loading="lazy"` and correct `sizes`/`srcset` on images. Don't serve a 2000 px image into a 200 px slot.
- Watch image-optimisation quotas (Vercel/Netlify/Cloudflare Images transformations). Unbounded `width` params or arbitrary remote sources can burn them. Restrict `remotePatterns` and allowed sizes.

## 4. Serve with long cache and Range support

- Uploaded objects are immutable. Use content-hashed or unique keys and `Cache-Control: public, max-age=31536000, immutable`. Replacing a file means a new key, not an overwrite.
- Video needs HTTP `Range` (`206 Partial Content`) for seeking. Without it, a seek re-downloads the whole file. A custom media proxy route must pass `Range` through. Better still, serve from the CDN directly and skip the function.
- **Don't proxy media through serverless functions.** That turns cheap CDN egress into function duration plus function bandwidth.

## 5. Lock down upload and delete (cost and security)

Every upload and delete endpoint, or signed-URL issuer, must:

- authenticate, and scope keys to the user (`media/<userId>/…`), or require an admin role
- validate the MIME type against an allowlist **and** sniff the content (don't trust `Content-Type`)
- enforce a hard byte cap on the actual body or the signed-URL policy (`content-length-range`), not just the `Content-Length` header
- reject path traversal (`..`, `\`, absolute paths, URL-encoded variants)
- rate-limit per user

An open upload endpoint becomes free hosting for someone else's files, at your egress rates. See Security mode step 12.

## 6. Replace and clean up safely

- **On replace: write the new URL to the DB first, then delete the old object best-effort.** Deleting first and then failing the DB write leaves the record pointing at nothing.
- Periodically list the bucket against DB references and prune orphans before hitting storage quotas. Do it as a dry run first and keep a grace period.
- Lifecycle rules for temp and upload-staging prefixes.

## Finding checklist

| Check | Typical impact |
| --- | --- |
| UGC video/images on a capped BaaS storage tier or a metered-egress origin | High–Critical (quota pause or bill) |
| Locked/blurred previews load full media; video grids `preload="auto"` | High |
| Media proxied through functions / no `Range` support | High |
| Upload endpoint without auth, size cap or MIME allowlist | Critical (abuse) |
| No compression or resizing before storage | Medium–High |
| Missing immutable cache headers on media | Medium |
| Media host with AUP-triggered account-wide blocking for UGC | Medium–High (reliability) |
| Delete-before-DB-write on replace; no orphan cleanup | Medium |
