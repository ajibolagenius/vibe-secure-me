# Benchmark suite

A corpus of known-vulnerable and known-correct code used to measure whether changes to `SKILL.md` and its references actually improve the skill — and, just as importantly, whether they make it noisier.

## Why control cases matter

A security auditor that flags everything scores perfect recall and is useless. Half the value of this corpus is the **control** cases: code that superficially resembles a vulnerability but is correctly written — `dangerouslySetInnerHTML` with sanitization already applied, an allowlisted column name interpolated into SQL, the Supabase anon key exposed client-side by design. Reporting a finding on one of those is a false positive and counts against the skill.

The remediated (`fixed.*`) variant of every detect case is scored the same way.

## Layout

```
tests/
├── cases.json          the corpus manifest — metadata and expectations
├── run.js              validator, worklist generator, and scorer
└── cases/<id>/
    ├── vulnerable.*    detect cases only: contains the flaw
    └── fixed.*         the correct version; must draw no finding
```

Each case records the audit step it exercises, its CWE and OWASP mapping, expected severity, and a one-line `expect` describing the finding.

## Running it

**Validate the corpus** — deterministic, runs in CI:

```bash
node tests/run.js validate
```

Checks that every case has its files, that metadata is well-formed, and that no case directory is missing from `cases.json`. An unlisted directory would be silently skipped by every eval run, so it's treated as an error.

**Score a run** — requires an agent:

```bash
node tests/run.js manifest > worklist.json
# audit each path with the skill enabled, then record the outcomes
node tests/run.js score results.json
```

`manifest` deliberately withholds the `expect` text. An agent that can read the expected finding isn't being measured on detection.

`results.json` takes the shape:

```json
{
  "results": [
    { "id": "sql-injection-concat", "variant": "vulnerable", "reported": true },
    { "id": "sql-injection-concat", "variant": "fixed", "reported": false },
    { "id": "control-sanitized-html", "variant": "fixed", "reported": false }
  ]
}
```

`reported` is whether the audit raised a finding for that file at Medium or above. Scoring prints recall and false-positive rate, lists every miss and false positive, and exits non-zero if either is non-empty.

CI validates corpus integrity only. Scoring detection quality means running a real agent over ~36 files, which needs model access and is not deterministic — run it locally before a release, or wire it into a scheduled job with its own credentials.

## Adding a case

1. Create `tests/cases/<id>/` with a `vulnerable.*` and a `fixed.*` (or just `fixed.*` for a control case).
2. Add the entry to `cases.json`.
3. Run `node tests/run.js validate`.

Keep fixtures short and single-issue — the point is to isolate one finding, not to build a realistic application. A fixture that contains two vulnerabilities makes a miss ambiguous.

Prefer adding a control case alongside any new detect case that relies on a pattern-matchable signal. `dangerouslySetInnerHTML`, string-formatted SQL, and `NEXT_PUBLIC_` prefixes all have legitimate uses, and the corpus should say so.
