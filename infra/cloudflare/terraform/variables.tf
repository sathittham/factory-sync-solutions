variable "account_id" {
  description = "Cloudflare account ID that owns the zone, R2 buckets, and Access apps."
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID for factorysyncsolutions.com."
  type        = string
}

variable "zone_name" {
  description = "Root domain."
  type        = string
  default     = "factorysyncsolutions.com"
}

variable "backoffice_access_emails" {
  description = "Emails allowed through Cloudflare Access on the production backoffice."
  type        = list(string)
  default     = []
}
