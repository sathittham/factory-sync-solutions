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
| `backend-dev` | Senior Go Engineer | New endpoints, service logic, Firestore queries, Firebase Auth, bug fixes (`apps/fs-backend`) |
| `frontend-dev` | Senior React Engineer | UI components, pages, forms, Redux state, i18n, shadcn/ui, Biome fixes — both `apps/fs-app-web` (React + Vite) and `apps/fs-official-web` (Astro) |

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

*Version: 1.0.0*
*Last updated: 04 June 2026*
