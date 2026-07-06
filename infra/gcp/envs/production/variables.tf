variable "project_id" {
  description = "Production GCP project ID."
  type        = string
}

variable "region" {
  description = "Region (must match the live Cloud Run/Firestore region)."
  type        = string
  default     = "asia-southeast3"
}

variable "api_image" {
  description = "Go API image for production (tag overridden by CI; ignored after import)."
  type        = string
}
