output "service_uri" {
  description = "Cloud Run service URL (the api-gateway Worker's UPSTREAM_ORIGIN)."
  value       = google_cloud_run_v2_service.api.uri
}

output "service_account_email" {
  description = "Runtime service account email (shared deployer SA)."
  value       = data.google_service_account.runtime.email
}

output "domain_events_topic" {
  description = "Pub/Sub domain-events topic id."
  value       = google_pubsub_topic.domain_events.id
}
