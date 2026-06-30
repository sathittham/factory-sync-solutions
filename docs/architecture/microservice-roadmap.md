# Microservice + Event-Driven Roadmap (Cloud Run + Cloud Pub/Sub)

Current state: one Go service on Cloud Run (`apps/backend`) with bounded-domain folders.
Target: domain services that can be split gradually without downtime.

## 1) Target domain boundaries (already present in code)

| Domain | Current package | Future Cloud Run service |
|---|---|---|
| Identity/Profile | `services/profile` | `profile-service` |
| Quiz | `services/quiz` | `quiz-service` |
| Scoring | `services/scoring` | `scoring-service` |
| Result | `services/result` | `result-service` |
| Notifications | `services/notification` | `notification-service` |
| Backoffice/Admin | `services/admin`, `services/backoffice` | `admin-service` |
| DBD Lookup | `services/dbd` | `dbd-service` |
| Audit | `services/audit` | folded into `admin-service` (cross-cutting, not standalone) |
| Upload | `services/upload` | folded into `profile-service` (no independent scaling need yet) |

## 2) Event backbone (phase 1)

1. Keep a single deployable backend.
2. Emit domain events from service layer (registration, quiz submitted, result ready, profile updated).
3. Follow the shared event contract in [`domain-events.md`](domain-events.md) and validate payloads in staging.
4. Store events in a durable event table/collection if Cloud events are ever disabled.
5. Add adapters later:
   - `events.Publisher` (logging now) -> Pub/Sub publisher
   - consumers in small worker services (`notification-consumer`, `analytics-consumer`)

The first migration milestone is a no-risk "logical async handoff":

- `log` mode validates schema + observability
- Pub/Sub topic and subscriptions come next
- Consumers start as idempotent handlers using the same contract

Current file hook:

- `apps/backend/pkg/events/events.go`
- `SetEventPublisher(...)` on `profile` and `quiz` services
- `DOMAIN_EVENT_MODE` env toggle in `apps/backend/.env.example`

This lets you switch from “log only” to queue publishing by changing one code adapter.

## 3) API extraction path

### Phase A — logical service split (minimal code churn)
- Keep one Cloud Run service.
- Keep `/api/v1` API shape.
- Add strict package interfaces between services (repositories + adapters).

### Phase B — physical split by domain
- Add one service at a time:
  - `notification-service` first (fastest, lowest blast radius).
  - `scoring-service` second.
  - `result-service` third.
- Frontdoor remains a thin gateway layer until all domains are split:
  - API Gateway/Cloud Run service for auth + routing + legacy compatibility.

### Phase C — full event-driven decomposition
- Replace direct method calls with async publish/subscribe where appropriate:
  - `quiz-service -> result-service` synchronous for write path
  - `quiz-service -> notification-service` async via Pub/Sub
  - `profile-service -> audit/audit-consumer` async

## 4) Cost + scale defaults on Cloud Run

Start with these per-service baselines:

| Concern | Recommendation |
|---|---|
| CPU | 0.5 to 1 vCPU for API services, 1 vCPU for heavy processing |
| Memory | 256MiB for profile/quiz/results/admin, 512MiB for notification or DBD |
| Concurrency | 80+ for read-heavy services, 10–20 for heavy request/logic services |
| Min instances | 0 for background/event workers, 1 for critical auth paths if cold starts are unacceptable |
| Max instances | 50–100 initially, tune by p95 latency and queue lag |
| Timeouts | Explicit shorter timeout for handlers; long async flows should return quickly |

Use Cloud Run Request-based billing + Cloud Monitoring + p95 alerts on:
- concurrent request saturation
- instance startup rate
- 5xx rate
- 95/99 latency

## 5) Operational migration checklist

1. `DOMAIN_EVENT_MODE=log` to validate payloads in staging.
2. Define domain event contract:
   - [`architecture/domain-events.md`](domain-events.md)
3. Add a single shared Pub/Sub topic (per `domain-events.md` Phase 2 guidance) with one filtered subscription per domain:
   - `profile-events`
   - `quiz-events`
   - `result-events`
4. Deploy one cloud-run consumer per domain.
5. Add Cloud Scheduler/Workflows for reconciliation checks (rebuild read models if needed).
6. Remove synchronous cross-module calls only after event consumers reach stable SLA.

## 6) This sprint (Action Plan)

Done:
- Added the canonical event contract ([`domain-events.md`](domain-events.md)) and finalized event versioning + required payload fields.
- Added a consumer skeleton (`apps/backend/cmd/domain-event-consumer`) with an idempotency marker (`apps/backend/pkg/events/consumer.go`).
- Added DLQ routing (`consumer.go`) and alerting guardrails (`scripts/setup-domain-event-monitoring.sh`) ahead of enabling queue delivery.
- Updated backend build/deploy artifacts to package and deploy `domain-event-consumer` as a Cloud Run worker service.

Remaining:
- Keep `DOMAIN_EVENT_MODE=log` in staging and verify end-to-end JSON samples for all emitted events.
- Link all teams to the event contract.

## 7) Immediate next actions (next sprint)

- Add integration test for `domain-event-consumer` happy path + failure/DLQ path.
- Add one integration test per emitted event with correlation IDs.
- Add Terraform/CDK baseline for Pub/Sub topics + dead-letter subscriptions.

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-06-20 | Initial version |
