terraform {
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }

  backend "gcs" {
    # bucket set via: terraform init -backend-config="bucket=<STAGING_PROJECT>-tfstate"
    prefix = "gcp/staging"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "api" {
  source = "../../modules/api-env"

  project_id        = var.project_id
  region            = var.region
  service_name      = "factory-sync-solutions-api-staging"
  api_image         = var.api_image
  domain_event_mode = "pubsub"
  min_instances     = 0
  max_instances     = 20

  consumer_service_name  = "factory-sync-solutions-domain-event-consumer-staging"
  consumer_image         = "asia-southeast3-docker.pkg.dev/factory-sync-solutions-staging/cloud-run/factory-sync-solutions-domain-event-consumer-staging:latest"
  consumer_min_instances = 1
  consumer_max_instances = 2

  # Secret Manager migration (item 1) — containers + runtime-SA accessor IAM.
  # Values seeded out-of-band; deploy workflow maps env→secret via --set-secrets.
  # See docs/operations/secret-manager-migration.md.
  runtime_secrets = [
    "cloudflare-api-token", # reused CF API token; backs Email Sending (replaces Resend)
    "resend-api-key",       # TODO: remove after CF email cutover is verified in prod
    "cf-turnstile-secret",
    "slack-webhook-registration",
    "slack-webhook-quiz-result",
    "r2-access-key-id",
    "r2-access-key-secret",
    "api-docs-r2-account-id",
    "api-docs-r2-access-key-id",
    "api-docs-r2-access-key-secret",
  ]
}

output "runtime_secret_ids" {
  description = "Secret Manager secret IDs managed for staging."
  value       = module.api.runtime_secret_ids
}
