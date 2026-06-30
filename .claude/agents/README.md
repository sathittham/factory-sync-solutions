# Agents

Agents are AI team members with a specific role, domain expertise, and tool access. Each agent has a persona, professional context, and rules that shape how it thinks and responds.

## How to Use

In Claude Code, type `@agent-name` or select from the agent picker:

```
@backend-dev add a new endpoint to the quiz service
@frontend-dev build a result card component with shadcn/ui
@backend-dev review this Firestore query for performance
```

---

## Engineering Agents

| Agent | Role | Best for |
|-------|------|---------|
| `backend-dev` | Senior Go Engineer | New endpoints, service logic, Firestore queries, Firebase Auth, bug fixes (`apps/backend`) |
| `frontend-dev` | Senior React Engineer | UI components, pages, forms, Redux state, i18n, shadcn/ui, Biome fixes — both `apps/web-app` (React + Vite) and `apps/web-official` (Astro) |
| `qa-dev` | Senior QA Engineer | TDD tests first, handler/service test coverage, Vitest unit tests, Playwright E2E, ISO 29110 test-plan.md — both backend (Go) and frontend |
| `lead-dev` | Lead Developer | Architecture decisions, cross-cutting code reviews (Chi layering, Firestore schema, scoring correctness), TDD enforcement, technical planning |
| `security-eng` | Cybersecurity Engineer | Security audits (OWASP), Firebase Auth flow review, Firestore rules gaps, secrets exposure, pre-release security check |

---

## Persona Agents

Persona agents simulate a specific end-user. Use them to validate UX copy, quiz flows, result pages, and feature design from the user's perspective.

| Agent | Persona | Best for |
|-------|---------|---------|
| `persona-factory-manager` | Thai factory owner/manager taking the health assessment | Quiz question clarity, Thai copy naturalness, result usefulness, mobile UX, onboarding flow |

---

## Agent File Format

```markdown
---
name: agent-name
description: One sentence — WHEN to invoke this agent (not just what it is)
tools: Read, Edit, Write, Bash, Glob, Grep   # only tools the role actually needs
model: haiku | sonnet
color: blue | green | red | yellow | purple | teal | orange
---

# Agent Title

[Persona description — who they are, experience, philosophy]

## Project Context
[Factory Health Check-specific context this agent knows]

## [Domain Knowledge Sections]
[Frameworks, templates, checklists relevant to this role]

## Rules
- [Hard constraints for this agent]
```

**Model guidance**: Use `sonnet` for engineering agents. Use `haiku` for fast/simple tasks.
**Tool guidance**: Engineering agents get `Read, Edit, Write, Bash, Glob, Grep`.

---

*Version: 1.1.0*
*Last updated: 11 June 2026*
