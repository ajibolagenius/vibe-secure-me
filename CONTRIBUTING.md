# Contributing to Vibe Secure Me

First off, thank you for considering contributing to Vibe Secure Me! It's people like you that make open source tools great.

## How to Contribute

### Reporting Bugs
If you find a security or audit check that is missing, or one that produces false positives, please open an issue describing:
- What you expected to happen.
- What actually happened.
- Details about your environment and codebase to reproduce the issue.

### Suggesting Enhancements
Have an idea for a new security check or an enhancement to the existing checklist? We'd love to hear it!
- Open an issue detailing your proposal.
- Explain the security concept and why it should be included.

### Pull Requests
1. Fork the repository and create your branch from `main`.
2. Make your changes to `SKILL.md` (mode routing), a mode playbook (`references/security/index.md`, `references/audit/index.md`), or a reference under `references/security/` or `references/audit/`. Link any new reference from its mode's `index.md`, and run `npm test`.
3. Ensure your documentation is clear, accurate, and follows the existing formatting (markdown).
4. Issue a pull request!

## Core Principles for Skill Contributions
- **Defensive Focus:** The skill is designed to find vulnerabilities and provide secure coding practices. We do **not** accept PRs that modify the skill to output working exploits or attack tooling.
- **Framework and platform agnostic:** Keep core rules framework-agnostic, and put stack- or platform-specific detail in references.
- **Date your facts:** CVEs, campaigns, quotas and prices go in `threat-intel.md` / `platforms.md` with an "as of" date, not in the playbooks.

Thank you!
