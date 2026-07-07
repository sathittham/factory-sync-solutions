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

      # Runtime env vars (incl. secrets) are set by the deploy workflow's
      # `gcloud run deploy --set-env-vars` / `--set-secrets`, not here — so `env`
      # is ignored below. Secret-backed vars point at Secret Manager entries whose
      # containers are managed in secrets.tf. Never inline secret values in .tf.
    }
  }

  # CI redeploys with a new image tag and re-sets env/secrets on every deploy;
  # don't let Terraform revert the live revision. `env` stays ignored because the
  # deploy pipeline owns it — Terraform's role in the Secret Manager migration is
  # the secret containers + IAM (secrets.tf), not the service's env block. See
  # docs/operations/secret-manager-migration.md.
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
