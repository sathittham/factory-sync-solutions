# The domain-event consumer on Cloud Run — a pull-based worker that drains the
# factory-sync-domain-events subscription (DOMAIN_EVENT_MODE=pubsub). One service
# per environment, runs as the same shared deployer runtime SA as the API.
resource "google_cloud_run_v2_service" "consumer" {
  project  = var.project_id
  name     = var.consumer_service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = data.google_service_account.runtime.email

    scaling {
      min_instance_count = var.consumer_min_instances
      max_instance_count = var.consumer_max_instances
    }

    containers {
      image = var.consumer_image
    }
  }

  # Same rationale as the API service: CI owns the image tag, and runtime env vars
  # (incl. secrets: Resend/Slack) are set by the deploy workflow's --set-env-vars /
  # --set-secrets — never here. `env` stays ignored; the Secret Manager migration
  # manages only the secret containers + IAM (secrets.tf). The service-level
  # scaling block is auto-populated on import; leave it as-is.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      template[0].containers[0].env,
      # Entrypoint override baked into the image/deploy — a build detail, not infra.
      template[0].containers[0].command,
      scaling,
      client,
      client_version,
    ]
  }
}
