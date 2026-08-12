# Vibe Secure Me

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Vibe Secure Me** is a comprehensive, framework-agnostic security auditor skill designed for agentic AI assistants (like Claude, Gemini, Codex, and Cursor). It equips your AI coding assistant with the knowledge to audit codebases for common vulnerabilities introduced during "vibe-coding", as well as complex enterprise attack vectors across web, API, mobile, cloud, and AI platforms.

## Features

- **Automated Security Scanning Simulation:** Empowers your AI to act as a specialized security expert to review your architecture and code.
- **OWASP Alignment:** Maps to authoritative baselines including OWASP Top 10, API Security Top 10, Mobile Top 10, and LLM Applications Top 10.
- **Deep Architectural Review:** Guides the AI to look beyond surface-level issues to find broken access controls (BOLA/IDOR), business logic flaws, and race conditions.
- **Remediation Guidance:** Provides concrete secure-code remediation examples without outputting exploitative payloads.

## Installation

You can install this skill into your project so your AI assistant can access it.

**Method 1: Manual Drop-in (Works for any AI IDE / Agent)**
Copy the `SKILL.md` contents into your AI's custom instructions file (e.g., `.cursorrules`, `.windsurfrules`, `CLAUDE.md`, or your agent's system prompt).
Alternatively, clone this repository directly into your project's agent skills directory:
```bash
git clone https://github.com/ajibolagenius/vibe-secure-me.git .agent-skills/secure-me
```

**Method 2: Via npm (any agent)**
```bash
npx vibe-secure-me install
```
Installs into `~/.claude/skills/secure-me`. Use `--project` to install into `./.claude/skills` so the skill ships with a repository, `--dir <path>` to target another agent's skills directory, and `--force` to overwrite an existing copy. Remove it with `npx vibe-secure-me uninstall`.

**Method 3: Via curl (no Node required)**
```bash
curl -fsSL https://raw.githubusercontent.com/ajibolagenius/vibe-secure-me/main/install.sh | bash
```
Pin a release with `SECURE_ME_REF=v1.1.0`, or install into a project with `SECURE_ME_DIR=./.claude/skills`. An existing install is moved to a timestamped backup rather than overwritten.

**Method 4: Via Claude Code plugin**
```
/plugin marketplace add ajibolagenius/vibe-secure-me
/plugin install vibe-secure-me@vibe-secure-me
```
Updates then arrive through `/plugin update vibe-secure-me`.

**Method 5: Via Antigravity CLI**
If you are using Google Antigravity, you can install it directly as a plugin:
```bash
agy plugin install https://github.com/ajibolagenius/vibe-secure-me.git
```

## Usage

Once installed, simply ask your agent to run a security audit using the `secure-me` skill. For example:

- *"Run a security audit on this project using the `secure-me` skill."*
- *"Check the security of my authentication flow with `secure-me`."*
- *"Audit the new payment logic and ensure there are no business logic flaws."*

The agent will leverage the skill's comprehensive checklist to analyze your project's codebase, returning a prioritized list of findings ranging from Critical to Low severity.

## Repository layout

```
plugin.json                      Antigravity plugin manifest
.claude-plugin/                  Claude Code plugin + marketplace manifests
skills/secure-me/SKILL.md        Audit methodology, severity model, output format
skills/secure-me/references/     21 on-demand deep-dive references
bin/cli.js                       npm installer
install.sh                       curl installer
```

`SKILL.md` is what the agent loads when the skill triggers. The files under `references/` hold the detailed root causes and before/after remediation code, and are read on demand only for the areas an audit actually touches — that keeps the always-loaded footprint small while the depth stays available.

## Development

```bash
npm test                    # verify the packaged skill and the benchmark corpus
claude plugin validate .    # check the Claude Code manifests
```

### Benchmark suite

`tests/` holds a corpus of 16 known-vulnerable cases and 4 control cases — code that superficially resembles a vulnerability but is correctly written. Control cases matter as much as detection ones: an auditor that flags everything has perfect recall and no value, so a finding raised against a control case counts as a false positive.

```bash
node tests/run.js validate            # corpus integrity (runs in CI)
node tests/run.js manifest            # emit the audit worklist for an eval run
node tests/run.js score results.json  # recall and false-positive rate
```

CI validates corpus integrity only. Scoring detection quality requires running an agent over the fixtures — see [tests/README.md](tests/README.md).

CI runs both on every push, plus a version-agreement check across `package.json`, `plugin.json`, and `.claude-plugin/plugin.json` — bump all three together when releasing. `SKILL.md` carries its own independent content version.

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

When adding a reference file, link it from the reference table in `SKILL.md` — `node bin/cli.js verify` fails if `SKILL.md` links a file that doesn't exist, but nothing catches a file that exists and is never linked.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
