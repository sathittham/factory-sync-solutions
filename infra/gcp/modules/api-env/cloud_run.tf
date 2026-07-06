# The Go API on Cloud Run. One service per environment (separate projects).
# The api-gateway Worker proxies to this service's *.run.app URL.
resource "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL" # public *.run.app; Worker + Firebase Auth gate access

  template {
    service_account = data.google_service_account.runtime.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.api_image

      env {
        name  = "DOMAIN_EVENT_MODE"
        value = var.domain_event_mode
      }

      # Secret-backed env vars (Turnstile, R2, etc.) use Secret Manager:
      #   env { name = "X"; value_source { secret_key_ref { secret = ..., version = "latest" } } }
      # Never put secret values in .tf/.tfvars.
    }
  }

  # CI redeploys with a new image tag; don't let Terraform revert the live revision.
  # Runtime env vars (incl. secrets: R2/Turnstile/Resend/Slack/GA4 creds) are set
  # out-of-band by the deploy pipeline and Secret Manager, NOT here — never commit
  # secret values to .tf. Ignore env drift so `plan` stays empty; migrating these
  # to value_source.secret_key_ref is a tracked follow-up.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[0].env,
      # Autoscaling is managed via template.scaling (min/max). The service-level
      # scaling block is auto-populated on import with zero-value defaults; leave
      # it as-is instead of fighting it.
      scaling,
      client,
      client_version,
    ]
  }
}
