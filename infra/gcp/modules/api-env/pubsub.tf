# Domain-event pipeline for the Cloud Run worker (DOMAIN_EVENT_MODE=pubsub).
# Names and config mirror the live infra so `plan` reconciles to empty.
resource "google_pubsub_topic" "domain_events" {
  project = var.project_id
  name    = "factory-sync-domain-events"
}

# Dead-letter topic for events that exceed max delivery attempts.
resource "google_pubsub_topic" "domain_events_dlq" {
  project = var.project_id
  name    = "factory-sync-domain-events-dlq"
}

resource "google_pubsub_subscription" "domain_events_consumer" {
  project = var.project_id
  name    = "factory-sync-domain-events-result-consumer"
  topic   = google_pubsub_topic.domain_events.id

  ack_deadline_seconds = 60

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.domain_events_dlq.id
    max_delivery_attempts = 5
  }

  # Pull-based consumer (empty push_config), so no OIDC push settings here.
}
