# AI / LLM Spend

Metered resources: input and output tokens (output is usually priced several times higher than input), cached-input tokens, image and audio generation, embeddings, vector DB storage and queries, and GPU time.

An AI feature with no bounds is the fastest way to turn one user, bot or bug into a four-figure bill. Security mode covers key exposure and prompt injection; this file covers cost.

## 1. Bound every call

- Set `max_tokens` (or `max_output_tokens`) on every request, sized to the feature. Unset means the model's maximum.
- Cap input size: truncate or summarise long histories, limit uploaded document size and page count, and cap retrieval to the top-k chunks.
- **Agent loops:** cap iterations, tool calls, total tokens and wall-clock time per task. Add a per-task budget that aborts the loop. Recursive or self-calling agents need a depth limit.

## 2. Quotas per user, per plan

- Track tokens or requests per user (DB or Redis), and enforce daily and monthly caps by plan **server-side** before calling the provider.
- Rate-limit AI endpoints per user and IP. An unauthenticated AI endpoint is Critical (Security step 4 / DDo$).
- Set **hard spend limits and alerts** in every provider console (OpenAI, Anthropic, Google, Azure, Bedrock). They lag, so they're a backstop, not the control.

## 3. Use the cheapest thing that works

- Route by task: a small or fast model for classification, extraction, routing and short summaries; a frontier model only where quality demands it. Using the largest model for everything is a finding when the task is simple.
- **Prompt caching:** long, stable prefixes (system prompt, tool definitions, documents reused across turns) should be structured cache-first so they're billed at the cached rate. Most providers support it, either automatically or with explicit cache markers. Put volatile content last.
- **Batch APIs** (typically ~50% cheaper) for anything non-interactive: backfills, nightly summaries, evals.
- Cache full responses for identical or deterministic requests (same prompt and params), and cache embeddings by content hash. Never re-embed unchanged documents on every deploy or sync.

## 4. Don't pay twice

- **Retries:** retry only on retryable errors (429, 5xx, timeouts), with backoff and a max attempt count. Don't retry on 400s or content-filter errors. SDK retries plus your own retry loop multiply each other.
- **Client disconnects:** when the user navigates away mid-stream, abort the upstream request (`AbortController` tied to the request signal). Otherwise generation continues and bills.
- **Double invocation:** React Strict Mode double effects, duplicate submit clicks, and both `onChange` and `onBlur` triggering completions. Debounce, and make generation idempotent per request ID.
- Regenerating on every render or navigation, instead of storing the result.

## 5. Watch hidden multipliers

- Chat history: sending the full conversation every turn grows cost quadratically. Summarise or window it.
- Tool definitions and large system prompts are resent on every call. Keep them lean, and cache them.
- Reasoning or "thinking" tokens are billed as output on many models. Set a thinking budget where the API supports one, and don't enable extended reasoning for trivial tasks.
- Image, audio and video generation costs are per asset. Cap counts and resolutions per request and per user.

## 6. Observe

Log tokens in and out, cached tokens, model, latency and cost estimate per request, tagged by user and feature, without logging prompt content containing PII. Alert on spend per hour.

## Finding checklist

| Check | Typical impact |
| --- | --- |
| AI endpoint without auth or rate limit | Critical |
| No per-user quota | High |
| Agent loop without iteration, token or time cap | High–Critical |
| No `max_tokens` | Medium–High |
| Upstream not aborted on client disconnect | Medium |
| Large stable prompt prefix not cached | Medium |
| Frontier model used for trivial classification or extraction | Medium |
| Embeddings recomputed for unchanged content | Medium–High |
| Retries stacked (SDK + custom) or on non-retryable errors | Medium |
