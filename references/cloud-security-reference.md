# Cloud & Infrastructure Security Reference

Baseline: **Cloud provider Well-Architected frameworks**, **OWASP Top 10 CI/CD Security Risks**, **CIS Benchmarks**.

## 1. Public Storage Bucket Exposure (CWE-732)
- **Root cause:** Overly permissive bucket policies/ACLs (`Principal: *`, public-read), disabled Block Public Access.
- **Remediation:** Enable S3 Block Public Access; disable ACLs; least-privilege bucket policies scoped to specific ARNs; default encryption.

## 2. Overly Permissive IAM (CWE-269)
- **Root cause:** Wildcard actions/resources (`"Action":"*"`), broad managed policies, long-lived access keys.
- **Remediation:** Least privilege with resource-level scoping and conditions (source IP, tags, MFA); prefer roles/short-lived creds over static keys; regular access reviews.

## 3. Cloud SSRF / Metadata Service Exploitation (CWE-918)
- **Root cause:** App-layer SSRF plus reachable IMDSv1 (simple GET) retrieves instance role's temporary IAM credentials from `169.254.169.254`.
- **Remediation:** Enforce IMDSv2 (`HttpTokens: required`); set hop limit to 1; fix SSRF; least-privilege instance roles.

## 4. Kubernetes RBAC & Exposed Dashboards
- **Root cause:** `cluster-admin`/wildcard roles; default service-account token auto-mount; anonymous API access; exposed dashboard; no network policies; sensitive data in ConfigMaps.
- **Remediation:** Least-privilege RBAC (namespaced Roles); disable anonymous auth; network policies (default-deny); disable default SA token automount; store secrets in K8s Secrets (encrypted at rest).

## 5. Container Security — Images & Docker (CWE-1104)
- **Root cause:** Running as root; vulnerable/outdated base images; secrets baked into layers; excessive capabilities.
- **Remediation:** Minimal/distroless base images; non-root `USER`; drop capabilities; read-only root filesystem; runtime secret injection.

## 6. Serverless-Specific Risks
- **Root cause:** Over-scoped function execution roles; event-data injection; over-long timeouts; unvalidated event triggers.
- **Remediation:** One least-privilege role per function; validate/sanitize event payloads locally to prevent injection; secrets in a secret manager; strict concurrency and timeout limits (Denial of Wallet).

## 7. CI/CD Pipeline Security (OWASP Top 10 CI/CD)
- **Poisoned Pipeline Execution (PPE):** Prevent pipelines from executing unreviewed code from untrusted fork PRs with access to secrets. Require approvals.
- **Dependency Chain Abuse:** Defend against dependency confusion by configuring private registries securely and pinning actions to commit SHAs rather than mutable tags.
- **Insufficient PBAC:** Scope pipeline permissions; use OIDC for short-lived cloud credentials instead of stored long-lived keys.

## 8. IaC Misconfiguration Patterns
- **Root cause:** Insecure defaults propagated via modules (public buckets, wildcard IAM, unencrypted storage).
- **Remediation:** Scan IaC in CI as a merge gate (Checkov/Trivy); encrypt state in remote backends; no secrets in code/state.
