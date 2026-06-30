---
version: 1.0.0
lastUpdated: 2026-06-11
standard: ISO/IEC 29110-4-1:2018 Basic Profile
---

# ISO 29110 Compliance — FactorySync Solutions

This directory contains the required process artifacts for ISO/IEC 29110 Basic Profile compliance. The Basic Profile targets Very Small Enterprises (VSEs) of ≤ 25 people and mandates two process groups: **Project Management (PM)** and **Software Implementation (SI)**.

---

## Artifact Map

The table below cross-references every ISO 29110 Basic Profile output to its location in this project. All outputs are required for compliance.

### Project Management (PM)

| ISO 29110 Output | Description | File in This Project |
|---|---|---|
| **PM.O1** Project Plan | Scope, schedule, team, resources, risks, CM plan, QA plan | [project-plan.md](project-plan.md) |
| **PM.O2** Progress Status Records | Meeting minutes, status reports, action items | [progress-log.md](progress-log.md) |
| **PM.O3** Project Closure Report | Final status vs. plan, lessons learned | [progress-log.md](progress-log.md) (Closure section) |

Supporting PM artifacts (part of PM.O1):

| Artifact | File |
|---|---|
| Risk Register | [risk-register.md](risk-register.md) |
| Change Request Log | [change-request-log.md](change-request-log.md) |

### Software Implementation (SI)

| ISO 29110 Output | Description | File in This Project |
|---|---|---|
| **SI.O1** Software Requirements Specification | Functional + non-functional requirements, interfaces | Per-feature: [srs-template.md](srs-template.md) → `docs/product/*/feature-spec.md` |
| **SI.O2** Software Design Description | Architecture, component, data, interface design | Per-feature: [sdd-template.md](sdd-template.md) → `docs/architecture/` |
| **SI.O3** Software Components | Source code, unit tested | `apps/backend/`, `apps/web-app/`, `apps/web-backoffice/`, `apps/web-official/` |
| **SI.O4** Unit Test Documentation | Test plan, test cases, results per component | [test-plan-template.md](test-plan-template.md) |
| **SI.O5** Integration Test Documentation | Integration test plan, cases, results | [test-plan-template.md](test-plan-template.md) |
| **SI.O6** User Documentation | End-user manual, installation guide | [user-guide.md](user-guide.md) |
| **SI.O7** Version Description Document | Release notes, configuration, known issues | [vdd-template.md](vdd-template.md) → `docs/iso29110/releases/` |
| **SI.O8** Software Product | The deployed application | Cloudflare Pages (app + backoffice + official), Cloud Run (backend) |

---

## How to Use These Artifacts

### Starting a new feature
1. Copy [srs-template.md](srs-template.md) → `docs/product/<feature>/feature-spec.md`
2. Fill in requirements before writing any code (SI.2 process)
3. Copy [sdd-template.md](sdd-template.md) → `docs/architecture/<feature>-design.md` for non-trivial features
4. Copy [test-plan-template.md](test-plan-template.md) → `docs/product/<feature>/test-plan.md`
5. Log the change request in [change-request-log.md](change-request-log.md) if it changes approved scope

### After each release
1. Copy [vdd-template.md](vdd-template.md) → `docs/iso29110/releases/vX.Y.Z.md`
2. Fill in what changed, known issues, and installation notes
3. Update [progress-log.md](progress-log.md) with a status entry

### Tracking risks
- Add new risks to [risk-register.md](risk-register.md) immediately when identified
- Review the register at every progress meeting

### Project closure
- Add a closure section to [progress-log.md](progress-log.md) using the closure template at the bottom of that file

---

## Existing Docs That Map to ISO 29110

These project docs already satisfy ISO 29110 outputs — no duplication needed:

| Existing Doc | Satisfies |
|---|---|
| [docs/product/roadmap.md](../product/roadmap.md) | PM.O1 schedule & milestones |
| [docs/architecture/overview.md](../architecture/overview.md) | SI.O2 system architecture |
| [docs/architecture/database.md](../architecture/database.md) | SI.O2 data design |
| [docs/architecture/decisions.md](../architecture/decisions.md) | SI.O2 design rationale (ADRs) |
| [docs/development/testing.md](../development/testing.md) + [testing-guide.md](../development/testing-guide.md) | SI.O4-O5 test strategy |
| [docs/operations/deployment.md](../operations/deployment.md) | SI.O6 installation / deployment |
| [docs/operations/security.md](../operations/security.md) | SI.O2 security design |
| [docs/api/](../api/) | SI.O1 interface specification |
| `CHANGELOG.md` / git tags | SI.O7 version history |

---

## Compliance Checklist (per release)

Before tagging a production release (`v*.*.*`), verify:

- [ ] PM.O1: Project Plan is current (team, risks updated)
- [ ] PM.O2: Progress status recorded for this iteration
- [ ] SI.O1: SRS exists for every new feature in this release
- [ ] SI.O2: SDD exists for every new/changed architecture component
- [ ] SI.O4: Unit tests written and passing (`go test -cover ./...` / `vitest`)
- [ ] SI.O5: Integration tested (smoke test + E2E where applicable)
- [ ] SI.O6: User guide updated for any user-facing changes
- [ ] SI.O7: VDD created for this release tag
- [ ] Change requests logged and approved
- [ ] Risk register reviewed

---

*Standard: ISO/IEC 29110-4-1:2018 Software Engineering — Lifecycle Profiles for VSEs — Basic Profile*
