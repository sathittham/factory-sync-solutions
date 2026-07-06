# Each environment is its own GCP project, so each has an isolated (default)
# Firestore database. Rules/indexes stay codified at the repo root
# (firestore.rules, firestore.indexes.json) and ship via the Firebase CLI.
resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # deletion_policy is the Terraform-only destroy behavior (DELETE | ABANDON);
  # ABANDON matches the imported live state and orphans the DB rather than
  # deleting it. Server-side delete protection (delete_protection_state) is left
  # unmanaged — it is DISABLED live, so declaring it here would create drift.
  # Enabling it is a recommended safety follow-up (a live change, needs apply).
  deletion_policy = "ABANDON"

  lifecycle {
    prevent_destroy = true
  }
}
