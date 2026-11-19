# CI/CD & Supply Chain Security

Baseline: **OWASP A03:2025 Software Supply Chain Failures**, **OWASP Top 10 CI/CD Security Risks**. For specific recent campaigns and their indicators, see `references/security/threat-intel.md`.

2025–2026 changed the threat: self-replicating npm worms (Shai-Hulud, ChainDrop) and pipeline compromises (TanStack, Trivy, Nx) mean one bad install or one misconfigured workflow can publish malware under *your* name, with valid provenance.

## GitHub Actions

### `pull_request_target` and other privileged triggers

`pull_request_target`, `workflow_run`, `issue_comment`, `issues` and `discussion` run in the **base repo's context**, with secrets and a write-capable token, but can be triggered by outsiders.

- Never check out and build or run PR head code in these workflows (`ref: ${{ github.event.pull_request.head.sha }}`). Newer `actions/checkout` blocks this by default; flag workflows that override it, or that use old pinned versions.
- Use `pull_request` for anything that builds or tests contributor code.
- **Cache poisoning:** a `pull_request_target` job running fork code can *write* to the base repo's Actions cache even with `permissions: read-all`. A later privileged release job restores the poisoned cache. This is how TanStack (May 2026) was compromised. Untrusted jobs must not save caches that release jobs restore. Don't use `actions/cache` or `setup-*` caching in release workflows, or key release caches so untrusted jobs can't produce them, and enable the repository cache-write restriction where available.

### Script injection

Never interpolate attacker-controlled context into `run:`. That includes PR/issue titles and bodies, `github.head_ref`, branch names, commit messages, file names, and comment text.

```yaml
# BAD
run: echo "Processing PR: ${{ github.event.pull_request.title }}"
# GOOD
env:
  PR_TITLE: ${{ github.event.pull_request.title }}
run: echo "Processing PR: $PR_TITLE"
```

The same applies to `actions/github-script` (`script:` with `${{ }}` inside JS).

### Token and permission scope

- Set top-level `permissions: contents: read` (or `{}`) and grant more per job only where needed.
- **OIDC / trusted publishing:** `id-token: write` lets *every step in that job* mint a publish or cloud token. Put publishing in its own minimal job, with no third-party actions, no dependency install from untrusted caches, and a protected `environment:` requiring approval. Restrict the trusted-publisher binding to that workflow file and environment.
- Cloud OIDC trust policies must pin `sub` to a specific repo **and** branch or environment, never `repo:org/*`.
- Don't expose secrets to steps that run third-party code (`npm install` with lifecycle scripts, test suites of PRs).

### Pinning & runners

- Pin third-party actions to a full commit SHA, with the version in a comment. Tags can be repointed (tj-actions, 2025).
- Self-hosted runners on public repos let any fork PR run code on your hardware. Check for unexpected runners. Shai-Hulud 2.0 registered its own (`SHA1HULUD`).

### AI agents in CI

LLM steps (issue triage, PR review, auto-fix bots) that read outsider-written text are prompt-injection entry points into a credentialed job. The Cline compromise (2026) went through an AI triage workflow. Give them read-only tokens, no secrets beyond the model key, and no write or publish capability reachable from model output. See `references/security/agentic-and-mcp.md` §6.

## Dependencies

### Install-time code execution

- `preinstall` / `install` / `postinstall` scripts are the worm delivery mechanism. Prefer `npm ci --ignore-scripts` in CI, then explicitly rebuild only allowlisted native packages. pnpm (v10+) blocks dependency build scripts unless listed in `onlyBuiltDependencies`; bun runs only `trustedDependencies`.
- **`binding.gyp` also executes at install** through node-gyp, even with no `scripts` field (Miasma, Jun 2026). Flag pure-JS packages that suddenly ship a `binding.gyp`.

### Release-age gating

Most malicious versions are detected and pulled within hours to days. A minimum release age blocks most worm waves for free. Recommend whichever setting the project's package manager supports: pnpm `minimumReleaseAge`, Yarn `npmMinimalAgeGate`, bun `minimumReleaseAge`. Or have Renovate/Dependabot delay updates with `minimumReleaseAge` / cooldown.

### Lockfiles & pinning

- Commit the lockfile and install with `npm ci` / `pnpm install --frozen-lockfile` / `yarn --immutable` in CI. A missing lockfile or `npm install` in CI is a finding.
- Ranges (`^`, `~`) are acceptable *with* a committed lockfile and gated updates. Without a lockfile they mean the next build pulls whatever was published last.

### Malicious and confused packages

- **Typosquatting:** names close to popular ones (`electorn`).
- **Slopsquatting:** packages that AI assistants hallucinate. Typo-distance checks miss them. For every recently added dependency, confirm the package exists, is the intended project, has real download history and a linked repo, and isn't brand-new.
- **Dependency confusion:** internal package names (`@company/*`, unscoped internal names) that resolve from the public registry. Scope internal packages, and map scopes to the private registry in `.npmrc`.
- **Protestware / maintainer takeover:** watch for a sudden new maintainer, major code changes in a patch release, or new network calls in a utility library.

### Known vulnerabilities

Run `npm audit` / `pnpm audit` / `osv-scanner` / `pip-audit` and check high-profile frameworks against `references/security/threat-intel.md`. Report reachable criticals, not every transitive low.

## Publishing (if the repo publishes packages)

- Publish only through CI with provenance or trusted publishing, never from laptops. Require 2FA for all maintainers, use granular publish tokens and revoke classic ones.
- **Provenance proves where a package was built, not that the build was clean.** TanStack's malicious versions carried valid provenance. The release job must still be isolated, as described above.

## Finding checklist

| Check | Typical severity |
| --- | --- |
| `pull_request_target` / `workflow_run` checking out and running PR code | Critical |
| `${{ github.event.* }}` attacker-controlled data inside `run:` | High/Critical |
| Release/publish job restores caches writable by untrusted jobs | High |
| `id-token: write` on a job running third-party code or installs | High |
| Third-party actions pinned to tags/branches | Medium |
| No lockfile, or `npm install` in CI | Medium |
| Install scripts allowed for all dependencies in CI with secrets present | Medium/High |
| Dependency matching a known-compromised version | Critical (rotate secrets) |
| Recently added dependency that doesn't exist or looks hallucinated | High |
