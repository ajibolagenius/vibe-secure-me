# Database Queries, Connections & Migrations

Metered resources: DB compute (CPU or compute units), egress and bandwidth, rows read and written (PlanetScale, Turso, Firestore document reads), connection limits, storage, and log ingestion.

## 1. Select only what the UI needs

- `select('*')` / `SELECT *` / ORM `findMany()` without `select` on wide tables returns more bytes than needed. That costs egress, and it can leak private columns to the client, which is a security issue too.
- Firestore bills per **document read**: avoid reading whole collections to count or filter client-side. Use `count()` aggregation queries and indexed `where` filters.

## 2. Always bound and paginate

- **Supabase / PostgREST returns at most 1,000 rows per request by default.** Exports, admin tallies, migrations and "process all users" jobs that don't paginate are *silently truncated*, which is a correctness bug as well as a cost one. Paginate with `.range(from, to)`, or count with `{ count: 'exact', head: true }`.
- Every list endpoint needs a `limit` with a server-side max. Unbounded `?limit=100000` is a cost and DoS vector.
- Prefer keyset (cursor) pagination over large `OFFSET`s on big tables.

## 3. N+1 and fan-out

```ts
// BAD: 1 + N queries per page view
const posts = await db.post.findMany({ take: 20 })
for (const p of posts) p.author = await db.user.findUnique({ where: { id: p.authorId } })

// GOOD: one query (join/include), or one batched IN query
const posts = await db.post.findMany({ take: 20, include: { author: { select: { name: true, avatarUrl: true } } } })
```

Also look for `Promise.all(items.map(fetchDetail))` against the DB or an API, GraphQL resolvers without DataLoader, and Supabase calls inside `.map()` in components.

## 4. Indexes

Columns used in `WHERE`, `ORDER BY`, `JOIN` and RLS policy predicates (`user_id = auth.uid()`) need indexes. An RLS predicate without an index turns every query into a full scan. Check migrations for indexes on foreign keys and RLS columns. Wrap `auth.uid()` as `(select auth.uid())` in Supabase policies so it is evaluated once per query, not per row.

## 5. Connections from serverless

- Each serverless instance opening its own Postgres connection exhausts `max_connections` under bursts. Use a pooler: Supabase Supavisor (transaction mode, port 6543), PgBouncer, Neon's pooled endpoint or serverless driver, Prisma Accelerate, Hyperdrive on Cloudflare.
- Transaction-mode poolers don't support session features (prepared statements in some drivers, `SET`, advisory locks held across queries). Configure the ORM accordingly (e.g. `pgbouncer=true` / `prepare: false`).
- Create the client once per instance at module scope, not inside the handler.

## 6. Hot rows & write amplification

- Counters on a single row (`UPDATE posts SET views = views + 1`) under load cause lock contention and WAL and log volume. Batch, shard counters, or aggregate elsewhere.
- Triggers that write audit rows on every update of frequently-updated columns (`last_active_at`) multiply writes.

## 7. Realtime & change feeds

Covered in `references/audit/background-and-realtime.md`. Unfiltered table subscriptions push every change to every client.

## 8. Migrations & batch scripts

- **Idempotent and resumable:** safe to re-run after a crash halfway through. Use `IF NOT EXISTS`, upserts, and processed-markers or cursors.
- `--dry-run` support for data and storage migrations.
- Ordering for moves: write to the target, update the DB reference, and **only then** delete the source.
- Retry transient network errors with backoff. Don't abort a 3-hour job on one `ECONNRESET`.
- Large backfills run in batches with pauses so production traffic isn't starved.

## Finding checklist

| Check | Typical impact |
| --- | --- |
| Batch job or export relying on unpaginated Supabase/PostgREST select (truncates at 1,000) | High (silent data bug) |
| N+1 queries on a hot public page | High |
| No pooler for Postgres from serverless functions | High under bursts |
| `select *` on public pages or wide tables | Medium (plus a possible data leak) |
| Missing index on RLS or filter column | Medium–High as data grows |
| List endpoint without a server-side max limit | Medium |
| Non-idempotent / non-resumable migration script | Medium–High |
