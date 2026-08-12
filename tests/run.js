#!/usr/bin/env node
// Benchmark harness for the secure-me skill.
//
//   node tests/run.js validate            check the corpus is well-formed (CI)
//   node tests/run.js manifest            emit the audit worklist for an eval run
//   node tests/run.js score results.json  score a completed eval run
//
// `validate` is deterministic and runs in CI. Scoring detection quality
// requires actually running an agent over the corpus, which CI does not do —
// see tests/README.md for the procedure.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const TESTS_DIR = dirname(fileURLToPath(import.meta.url))
const CASES_DIR = join(TESTS_DIR, 'cases')
const MAX_AUDIT_STEP = 19
const SEVERITIES = new Set(['critical', 'high', 'medium', 'low', 'info'])

const color = process.stdout.isTTY && !process.env.NO_COLOR
const style = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s)
const bold = (s) => style(1, s)
const green = (s) => style(32, s)
const red = (s) => style(31, s)
const dim = (s) => style(2, s)

const { cases } = JSON.parse(readFileSync(join(TESTS_DIR, 'cases.json'), 'utf8'))

function validate() {
  const problems = []
  const seen = new Set()

  for (const c of cases) {
    const where = c.id ?? '<case with no id>'
    if (!c.id) problems.push('a case is missing `id`')
    else if (seen.has(c.id)) problems.push(`${where}: duplicate id`)
    seen.add(c.id)

    if (c.kind !== 'detect' && c.kind !== 'control') {
      problems.push(`${where}: kind must be "detect" or "control"`)
    }
    if (!Number.isInteger(c.step) || c.step < 1 || c.step > MAX_AUDIT_STEP) {
      problems.push(`${where}: step must be an integer 1-${MAX_AUDIT_STEP}`)
    }
    if (!c.expect?.trim()) problems.push(`${where}: missing \`expect\``)

    const dir = join(CASES_DIR, c.id ?? '')
    if (!existsSync(dir)) {
      problems.push(`${where}: no directory at tests/cases/${c.id}`)
      continue
    }

    if (c.kind === 'detect') {
      if (!c.cwe?.match(/^CWE-\d+$/)) problems.push(`${where}: cwe must look like CWE-123`)
      if (!c.owasp?.trim()) problems.push(`${where}: detect cases need an \`owasp\` mapping`)
      if (!SEVERITIES.has(c.severity)) {
        problems.push(`${where}: severity must be one of ${[...SEVERITIES].join(', ')}`)
      }
      if (!c.vulnerable) problems.push(`${where}: detect cases need a \`vulnerable\` file`)
      else if (!existsSync(join(dir, c.vulnerable))) {
        problems.push(`${where}: missing ${c.vulnerable}`)
      }
    } else {
      // A control case asserts that correct code draws no finding, so a
      // vulnerable variant would contradict its purpose.
      if (c.vulnerable) problems.push(`${where}: control cases must not define \`vulnerable\``)
    }

    if (!c.fixed) problems.push(`${where}: missing \`fixed\``)
    else if (!existsSync(join(dir, c.fixed))) problems.push(`${where}: missing ${c.fixed}`)
  }

  // An unreferenced directory is silently excluded from every eval run.
  for (const dir of readdirSync(CASES_DIR, { withFileTypes: true })) {
    if (dir.isDirectory() && !seen.has(dir.name)) {
      problems.push(`tests/cases/${dir.name} is not listed in cases.json`)
    }
  }

  if (problems.length) {
    console.error(red(`Corpus invalid — ${problems.length} problem(s):`))
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }

  const detect = cases.filter((c) => c.kind === 'detect').length
  const control = cases.length - detect
  console.log(green(`Corpus OK — ${detect} detect + ${control} control cases`))
}

// The worklist deliberately withholds `expect`: an agent that can read the
// expected finding is not being measured on detection.
function manifest() {
  const items = []
  for (const c of cases) {
    if (c.vulnerable) {
      items.push({ id: c.id, variant: 'vulnerable', path: `tests/cases/${c.id}/${c.vulnerable}` })
    }
    items.push({ id: c.id, variant: 'fixed', path: `tests/cases/${c.id}/${c.fixed}` })
  }
  console.log(JSON.stringify({ items }, null, 2))
}

function score(resultsPath) {
  const { results } = JSON.parse(readFileSync(resolve(resultsPath), 'utf8'))
  const byId = new Map(cases.map((c) => [c.id, c]))
  const lookup = new Map(results.map((r) => [`${r.id}:${r.variant}`, r]))

  const missed = []
  const falsePositives = []
  const ungraded = []
  let detected = 0
  let expectedDetections = 0
  let cleanVariants = 0

  for (const c of cases) {
    if (c.kind === 'detect') {
      expectedDetections++
      const r = lookup.get(`${c.id}:vulnerable`)
      if (!r) ungraded.push(`${c.id}:vulnerable`)
      else if (r.reported) detected++
      else missed.push(c)
    }
    // Both the remediated variant of a detect case and every control case
    // must draw no finding.
    cleanVariants++
    const clean = lookup.get(`${c.id}:fixed`)
    if (!clean) ungraded.push(`${c.id}:fixed`)
    else if (clean.reported) falsePositives.push(c)
  }

  const pct = (n, d) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`)

  console.log(bold('\nsecure-me benchmark\n'))
  console.log(`  Recall           ${detected}/${expectedDetections}  ${pct(detected, expectedDetections)}`)
  console.log(
    `  False positives  ${falsePositives.length}/${cleanVariants}  ${pct(falsePositives.length, cleanVariants)}`
  )

  if (missed.length) {
    console.log(red(`\n  Missed (${missed.length}):`))
    for (const c of missed) console.log(`    ${c.id}  ${dim(`${c.cwe} — ${c.expect}`)}`)
  }
  if (falsePositives.length) {
    console.log(red(`\n  False positives (${falsePositives.length}):`))
    for (const c of falsePositives) console.log(`    ${c.id}  ${dim(c.expect)}`)
  }
  if (ungraded.length) {
    console.log(dim(`\n  Ungraded (${ungraded.length}): ${ungraded.slice(0, 8).join(', ')}`))
  }

  for (const r of results) {
    if (!byId.has(r.id)) console.log(dim(`\n  Unknown case id in results: ${r.id}`))
  }
  console.log()
  process.exit(missed.length || falsePositives.length ? 1 : 0)
}

const [command, arg] = process.argv.slice(2)

switch (command) {
  case undefined:
  case 'validate':
    validate()
    break
  case 'manifest':
    manifest()
    break
  case 'score':
    if (!arg) {
      console.error(red('score requires a results file: node tests/run.js score results.json'))
      process.exit(1)
    }
    score(arg)
    break
  default:
    console.error(red(`Unknown command: ${command}`))
    console.error('Usage: node tests/run.js [validate|manifest|score <results.json>]')
    process.exit(1)
}
