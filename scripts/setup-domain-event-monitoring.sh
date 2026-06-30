#!/usr/bin/env bash
set -euo pipefail

# Generate and optionally apply Cloud Monitoring alerting policies for the domain event pipeline.
#
# Usage:
#   ./scripts/setup-domain-event-monitoring.sh --environment staging --project <PROJECT_ID>
#   ./scripts/setup-domain-event-monitoring.sh --environment production --project <PROJECT_ID> --apply --notification-channel-id <CHANNEL_ID>

ENVIRONMENT=""
PROJECT_ID="${GCP_PROJECT_ID:-${GOOGLE_CLOUD_PROJECT:-factory-sync-solutions}}"
REGION="asia-southeast3"
WORKER_SERVICE_NAME=""
SUBSCRIPTION_NAME="${DOMAIN_EVENT_SUBSCRIPTION:-factory-sync-domain-events-result-consumer}"
TOPIC_NAME="${DOMAIN_EVENT_PUBSUB_TOPIC:-factory-sync-domain-events}"
DLQ_TOPIC_NAME="${DOMAIN_EVENT_PUBSUB_DLQ_TOPIC:-factory-sync-domain-events-dlq}"
NOTIFICATION_CHANNEL_ID="${MONITORING_NOTIFICATION_CHANNEL_ID:-}"
APPLY=false
CHANNEL_REF=""

usage() {
  cat <<'USAGE'
Usage: ./scripts/setup-domain-event-monitoring.sh --environment <staging|production> --project <PROJECT_ID> [options]

Options:
  --environment            staging | production
  --project                GCP Project ID
  --region                 GCP region (default: asia-southeast3)
  --service                worker service name (default env-specific)
  --subscription           subscription name
  --topic                  topic name
  --dlq-topic              DLQ topic name
  --notification-channel-id Monitoring notification channel id (required for --apply)
  --apply                  Create policies via gcloud after rendering
  -h, --help               Show this help
USAGE
  exit 1
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --environment|--environment=*)
        if [[ "$1" == --environment=* ]]; then
          ENVIRONMENT="${1#*=}"
          shift
        else
          ENVIRONMENT="$2"
          shift 2
        fi
        ;;
      --project|--project=*)
        if [[ "$1" == --project=* ]]; then
          PROJECT_ID="${1#*=}"
          shift
        else
          PROJECT_ID="$2"
          shift 2
        fi
        ;;
      --region|--region=*)
        if [[ "$1" == --region=* ]]; then
          REGION="${1#*=}"
          shift
        else
          REGION="$2"
          shift 2
        fi
        ;;
      --service|--service=*)
        if [[ "$1" == --service=* ]]; then
          WORKER_SERVICE_NAME="${1#*=}"
          shift
        else
          WORKER_SERVICE_NAME="$2"
          shift 2
        fi
        ;;
      --subscription|--subscription=*)
        if [[ "$1" == --subscription=* ]]; then
          SUBSCRIPTION_NAME="${1#*=}"
          shift
        else
          SUBSCRIPTION_NAME="$2"
          shift 2
        fi
        ;;
      --topic|--topic=*)
        if [[ "$1" == --topic=* ]]; then
          TOPIC_NAME="${1#*=}"
          shift
        else
          TOPIC_NAME="$2"
          shift 2
        fi
        ;;
      --dlq-topic|--dlq-topic=*)
        if [[ "$1" == --dlq-topic=* ]]; then
          DLQ_TOPIC_NAME="${1#*=}"
          shift
        else
          DLQ_TOPIC_NAME="$2"
          shift 2
        fi
        ;;
      --notification-channel-id|--notification-channel-id=*)
        if [[ "$1" == --notification-channel-id=* ]]; then
          NOTIFICATION_CHANNEL_ID="${1#*=}"
          shift
        else
          NOTIFICATION_CHANNEL_ID="$2"
          shift 2
        fi
        ;;
      --apply)
        APPLY=true
        shift
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

require() {
  if [[ -z "$1" ]]; then
    echo "Missing required argument." >&2
    usage
  fi
}

build_worker_policy() {
  cat > "$1" <<EOF
{
  "displayName": "Domain Event Worker Monitoring (${ENVIRONMENT})",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Worker high 5xx rate (5m)",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"${WORKER_SERVICE_NAME}\" metric.type=\"run.googleapis.com/request_count\" metric.labels.response_code_class=\"5xx\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_SUM",
            "crossSeriesReducer": "REDUCE_SUM",
            "groupByFields": ["resource.labels.service_name"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "duration": "300s",
        "thresholdValue": 20,
        "trigger": { "count": 1 }
      }
    },
    {
      "displayName": "Worker p95 latency > 3s (5m)",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"${WORKER_SERVICE_NAME}\" metric.type=\"run.googleapis.com/request_latencies\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_PERCENTILE_95",
            "crossSeriesReducer": "REDUCE_MEAN",
            "groupByFields": ["resource.labels.service_name"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "duration": "300s",
        "thresholdValue": 3,
        "trigger": { "count": 1 }
      }
    },
    {
      "displayName": "Worker container restarts > 5 (5m)",
      "conditionThreshold": {
        "filter": "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"${WORKER_SERVICE_NAME}\" metric.type=\"run.googleapis.com/container/restart_count\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_SUM",
            "crossSeriesReducer": "REDUCE_SUM",
            "groupByFields": ["resource.labels.service_name"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "duration": "300s",
        "thresholdValue": 5,
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": [${CHANNEL_REF}]
}
EOF
}

build_pubsub_policy() {
  cat > "$1" <<EOF
{
  "displayName": "Domain Event Pub/Sub Monitoring (${ENVIRONMENT})",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Undelivered messages > 500 (10m)",
      "conditionThreshold": {
        "filter": "resource.type=\"pubsub_subscription\" resource.labels.subscription_id=\"${SUBSCRIPTION_NAME}\" metric.type=\"pubsub.googleapis.com/subscription/num_undelivered_messages\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MAX",
            "crossSeriesReducer": "REDUCE_MAX",
            "groupByFields": ["resource.labels.subscription_id"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "duration": "600s",
        "thresholdValue": 500,
        "trigger": { "count": 1 }
      }
    },
    {
      "displayName": "Oldest unacked age > 300s (10m)",
      "conditionThreshold": {
        "filter": "resource.type=\"pubsub_subscription\" resource.labels.subscription_id=\"${SUBSCRIPTION_NAME}\" metric.type=\"pubsub.googleapis.com/subscription/oldest_unacked_message_age\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_MAX",
            "crossSeriesReducer": "REDUCE_MAX",
            "groupByFields": ["resource.labels.subscription_id"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "duration": "600s",
        "thresholdValue": 300,
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": [${CHANNEL_REF}]
}
EOF
}

build_dlq_policy() {
  cat > "$1" <<EOF
{
  "displayName": "Domain Event DLQ Monitoring (${ENVIRONMENT})",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "DLQ messages > 0 (5m)",
      "conditionThreshold": {
        "filter": "resource.type=\"pubsub_topic\" resource.labels.topic_id=\"${DLQ_TOPIC_NAME}\" metric.type=\"pubsub.googleapis.com/topic/send_message_count\"",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_SUM",
            "crossSeriesReducer": "REDUCE_SUM",
            "groupByFields": ["resource.labels.topic_id"]
          }
        ],
        "comparison": "COMPARISON_GT",
        "duration": "300s",
        "thresholdValue": 1,
        "trigger": { "count": 1 }
      }
    }
  ],
  "notificationChannels": [${CHANNEL_REF}]
}
EOF
}

emit_apply_instructions() {
  echo
  echo "Generated files:"
  echo "  - $WORKER_POLICY"
  echo "  - $PUBSUB_POLICY"
  echo "  - $DLQ_POLICY"
  echo
  echo "Apply with:"
  echo "gcloud alpha monitoring policies create --project \"$PROJECT_ID\" --policy-from-file=\"$WORKER_POLICY\""
  echo "gcloud alpha monitoring policies create --project \"$PROJECT_ID\" --policy-from-file=\"$PUBSUB_POLICY\""
  echo "gcloud alpha monitoring policies create --project \"$PROJECT_ID\" --policy-from-file=\"$DLQ_POLICY\""
}

parse_args "$@"

require "$ENVIRONMENT"

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Invalid environment: $ENVIRONMENT" >&2
  usage
fi

if [[ -z "$WORKER_SERVICE_NAME" ]]; then
  if [[ "$ENVIRONMENT" == "staging" ]]; then
    WORKER_SERVICE_NAME="factory-sync-solutions-domain-event-consumer-staging"
  else
    WORKER_SERVICE_NAME="factory-sync-solutions-domain-event-consumer"
  fi
fi

if [[ "$APPLY" == true ]]; then
  if [[ -z "$NOTIFICATION_CHANNEL_ID" ]]; then
    echo "ERROR: --apply requires --notification-channel-id" >&2
    usage
  fi
  if [[ "$NOTIFICATION_CHANNEL_ID" != projects/*/notificationChannels/* ]]; then
    CHANNEL_REF="\"projects/${PROJECT_ID}/notificationChannels/${NOTIFICATION_CHANNEL_ID}\""
  else
    CHANNEL_REF="\"${NOTIFICATION_CHANNEL_ID}\""
  fi
else
  if [[ -n "$NOTIFICATION_CHANNEL_ID" ]]; then
    CHANNEL_REF="\"${NOTIFICATION_CHANNEL_ID}\""
  else
    CHANNEL_REF=""
  fi
fi

if [[ -z "$CHANNEL_REF" ]]; then
  echo "Warning: no notification channel provided; generated policies omit notification routing."
  echo "You can add channels after preview using the displayed gcloud commands."
fi

WORKER_POLICY=$(mktemp /tmp/domain-event-worker-monitoring.XXXX.json)
PUBSUB_POLICY=$(mktemp /tmp/domain-event-pubsub-monitoring.XXXX.json)
DLQ_POLICY=$(mktemp /tmp/domain-event-dlq-monitoring.XXXX.json)

build_worker_policy "$WORKER_POLICY"
build_pubsub_policy "$PUBSUB_POLICY"
build_dlq_policy "$DLQ_POLICY"

echo "Monitoring bootstrap:"
echo "  environment        : $ENVIRONMENT"
echo "  project            : $PROJECT_ID"
echo "  region             : $REGION"
echo "  worker service     : $WORKER_SERVICE_NAME"
echo "  subscription       : $SUBSCRIPTION_NAME"
echo "  topic              : $TOPIC_NAME"
echo "  dlq topic          : $DLQ_TOPIC_NAME"
echo

if [[ "$APPLY" == true ]]; then
  if ! command -v gcloud >/dev/null 2>&1; then
    echo "gcloud not installed" >&2
    emit_apply_instructions
    exit 1
  fi
  echo "Creating policies..."
  gcloud alpha monitoring policies create --project "$PROJECT_ID" --policy-from-file="$WORKER_POLICY"
  gcloud alpha monitoring policies create --project "$PROJECT_ID" --policy-from-file="$PUBSUB_POLICY"
  gcloud alpha monitoring policies create --project "$PROJECT_ID" --policy-from-file="$DLQ_POLICY"
else
  emit_apply_instructions
fi

cat "$WORKER_POLICY"
cat "$PUBSUB_POLICY"
cat "$DLQ_POLICY"
