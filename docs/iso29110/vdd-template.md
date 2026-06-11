---
isoOutput: SI.O7
template: true
version: 1.0.0
lastUpdated: 2026-06-11
---

# Version Description Document Template

*ISO 29110 Basic Profile · SI.O7*
*Copy to `docs/iso29110/releases/vX.Y.Z.md` when tagging a production release.*

---

```markdown
---
isoOutput: SI.O7
version: X.Y.Z
releaseDate: YYYY-MM-DD
tag: vX.Y.Z
status: Released / Draft
---

# Version Description Document — vX.Y.Z

*ISO 29110 Basic Profile · SI.O7*

---

## 1. Release Summary

| Field | Value |
|---|---|
| **Version** | X.Y.Z |
| **Release Date** | YYYY-MM-DD |
| **Git Tag** | `vX.Y.Z` |
| **Release Type** | Major / Minor / Patch |
| **Deployed By** | [name] |
| **Staging Verified** | Yes / No — `vX.Y.Z-staging` on YYYY-MM-DD |

**Release Summary:**
[1-2 sentence description of what this release contains and why it was made.]

---

## 2. Changed Components

| Component | Previous Version | New Version | Change Type |
|---|---|---|---|
| fs-backend | vA.B.C | X.Y.Z | [Feature / Fix / Refactor] |
| fs-app-web | vA.B.C | X.Y.Z | |
| fs-backoffice-web | vA.B.C | X.Y.Z | |
| fs-official-web | vA.B.C | X.Y.Z | |

---

## 3. New Features

| Feature | SRS Reference | Description |
|---|---|---|
| [Feature name] | [docs/product/<feature>/feature-spec.md]() | [Brief description] |

---

## 4. Bug Fixes

| Issue | Severity | Description | SRS / ADR |
|---|---|---|---|
| [#issue or description] | Critical / Major / Minor | [what was fixed] | |

---

## 5. Breaking Changes

| Change | Affected | Migration Required |
|---|---|---|
| [describe] | [who/what] | [yes/no + how] |

*If no breaking changes: "None."*

---

## 6. Configuration Changes

| Change | Type | Required Action |
|---|---|---|
| [env var added/changed] | New env var | Add to `.env.local`; see [env-variables.md](../../operations/env-variables.md) |
| [Firestore rule change] | Rules update | Run `firebase deploy --only firestore:rules` |
| [New Firestore index] | Index deploy | Run `firebase deploy --only firestore:indexes` |

*If no configuration changes: "None."*

---

## 7. Known Issues

| ID | Description | Severity | Workaround | Target Fix |
|---|---|---|---|---|
| [KI-001] | [description] | Minor | [workaround] | vX.Y.Z+1 |

*If no known issues: "None at time of release."*

---

## 8. Test Results

| Test Suite | Result | Coverage | Date |
|---|---|---|---|
| Backend unit tests (`go test -race -cover ./...`) | Pass / Fail | — % | YYYY-MM-DD |
| Frontend unit tests (Vitest) | Pass / Fail | — | YYYY-MM-DD |
| TypeScript check (`tsc --noEmit`) | Pass / Fail | — | YYYY-MM-DD |
| Staging smoke test | Pass / Fail | — | YYYY-MM-DD |

---

## 9. Deployment Instructions

### Prerequisites
- [ ] Staging version `vX.Y.Z-staging` verified
- [ ] All GitHub Secrets current
- [ ] Firestore rules/indexes deployed (if changed — see §6)

### Production Deploy Steps
```bash
# 1. Confirm staging is clean
git checkout main && git pull origin main

# 2. Tag production
git tag -a vX.Y.Z -m "Release vX.Y.Z: [summary]"
git push origin vX.Y.Z    # → triggers GitHub Actions production deploy

# 3. Verify
# GitHub Actions → deploy-production.yml — confirm green
# Check production URLs for 200 responses
```

### Rollback
```bash
# Re-deploy the previous version tag via GitHub Actions
# Or roll back Cloudflare Pages deployment in the dashboard
```

---

## 10. ISO 29110 Compliance Checklist

- [ ] PM.O1: Project Plan updated (team, risks current)
- [ ] PM.O2: Progress log entry added for this iteration
- [ ] SI.O1: SRS exists for every feature in this release
- [ ] SI.O2: SDD exists for every new/changed architecture component
- [ ] SI.O4: Unit tests passing with coverage ≥ target
- [ ] SI.O5: Integration / smoke tests passed on staging
- [ ] SI.O6: User guide updated for user-facing changes
- [ ] SI.O7: This VDD created and committed
- [ ] Change requests in [change-request-log.md](../change-request-log.md) are closed / updated
- [ ] Risk register reviewed

---

*Prepared by: [name] · Approved by: [name or "self-approved, VSE"]*
```

---

## Releases Index

| Version | Date | Summary |
|---|---|---|
| *(none yet)* | — | — |

*Add a row here when each VDD is created in `docs/iso29110/releases/`.*
