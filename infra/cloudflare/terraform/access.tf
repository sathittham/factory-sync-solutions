# Cloudflare Access (Zero Trust) in front of the production backoffice.
# domains.md marks backoffice.factorysyncsolutions.com as "Pages + Access".
# Staging backoffice is intentionally NOT behind Access.

# Reusable account-level policy (v5 decoupled policies from applications).
resource "cloudflare_zero_trust_access_policy" "backoffice_allow" {
  account_id = var.account_id
  name       = "Allow backoffice operators"
  decision   = "allow"

  # One include entry per allowed email (from var.backoffice_access_emails).
  # Empty list = no one allowed until you set it in terraform.tfvars.
  include = [for e in var.backoffice_access_emails : { email = { email = e } }]
}

resource "cloudflare_zero_trust_access_application" "backoffice" {
  account_id       = var.account_id
  name             = "FactorySync Backoffice (production)"
  domain           = "backoffice.factorysyncsolutions.com"
  type             = "self_hosted"
  session_duration = "24h"

  # v5 attaches policies by reference on the application, with explicit ordering.
  policies = [{
    id         = cloudflare_zero_trust_access_policy.backoffice_allow.id
    precedence = 1
  }]
}

