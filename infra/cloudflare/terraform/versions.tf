terraform {
  required_version = ">= 1.7"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    # bucket = "factory-sync-solutions-tfstate"   # set via `terraform init -backend-config`
    prefix = "cloudflare"
  }
}

# CLOUDFLARE_API_TOKEN is read from the environment — never hardcode it.
# Token needs: Zone:DNS:Edit, Account:R2:Edit, Account:Access:Edit.
provider "cloudflare" {}
