#!/usr/bin/env node
// vibe-secure-me installer. Zero dependencies, Node >= 18.
//
//   npx vibe-secure-me install             install for the current user
//   npx vibe-secure-me install --project   install into ./.claude/skills
//   npx vibe-secure-me uninstall
//   npx vibe-secure-me verify              check the payload is well-formed

import { cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKILL_NAME = 'secure-me'
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_SOURCE = join(PACKAGE_ROOT, 'skills', SKILL_NAME)

const color = process.stdout.isTTY && !process.env.NO_COLOR
const style = (code, s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s)
const bold = (s) => style(1, s)
const dim = (s) => style(2, s)
const green = (s) => style(32, s)
const red = (s) => style(31, s)
const yellow = (s) => style(33, s)

function targetDir(flags) {
  if (flags.dir) return resolve(flags.dir, SKILL_NAME)
  if (flags.project) return resolve(process.cwd(), '.claude', 'skills', SKILL_NAME)
  return join(homedir(), '.claude', 'skills', SKILL_NAME)
}

function parseArgs(argv) {
  const flags = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--project') flags.project = true
    else if (arg === '--force' || arg === '-f') flags.force = true
    else if (arg === '--dir') flags.dir = argv[++i]
    else if (arg === '--help' || arg === '-h') flags.help = true
    else positional.push(arg)
  }
  return { command: positional[0], flags }
}

// Fails loudly if the published package is missing pieces, so a broken
// release surfaces at install time instead of mid-audit.
async function verifyPayload() {
  const problems = []
  const required = [
    join('skills', SKILL_NAME, 'SKILL.md'),
    join('skills', SKILL_NAME, 'references', 'security', 'index.md'),
    join('skills', SKILL_NAME, 'references', 'audit', 'index.md'),
    join('.claude-plugin', 'plugin.json'),
    'plugin.json',
  ]
  for (const entry of required) {
    if (!existsSync(join(PACKAGE_ROOT, entry))) problems.push(`missing ${entry}`)
  }
  if (problems.length) return problems

  const skill = await readFile(join(SKILL_SOURCE, 'SKILL.md'), 'utf8')
  if (!skill.startsWith('---')) problems.push('SKILL.md has no YAML frontmatter')
  const frontmatter = skill.slice(0, skill.indexOf('\n---', 3) + 1)
  if (!new RegExp(`^name:\\s*${SKILL_NAME}\\s*$`, 'm').test(frontmatter)) {
    problems.push(`SKILL.md frontmatter is missing \`name: ${SKILL_NAME}\``)
  }
  if (!/^description:\s*\S/m.test(frontmatter)) problems.push('SKILL.md frontmatter is missing `description`')

  const markdown = await listReferences()
  if (!markdown.length) problems.push('references/ contains no markdown files')

  // Every references/<path>.md linked from SKILL.md or another reference must
  // exist, and every reference must be linked from somewhere — an unlinked
  // file is never read by the agent.
  const sources = [['SKILL.md', skill]]
  for (const f of markdown) sources.push([`references/${f}`, await readFile(join(SKILL_SOURCE, 'references', f), 'utf8')])
  const linked = new Set()
  for (const [from, text] of sources) {
    for (const match of text.matchAll(/references\/([a-z0-9/-]+\.md)/g)) {
      if (!markdown.includes(match[1])) problems.push(`${from} links references/${match[1]}, which does not exist`)
      if (from !== `references/${match[1]}`) linked.add(match[1])
    }
  }
  for (const f of markdown) {
    if (!linked.has(f)) problems.push(`references/${f} is not linked from SKILL.md or any other reference`)
  }
  return problems
}

async function listReferences() {
  const entries = await readdir(join(SKILL_SOURCE, 'references'), { recursive: true })
  return entries.filter((f) => f.endsWith('.md')).map((f) => f.split(sep).join('/'))
}

async function install(flags) {
  const dest = targetDir(flags)

  if (existsSync(dest) && !flags.force) {
    console.error(red(`${dest} already exists.`))
    console.error(`Re-run with ${bold('--force')} to overwrite it.`)
    process.exit(1)
  }

  const problems = await verifyPayload()
  if (problems.length) {
    console.error(red('This package looks corrupt and was not installed:'))
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }

  await rm(dest, { recursive: true, force: true })
  await mkdir(dest, { recursive: true })
  await cp(join(SKILL_SOURCE, 'SKILL.md'), join(dest, 'SKILL.md'))
  await cp(join(SKILL_SOURCE, 'references'), join(dest, 'references'), { recursive: true })
  for (const extra of ['LICENSE', 'README.md']) {
    const from = join(PACKAGE_ROOT, extra)
    if (existsSync(from)) await cp(from, join(dest, extra))
  }

  console.log(green(`Installed ${bold(SKILL_NAME)} to ${dest}`))
  console.log(dim('Restart your AI assistant, then run /secure-me (or ask it to "check the security" or "audit costs" of this codebase).'))
}

async function uninstall(flags) {
  const dest = targetDir(flags)
  if (!existsSync(dest)) {
    console.log(yellow(`Nothing to remove at ${dest}`))
    return
  }
  await rm(dest, { recursive: true, force: true })
  console.log(green(`Removed ${dest}`))
}

function usage() {
  console.log(`${bold('vibe-secure-me')} — security + cost/quota audit skill for agentic AI assistants

${bold('Usage')}
  npx vibe-secure-me <command> [options]

${bold('Commands')}
  install      Copy the skill into a skills directory
  uninstall    Remove a previously installed copy
  verify       Check that the packaged skill is well-formed

${bold('Options')}
  --project    Target ./.claude/skills instead of ~/.claude/skills
  --dir <path> Target an explicit skills directory
  --force, -f  Overwrite an existing installation
  --help, -h   Show this message`)
}

const { command, flags } = parseArgs(process.argv.slice(2))

if (flags.help || !command) {
  usage()
  process.exit(flags.help ? 0 : 1)
}

switch (command) {
  case 'install':
    await install(flags)
    break
  case 'uninstall':
    await uninstall(flags)
    break
  case 'verify': {
    const problems = await verifyPayload()
    if (problems.length) {
      for (const p of problems) console.error(red(`  - ${p}`))
      process.exit(1)
    }
    const refs = await listReferences()
    const count = (mode) => refs.filter((f) => f.startsWith(`${mode}/`)).length
    const { size } = await stat(join(SKILL_SOURCE, 'SKILL.md'))
    console.log(green(`OK — SKILL.md (${size} bytes) + ${count('security')} security / ${count('audit')} audit references`))
    break
  }
  default:
    console.error(red(`Unknown command: ${command}`))
    usage()
    process.exit(1)
}
