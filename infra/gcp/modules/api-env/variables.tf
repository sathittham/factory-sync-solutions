variable "project_id" {
  description = "GCP project ID for this environment."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run + Firestore (e.g. asia-southeast3)."
  type        = string
}

variable "service_name" {
  description = "Cloud Run service name (e.g. factory-sync-solutions-api or -api-staging)."
  type        = string
}

variable "api_image" {
  description = "Container image for the Go API. CI overrides the tag on each deploy; ignored by Terraform after import."
  type        = string
}

variable "domain_event_mode" {
  description = "DOMAIN_EVENT_MODE env var (e.g. \"pubsub\")."
  type        = string
  default     = "pubsub"
}

variable "min_instances" {
  description = "Cloud Run min instances (prod usually 1, staging 0)."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Cloud Run max instances."
  type        = number
  default     = 10
}

variable "consumer_service_name" {
  description = "Cloud Run service name for the domain-event consumer worker."
  type        = string
}

variable "consumer_image" {
  description = "Container image for the consumer. CI overrides the tag on each deploy; ignored by Terraform after import."
  type        = string
}

variable "consumer_min_instances" {
  description = "Consumer Cloud Run min instances (kept warm to drain the subscription)."
  type        = number
  default     = 1
}

variable "consumer_max_instances" {
  description = "Consumer Cloud Run max instances."
  type        = number
  default     = 3
}
