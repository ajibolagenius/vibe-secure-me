# Cloud & Infrastructure Security

## S3 Buckets and Object Storage
- **Block Public Access:** By default, new buckets should have "Block Public Access" turned on. If you need to serve public assets, ensure you only grant read access to specific paths, never list or write access.
- Avoid iterating over bucket objects indiscriminately in application code—attackers can flood a bucket to cause Denial of Wallet on iteration.

## Identity and Access Management (IAM)
- **Principle of Least Privilege:** Never use root credentials or give a service the `AdministratorAccess` policy. 
- Create distinct roles for each service (e.g., a role that can only write to a specific S3 bucket, not all buckets).
- Avoid wildcard resources `Resource: "*"` in IAM policies unless absolutely necessary.

```json
// BAD: Grants write access to ALL buckets
{
  "Effect": "Allow",
  "Action": "s3:PutObject",
  "Resource": "*"
}

// GOOD: Grants write access to a specific bucket path
{
  "Effect": "Allow",
  "Action": "s3:PutObject",
  "Resource": "arn:aws:s3:::my-app-uploads/user-data/*"
}
```

## Infrastructure as Code (Terraform, CloudFormation)
- **Do not hardcode secrets in your IaC templates.** Use a secret manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault) and reference those secrets dynamically.
- Store your Terraform state securely and ensure it is encrypted at rest. State files often contain plaintext secrets and database passwords.
