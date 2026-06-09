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
