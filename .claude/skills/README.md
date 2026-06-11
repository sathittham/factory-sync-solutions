# Skills

Skills are slash commands that run a specific, step-by-step procedure. Unlike agents (which are persistent personas), skills are invoked for a single task and guide Claude through a defined workflow.

## How to Invoke

Type `/skill-name` in Claude Code:

```
/commit                              # stage, commit, and push current changes
/code-review                         # review all changed files vs main
/code-review apps/fs-backend/services/quiz/ # review a specific service
```

---

## Available Skills

| Skill | Description | Usage |
|-------|-------------|-------|
| `commit` | Stage and commit with project convention, then push | `/commit` or `/commit "description"` |
| `code-review` | Review Go and React changes for security, correctness, performance | `/code-review` or `/code-review <path>` |
| `iso29110` | ISO 29110 compliance helper — checklist, VDD, SRS, test plan, risk register, health status | `/iso29110 status`, `/iso29110 checklist`, `/iso29110 vdd v1.0.0`, `/iso29110 srs <feature>`, `/iso29110 test-plan <feature>`, `/iso29110 progress`, `/iso29110 risk` |
| `new-service` | Scaffold a new Go service with handler + service + models + tests + sentinel errors | `/new-service <name>` |
| `swagger-sync` | Sync swagger annotations in Go Chi handlers and regenerate swagger docs | `/swagger-sync <service>` or `/swagger-sync all` |
| `doc-review` | Review docs/ files for accuracy, currency, and ISO 29110 artifact alignment | `/doc-review` or `/doc-review docs/product/<feature>/` |

---

## Skill File Format

```markdown
---
name: skill-name
allowed-tools: Bash(git status:*), Read, Write   # scope what tools the skill can use
description: One sentence — what this skill does and when to run it
---

# Skill Title

[Brief persona — who you are when running this skill]

## Context
- Current branch: !`git branch --show-current`
- Changed files: !`git diff --name-only HEAD`

## How to Use This Skill

## [Procedure Sections]
Step-by-step instructions

## Rules
- [Hard constraints]
```

### Key conventions

- **`allowed-tools`** scopes what tools the skill can use — be specific
- **Live context** (`!` commands) injects current state at invocation
- **File name**: `SKILL.md` (uppercase) inside a directory matching the skill name

---

*Version: 1.0.0*
*Last updated: 04 June 2026*
