# Secret Manager secrets backing the Cloud Run runtime env vars.
#
# Terraform manages the secret CONTAINERS and grants the runtime SA read access
# at the per-secret level (least privilege — not a project-wide accessor role).
# It NEVER manages the secret VALUES: versions are added out-of-band with
# `gcloud secrets versions add` and must never appear in .tf/.tfvars/state diffs.
#
# DELIBERATE APPLY (not import-first): creating these and switching Cloud Run to
# secret_key_ref changes live infra. Follow docs/operations/secret-manager-migration.md
# — create secrets → add versions out-of-band → wire secret_key_ref → plan → apply,
# staging first. Requires the Secret Manager API enabled on the project
# (`gcloud services enable secretmanager.googleapis.com`).
resource "google_secret_manager_secret" "runtime" {
  for_each  = var.runtime_secrets
  project   = var.project_id
  secret_id = each.value

  replication {
    auto {}
  }

  # The version holds the real secret material; losing it is data loss. Guard the
  # container the same way the Firestore DB is guarded.
  lifecycle {
    prevent_destroy = true
  }
}

# Per-secret accessor grant for the shared deployer runtime SA. secret_iam_member
# is non-authoritative, so it adds only this (secret, role, member) binding.
resource "google_secret_manager_secret_iam_member" "runtime_accessor" {
  for_each  = google_secret_manager_secret.runtime
  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_service_account.runtime.email}"
}
