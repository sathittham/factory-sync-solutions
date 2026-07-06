variable "account_id" {
  description = "Cloudflare account ID that owns the zone, R2 buckets, and Access apps."
  type        = string
}

# Retained for the currently-commented cloudflare_r2_custom_domain resources in
# r2.tf (provider can't import them yet). tflint-ignored until they're re-enabled.
# tflint-ignore: terraform_unused_declarations
variable "zone_id" {
  description = "Cloudflare zone ID for factorysyncsolutions.com (reserved for R2 custom domains)."
  type        = string
}

variable "backoffice_access_emails" {
  description = "Emails allowed through Cloudflare Access on the production backoffice."
  type        = list(string)
  default     = []
}
