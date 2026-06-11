---
isoOutput: PM.O1 (Change Control)
version: 1.0.0
lastUpdated: 2026-06-11
author: Sathittham Sangthong
---

# Change Request Log — FactorySync Solutions

*ISO 29110 Basic Profile · PM.O1 component*

Log every change to approved scope, architecture, or accepted requirements here.
Routine bugfixes and small refactors within agreed scope do NOT require a CR.

**Status values:** Draft → Under Review → Approved → Implemented → Rejected / Withdrawn

---

## Change Request Template

Copy this block and add to the Active section:

```markdown
### CR-NNN | [Short title] | [Status]

| Field | Value |
|---|---|
| **Date Raised** | YYYY-MM-DD |
| **Raised By** | [name] |
| **Type** | Scope change / Architecture change / Requirements change / Process change |
| **Priority** | Low / Medium / High |

**Description:**
[What needs to change and why]

**Impact Analysis:**
- Schedule: [e.g. +3 days]
- Effort: [e.g. ~4 hours]
- Risk: [any new risks?]
- Affected components: [e.g. fs-backend/services/quiz, fs-app-web/pages/QuizPage]

**Decision:**
- [ ] Approved — proceed
- [ ] Rejected — reason: [reason]
- [ ] Deferred to version: [vX.Y.Z]

**Decision Date:** YYYY-MM-DD
**Decision By:** [name]

**Implementation Notes:**
[PR / commit / branch where implemented, if approved]
```

---

## Active Change Requests

*None currently open.*

---

## Closed Change Requests

### CR-001 | Add ISO 29110 quiz variant | Implemented

| Field | Value |
|---|---|
| **Date Raised** | 2026-06-11 |
| **Raised By** | Sathittham Sangthong |
| **Type** | Scope change (new quiz variant + compliance artifacts) |
| **Priority** | High |

**Description:**
Add ISO 29110 Basic Profile as a fifth quiz variant. Also create the compliance artifact set (PM.O1–O3, SI.O1–O8 templates) to bring the project itself into ISO 29110 compliance.

**Impact Analysis:**
- Schedule: 0 (same iteration)
- Effort: ~4 hours
- Risk: None — additive change, no existing code modified beyond main.go registration
- Affected components: `apps/fs-backend/config/`, `apps/fs-backend/main.go`, `docs/`

**Decision:** Approved — proceed
**Decision Date:** 2026-06-11
**Decision By:** Sathittham Sangthong

**Implementation Notes:**
- `apps/fs-backend/config/questions-iso29110.json` created (38 questions, 8 dimensions)
- `apps/fs-backend/main.go` updated to register iso29110 config
- `docs/iso29110/` directory created with all compliance artifacts
