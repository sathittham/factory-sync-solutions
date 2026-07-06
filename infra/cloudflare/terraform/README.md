# Cloudflare Infrastructure (Terraform)

Codifies the Cloudflare account resources that Wrangler and Pages don't own:
R2 buckets + their public custom domains, and the Zero Trust Access app guarding
the production backoffice.

> **These resources already exist.** Import onto the running account; do not
> `apply` blind. Always `plan` first.

## What is / isn't managed here

| Managed | Not managed |
|---|---|
| R2 upload buckets + `cdn*` custom domains | Workers (Wrangler — `../workers/*/wrangler.toml`) |
| R2 api-docs buckets (private) | Pages projects + their custom domains |
| Access app + policy on `backoffice.*` | Most DNS records (owned by Pages/Wrangler/R2 — see `dns.tf`) |

## Prerequisites

```bash
export CLOUDFLARE_API_TOKEN=...   # Zone:DNS:Edit + Account:R2:Edit + Account:Access:Edit
cp terraform.tfvars.example terraform.tfvars   # fill in, stays gitignored
```

## First run — import existing resources

```bash
tofu init -backend-config="bucket=<PROJECT>-tfstate"

tofu import 'cloudflare_r2_bucket.uploads["prod"]'    <ACCOUNT_ID>/uploads-factorysyncsolutions-com
tofu import 'cloudflare_r2_bucket.uploads["staging"]' <ACCOUNT_ID>/uploads-factorysyncsolutions-com-staging
tofu import 'cloudflare_r2_bucket.apidoc["prod"]'     <ACCOUNT_ID>/apidoc-factorysyncsolutions-com
tofu import 'cloudflare_r2_bucket.apidoc["staging"]'  <ACCOUNT_ID>/apidoc-factorysyncsolutions-com-staging
# R2 custom domains + Access app/policy: see `tofu import -help` for the
# id format of your installed provider version, then import each.

tofu plan   # iterate the .tf until the plan is empty
```

Iterate until `tofu plan` shows **no changes**, proving the code matches the
live account. Only then is `apply` safe for future edits.

## Version note

Written and validated against the Cloudflare provider **v5** (`~> 5.0`, verified
on v5.21.1). In v5, Access policies are decoupled account-level resources; the
application attaches them by reference via its `policies` list (see `access.tf`).
If your lockfile pins v4, upgrade or rewrite the `cloudflare_zero_trust_access_*`
resources to the v4 schema (policies had `application_id` there).
