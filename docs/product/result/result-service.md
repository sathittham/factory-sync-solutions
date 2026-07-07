# Result Service (backend)

## Summary

Go service that serves the authenticated user's assessments. Lives at
`apps/backend/services/result/` (`handler.go` + `service.go` + `models.go` +
`service_test.go`); reads the `assessments` Firestore collection written at quiz-submit
time by the quiz/scoring features.

## Implementation

- `GetUserResults(ctx, uid) ([]Assessment, error)` — all assessments for the UID, ordered
  `submittedAt` descending. Returns an **empty slice, not nil**, for a user with no
  results.
- `GetResult(ctx, uid, assessmentID) (Assessment, error)` — one assessment, scoped to the
  caller. Returns `ErrResultNotFound` both when the document does not exist **and** when it
  exists but belongs to a different UID — the two cases are indistinguishable to the
  client (no ownership leak).
- Errors are wrapped (`fmt.Errorf("context: %w", err)`) and checked with `errors.Is`;
  the sentinel is domain-specific (`ErrResultNotFound`).

### Firestore query

```
Collection: assessments
Query:      where("uid", "==", uid)
            orderBy("submittedAt", desc)
```

No pagination — acceptable at the expected volume (one assessment per quiz variant per
user, ~4 variants today, plus occasional re-takes).

### Endpoints

| Method | Path | Auth | Success | Errors |
|--------|------|------|---------|--------|
| `GET` | `/api/v1/results` | Bearer | `200 {"success": true, "data": [...], "count": N}` | `401 UNAUTHORIZED` |
| `GET` | `/api/v1/results/{assessmentId}` | Bearer | `200 {"success": true, "data": {...}}` | `401 UNAUTHORIZED` · `404 NOT_FOUND` |

Assessment shape (camelCase): `id` · `uid` · `quizId` · `overallScore` · `diagnosis` ·
`strengths[]` · `weaknesses[]` · `scores[] {dimensionId, dimensionName, dimensionNameTh,
score, maxScore}` · `submittedAt` — full example in
[feature-spec.md § 10](./feature-spec.md#10-backend-api).

## Usage

```
# pseudocode — handler maps sentinel errors to the envelope
uid := middleware.GetUID(r)                    # never from body/path
a, err := svc.GetResult(ctx, uid, assessmentID)
errors.Is(err, ErrResultNotFound) → pkg.RespondError(w, 404, "NOT_FOUND", msg)
err != nil                        → pkg.RespondError(w, 500, "INTERNAL_ERROR", msg)
ok                                → pkg.RespondJSON(w, 200, a)

list, err := svc.GetUserResults(ctx, uid)
ok → pkg.RespondList(w, 200, list)             # {"success": true, "data": [...], "count": N}
```

## Acceptance Criteria

- Given a valid token, when `GET /results` is called, then only the caller's assessments return, most recent first.
- Given a new user with no assessments, when `GET /results` is called, then `data` is an empty array (`count: 0`), not null.
- Given an assessment ID owned by another user, when `GET /results/{id}` is called, then the response is `404 NOT_FOUND`.
- Given no/invalid token, when either endpoint is called, then `401 UNAUTHORIZED`.

## Status

- [x] `handler.go` — both endpoints wired with swagger annotations
- [x] `service.go` — user-scoped query + `ErrResultNotFound` sentinel
- [x] `models.go` — assessment / dimension-score structs
- [x] `service_test.go` — wrong-UID 404 path; empty-slice-for-new-user case (coverage goal ≥ 80%)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
