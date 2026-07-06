# R2 buckets (see ../r2/buckets.md). Upload buckets are public via a custom
# domain; API-docs buckets stay private (backend-read only, scoped creds).
#
# Buckets already exist — import each before applying:
#   terraform import 'cloudflare_r2_bucket.uploads["prod"]'  <account_id>/uploads-factorysyncsolutions-com

locals {
  upload_buckets = {
    staging = {
      name          = "uploads-factorysyncsolutions-com-staging"
      custom_domain = "cdn-staging.factorysyncsolutions.com"
    }
    prod = {
      name          = "uploads-factorysyncsolutions-com"
      custom_domain = "cdn.factorysyncsolutions.com"
    }
  }

  apidoc_buckets = {
    staging = "apidoc-factorysyncsolutions-com-staging"
    prod    = "apidoc-factorysyncsolutions-com"
  }
}

resource "cloudflare_r2_bucket" "uploads" {
  for_each   = local.upload_buckets
  account_id = var.account_id
  name       = each.value.name
  location   = "eeur"
}

# Public custom domain for each upload bucket (the cdn* DNS + R2 binding).
#
# NOT MANAGED YET: the cloudflare provider (latest stable, v5.21.1) does not
# implement import for cloudflare_r2_custom_domain ("Resource Import Not
# Implemented"), so these existing domains can't be adopted onto the live account
# without a from-scratch create (which would collide). Until a provider release
# adds import support, cdn/cdn-staging stay managed out-of-band (dashboard), same
# category as the Pages/Wrangler-owned DNS noted in dns.tf. To adopt later:
# uncomment, `tofu init -upgrade` to the version that supports it, then
# `tofu import 'cloudflare_r2_custom_domain.uploads["prod"]' <account_id>/<bucket>/<domain>`
# for each and reconcile to empty. var.zone_id is retained for that day.
#
# resource "cloudflare_r2_custom_domain" "uploads" {
#   for_each    = local.upload_buckets
#   account_id  = var.account_id
#   bucket_name = each.value.name
#   domain      = each.value.custom_domain
#   zone_id     = var.zone_id
#   enabled     = true
# }

# API-docs buckets: private, no custom domain. Backend reads with scoped creds.
resource "cloudflare_r2_bucket" "apidoc" {
  for_each   = local.apidoc_buckets
  account_id = var.account_id
  name       = each.value
  location   = "eeur"
}
