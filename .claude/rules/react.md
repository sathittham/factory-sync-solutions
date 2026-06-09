---
description: React frontend conventions — shadcn/ui, Redux Toolkit, i18n, dayjs, Tailwind, accessibility
paths:
  - "apps/fs-app-web/**/*.tsx"
  - "apps/fs-app-web/**/*.ts"
  - "apps/fs-official-web/**/*.tsx"
  - "apps/fs-official-web/**/*.ts"
  - "apps/fs-official-web/**/*.astro"
---

# React Frontend Rules

> Applies to both frontends: `fs-app-web` (React 19 + Vite, the authenticated app) and
> `fs-official-web` (Astro 6 + React 19 islands, the marketing site). shadcn/ui, `useLocale()`,
> Biome, and the no-nested-ternary rule apply to both. Redux Toolkit / RTK Query apply to
> `fs-app-web` only — the official site has no store.

## Stack

- **Framework**: React 19 + Vite (`fs-app-web`) · Astro 6 + React 19 islands (`fs-official-web`)
- **State**: Redux Toolkit
- **UI**: shadcn/ui (Radix-based) + Tailwind CSS
- **i18n**: custom `useLocale()` hook — TH/EN in `apps/fs-app-web/src/lib/i18n.tsx`
- **Date**: `dayjs` with `buddhistEra` plugin — utility at `apps/fs-app-web/src/lib/dayjs.ts`
- **Linter**: Biome

## Base Font Size

`17px` — this app serves aging factory workers. Never use `text-xs` for primary content.

## shadcn/ui — ALWAYS use instead of native HTML

Available components: `Button`, `Badge`, `Card`, `Dialog`, `Input`, `Select`, `Skeleton`, `Tabs`

```tsx
// ✅ Use shadcn/ui Select for controlled selects (filters, dropdowns)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ✅ Use native-select wrapper ONLY for react-hook-form register() pattern
import { NativeSelect } from "@/components/ui/native-select"

// ❌ Never use native <select> or window.confirm()
```

Component paths:
- `apps/fs-app-web/src/components/ui/select.tsx` — Radix-based shadcn Select
- `apps/fs-app-web/src/components/ui/native-select.tsx` — Native `<select>` wrapper (react-hook-form only)

## i18n

```tsx
import { useLocale } from "@/lib/i18n"

function MyComponent() {
  const { t, locale } = useLocale()
  return <h1>{t("quiz.title")}</h1>
}
```

- All user-visible strings go through `t()` — never hardcode Thai or English text in JSX
- Add translations to both `th` and `en` objects in `apps/fs-app-web/src/lib/i18n.tsx`

## Date / Time

```tsx
import { formatDateTime } from "@/lib/dayjs"

// Thai locale → Buddhist Era (พ.ศ.) via BBBB token
const display = formatDateTime(date, locale)           // date only
const display = formatDateTime(date, locale, true)     // with time

// ❌ Never use
new Date().toLocaleDateString()
date.toLocaleDateString("th-TH")
```

## Redux Toolkit

```tsx
import { useDispatch, useSelector } from "react-redux"
import { selectQuizStatus } from "@/store/quizSlice"

// Slices in apps/fs-app-web/src/store/
// Use RTK Query for API calls — not raw fetch in components
```

## Component Conventions

- No nested ternaries in JSX (SonarQube S3358) — extract to variables or early returns
- No `any` type unless unavoidable — use proper TypeScript types
- Props interfaces named `<Component>Props`
- Event handlers named `handle<Action>` (not `on<Action>`)

```tsx
// ✅
const isLoading = status === "loading"
const content = isLoading ? <Skeleton /> : <QuizCard />
return <div>{content}</div>

// ❌ Nested ternary
return <div>{status === "loading" ? <Skeleton /> : status === "error" ? <Error /> : <QuizCard />}</div>
```

## Linting & Formatting

```bash
make lint-web       # npx biome check .
make lint-fix       # npx biome check --fix .
make test-web       # npx vitest run
```

## Rules

- ALWAYS use shadcn/ui components — never native `<select>`, `<dialog>`, or `window.confirm()`
- ALWAYS use `useLocale()` for text — never hardcode strings in JSX
- ALWAYS use `formatDateTime()` from `@/lib/dayjs` — never raw `toLocaleDateString()`
- No nested ternaries — extract to named variables
- Min font size `text-sm` for labels, `text-base` for content

*Version: 1.0.0*
*Last updated: 04 June 2026*
