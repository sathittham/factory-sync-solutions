# Infrastructure

Repository-owned infrastructure configuration for FactorySync Solutions.

This directory contains platform deployables and operational configuration that
are not product applications:

- Cloudflare Workers (`cloudflare/workers/`)
- Cloudflare Terraform — R2 buckets, Access, DNS ownership (`cloudflare/terraform/`)
- Cloudflare R2 bucket/domain notes (`cloudflare/r2/`, `cloudflare/domains.md`)
- GCP Terraform — Cloud Run, Firestore, Pub/Sub, IAM (`gcp/`)

## Infrastructure as Code

The IaC tool is **OpenTofu** (`tofu`) — the config uses standard `terraform {}`
HCL blocks, so it's portable, but run everything with `tofu`. Provider
`.terraform.lock.hcl` files are committed for reproducible versions.

| Resource | Tool | Location |
|---|---|---|
| API gateway / CMS Workers | Wrangler (`wrangler.toml`) | `cloudflare/workers/`, `apps/web-cms/` |
| Cloud Run, Firestore, Pub/Sub, IAM | OpenTofu | `gcp/envs/{staging,production}/` |
| R2 buckets, Access, DNS | OpenTofu | `cloudflare/terraform/` |
| Firestore rules & indexes | Firebase CLI | repo root (`firestore.*`) |
| Frontend hosting | Cloudflare Pages | dashboard / CI |

**Environments.** Staging and production are **separate GCP projects**, so GCP is
split into `gcp/envs/staging` and `gcp/envs/production` — each with its own state
and its own isolated Firestore/Pub/Sub/SA — sharing one `gcp/modules/api-env`.
Cloudflare is a **single account + single zone**, so both envs' R2 buckets and the
prod Access app live in one `cloudflare/terraform` state (splitting it would make
two states fight over the shared zone's DNS).

The Terraform is **import-first**: the resources already exist, so import onto the
live infra and reconcile to an empty `plan` before applying. No relational
database (Cloud SQL) is used — the datastore is Firestore, plus Cloudflare D1 for
the CMS.

Product apps stay under `apps/`. Backend business logic stays in
`apps/backend`.
