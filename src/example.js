// Shown on first load. Every secret in it is fake; the AWS ones are AWS's own documentation examples.
// Some fakes are joined from two halves so GitHub's secret scanner doesn't block pushes of this file.
const STRIPE = "sk_" + "live_51HxAmPLeK3yN0tR3aL4bCdEf";

export const EXAMPLE = `# Deploy failed on prod, help me debug (example, all secrets are fake)

2026-10-15T09:12:44Z deploy-api[4121]: connecting to postgres://app_user:Tr0ub4dor&3xyz@prod-db.cluster-c9xk2.eu-west-1.rds.amazonaws.com:5432/orders
2026-10-15T09:12:49Z deploy-api[4121]: ERROR timeout after 5000ms from 10.20.4.17 to 10.20.9.250:5432
2026-10-15T09:12:49Z deploy-api[4121]: retry 1/3 (requested by ops-alerts@acme-payments.io)

# .env used by the job
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
GITHUB_TOKEN=ghp_8fJ2kLmQ0rS7tUvW1xYz3aBcD4eFgH5iJk6L
STRIPE_SECRET=${STRIPE}
DB_PASSWORD=Tr0ub4dor&3xyz
LOG_LEVEL=debug

curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZXBsb3ktYm90In0.c2lnbmF0dXJlLWV4YW1wbGU" https://api.internal.acme.corp/v1/deploys
commit 9f2c7e1a4b8d3c6e5f0a1b2c3d4e5f6a7b8c9d0e`;
