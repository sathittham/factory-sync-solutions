# Runtime identity for the Cloud Run API.
#
# Live infra reuses the shared CI "deployer" service account as the Cloud Run
# runtime identity, so we adopt it as-is (import-first, plan-to-empty) rather
# than creating a dedicated SA. It is referenced as a data source because its
# lifecycle is owned outside this per-env module (CI provisioning), not here.
#
# NOTE (security follow-up): deployer@ is over-privileged for a runtime identity
# (it also holds run.admin, artifactregistry.writer, firebaseauth.admin). Moving
# the API to a dedicated least-privilege SA is tracked in the risk register; that
# is a planned migration, not part of this adoption pass.
data "google_service_account" "runtime" {
  project    = var.project_id
  account_id = "deployer"
}

# Only the runtime-relevant roles are declared here. google_project_iam_member
# is non-authoritative, so it manages just these (role, member) pairs and leaves
# deployer's other CI roles untouched.
resource "google_project_iam_member" "api_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${data.google_service_account.runtime.email}"
}

resource "google_project_iam_member" "api_pubsub_publisher" {
  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${data.google_service_account.runtime.email}"
}
