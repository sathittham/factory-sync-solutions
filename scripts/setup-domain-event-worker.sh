#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# One-time provisioning for domain-event-consumer:
#   - Pub/Sub topic for domain events
#   - Pub/Sub DLQ topic
#   - Result-consumer subscription
#   - IAM role bindings for producer + worker service accounts
#
# Usage:
#   ./scripts/setup-domain-event-worker.sh --environment staging --project factory-sync-solutions
#   ./scripts/setup-domain-event-worker.sh --environment production --project factory-sync-solutions --topic factory-sync-domain-events --dlq-topic factory-sync-domain-events-dlq
#
# Environment variables (all optional):
#   GCP_PROJECT_ID                     default: from --project or --project arg
#   DOMAIN_EVENT_PUBSUB_TOPIC          default: factory-sync-domain-events
#   DOMAIN_EVENT_PUBSUB_DLQ_TOPIC      default: ${DOMAIN_EVENT_PUBSUB_TOPIC}-dlq
#   DOMAIN_EVENT_SUBSCRIPTION           default: ${DOMAIN_EVENT_PUBSUB_TOPIC}-result-consumer
#   DOMAIN_EVENT_PUBLISHER_SA           default: deployer@<PROJECT>.iam.gserviceaccount.com
#   DOMAIN_EVENT_WORKER_SA              default: deployer@<PROJECT>.iam.gserviceaccount.com
#   DOMAIN_EVENT_ACK_DEADLINE_SECONDS   default: 60
#   DOMAIN_EVENT_MAX_DELIVERY_ATTEMPTS   default: 5
# ---------------------------------------------------------------------------

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --environment|--environment=*)
        if [[ "$1" == --environment=* ]]; then
          ENVIRONMENT="${1#*=}"
          shift
        else
          ENVIRONMENT="${2:-}"
          shift 2
        fi
        ;;
      --project|--project=*)
        if [[ "$1" == --project=* ]]; then
          PROJECT_ID="${1#*=}"
          shift
        else
          PROJECT_ID="${2:-}"
          shift 2
        fi
        ;;
      --topic|--topic=*)
        if [[ "$1" == --topic=* ]]; then
          TOPIC_NAME="${1#*=}"
          shift
        else
          TOPIC_NAME="${2:-}"
          shift 2
        fi
        ;;
      --dlq-topic|--dlq-topic=*)
        if [[ "$1" == --dlq-topic=* ]]; then
          DLQ_TOPIC_NAME="${1#*=}"
          shift
        else
          DLQ_TOPIC_NAME="${2:-}"
          shift 2
        fi
        ;;
      --subscription|--subscription=*)
        if [[ "$1" == --subscription=* ]]; then
          SUBSCRIPTION_NAME="${1#*=}"
          shift
        else
          SUBSCRIPTION_NAME="${2:-}"
          shift 2
        fi
        ;;
      --help|-h)
        usage
        ;;
      *)
        echo "Unknown option: $1" >&2
        usage
        ;;
    esac
  done
}

usage() {
  cat <<'EOF'
Usage: ./scripts/setup-domain-event-worker.sh --environment <staging|production> --project <GCP_PROJECT_ID> [options]

Options:
  --environment  staging | production
  --project      GCP project ID
  --topic        Pub/Sub topic name (default: factory-sync-domain-events)
  --dlq-topic    DLQ topic name (default: <topic>-dlq)
  --subscription Consumer subscription name (default: <topic>-result-consumer)
  -h, --help    Show this help message

This script is idempotent. Re-running it after successful setup is safe.
EOF
  exit 1
}

require() {
  local name="$1"
  local value="$2"
  if [[ -z "$value" ]]; then
    echo "Missing required value: $name" >&2
    usage
  fi
}

ensure_topic() {
  local topic_name="$1"
  if gcloud pubsub topics describe "$topic_name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "✓ Topic exists: $topic_name"
    return 0
  fi
  echo "▶ Creating topic: $topic_name"
  gcloud pubsub topics create "$topic_name" --project "$PROJECT_ID"
}

ensure_subscription() {
  local subscription_name="$1"
  local topic_name="$2"
  local dead_letter_topic="$3"
  local ack_deadline_seconds="$4"
  local max_delivery_attempts="$5"

  if gcloud pubsub subscriptions describe "$subscription_name" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "✓ Subscription exists: $subscription_name"
    return 0
  fi

  echo "▶ Creating subscription: $subscription_name"
  gcloud pubsub subscriptions create "$subscription_name" \
    --topic "$topic_name" \
    --project "$PROJECT_ID" \
    --ack-deadline="$ack_deadline_seconds" \
    --max-delivery-attempts="$max_delivery_attempts" \
    --dead-letter-topic="projects/$PROJECT_ID/topics/$dead_letter_topic"
}

ensure_iam_binding() {
  local role="$1"
  local service_account="$2"

  echo "▶ Granting IAM role: $role on project $PROJECT_ID"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${service_account}" \
    --role="$role"
}

ENVIRONMENT=""
PROJECT_ID="${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-}}"
TOPIC_NAME="${DOMAIN_EVENT_PUBSUB_TOPIC:-factory-sync-domain-events}"
DLQ_TOPIC_NAME="${DOMAIN_EVENT_PUBSUB_DLQ_TOPIC:-}"
SUBSCRIPTION_NAME="${DOMAIN_EVENT_SUBSCRIPTION:-}"
ACK_DEADLINE_SECONDS="${DOMAIN_EVENT_ACK_DEADLINE_SECONDS:-60}"
MAX_DELIVERY_ATTEMPTS="${DOMAIN_EVENT_MAX_DELIVERY_ATTEMPTS:-5}"

parse_args "$@"

require "environment" "$ENVIRONMENT"
require "project" "$PROJECT_ID"

if [[ -z "$DLQ_TOPIC_NAME" ]]; then
  DLQ_TOPIC_NAME="${TOPIC_NAME}-dlq"
fi
if [[ -z "$SUBSCRIPTION_NAME" ]]; then
  SUBSCRIPTION_NAME="${TOPIC_NAME}-result-consumer"
fi

case "$ENVIRONMENT" in
  staging|production)
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT (must be staging or production)" >&2
    usage
    ;;
esac

WORKER_SERVICE_ACCOUNT="${DOMAIN_EVENT_WORKER_SA:-deployer@${PROJECT_ID}.iam.gserviceaccount.com}"
API_SERVICE_ACCOUNT="${DOMAIN_EVENT_PUBLISHER_SA:-$WORKER_SERVICE_ACCOUNT}"

echo ""
echo "┌───────────────────────────────────────────────────────┐"
echo "│  Domain event worker infrastructure bootstrap         │"
echo "└───────────────────────────────────────────────────────┘"
echo "  Environment      : $ENVIRONMENT"
echo "  Project          : $PROJECT_ID"
echo "  Topic            : $TOPIC_NAME"
echo "  DLQ topic        : $DLQ_TOPIC_NAME"
echo "  Subscription     : $SUBSCRIPTION_NAME"
echo "  Publisher SA     : $API_SERVICE_ACCOUNT"
echo "  Worker SA        : $WORKER_SERVICE_ACCOUNT"
echo "  ACK deadline     : ${ACK_DEADLINE_SECONDS}s"
echo "  Max delivery     : $MAX_DELIVERY_ATTEMPTS"
echo ""

ensure_topic "$TOPIC_NAME"
ensure_topic "$DLQ_TOPIC_NAME"
ensure_subscription "$SUBSCRIPTION_NAME" "$TOPIC_NAME" "$DLQ_TOPIC_NAME" "$ACK_DEADLINE_SECONDS" "$MAX_DELIVERY_ATTEMPTS"

ensure_iam_binding "roles/pubsub.publisher" "$API_SERVICE_ACCOUNT"
ensure_iam_binding "roles/pubsub.subscriber" "$WORKER_SERVICE_ACCOUNT"
ensure_iam_binding "roles/pubsub.publisher" "$WORKER_SERVICE_ACCOUNT"
ensure_iam_binding "roles/datastore.user" "$WORKER_SERVICE_ACCOUNT"

echo ""
echo "✓ Domain event worker bootstrap completed."
echo ""
echo "Next:"
if [[ "$ENVIRONMENT" == "staging" ]]; then
  echo "  - Deploy staging API with DOMAIN_EVENT_MODE=pubsub"
  echo "  - Set vars: DOMAIN_EVENT_SUBSCRIPTION=$SUBSCRIPTION_NAME"
  echo "  - Set vars: DOMAIN_EVENT_PUBSUB_TOPIC=$TOPIC_NAME"
  echo "  - Set vars: DOMAIN_EVENT_PUBSUB_DLQ_TOPIC=$DLQ_TOPIC_NAME"
else
  echo "  - Deploy production API with DOMAIN_EVENT_MODE=pubsub"
  echo "  - Set vars: DOMAIN_EVENT_SUBSCRIPTION=$SUBSCRIPTION_NAME"
  echo "  - Set vars: DOMAIN_EVENT_PUBSUB_TOPIC=$TOPIC_NAME"
  echo "  - Set vars: DOMAIN_EVENT_PUBSUB_DLQ_TOPIC=$DLQ_TOPIC_NAME"
fi
