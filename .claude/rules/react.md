---
description: React frontend conventions — shadcn/ui, Redux Toolkit, i18n, dayjs, Tailwind, accessibility
paths:
  - "apps/web-app/**/*.tsx"
  - "apps/web-app/**/*.ts"
  - "apps/web-official/**/*.tsx"
  - "apps/web-official/**/*.ts"
  - "apps/web-official/**/*.astro"
---

# React Frontend Rules

> Applies to both frontends: `web-app` (React 19 + Vite, the authenticated app) and
> `web-official` (Astro 6 + React 19 islands, the marketing site). shadcn/ui, `useLocale()`,
> Biome, and the no-nested-ternary rule apply to both. Redux Toolkit, TanStack Query, and TanStack
> Table apply to `web-app` only — the official site has no store.

## Stack

- **Framework**: React 19 + Vite (`web-app`) · Astro 6 + React 19 islands (`web-official`)
- **Client state**: Redux Toolkit — auth session, in-progress quiz answers, UI state
- **Server state**: `@tanstack/react-query` — data fetched from the backend (`web-app` only)
- **UI**: shadcn/ui (Radix-based) + Tailwind CSS
- **Tables**: `@tanstack/react-table` via the reusable `DataTable` (`components/ui/data-table.tsx`)
- **Forms**: `@tanstack/react-form` + shadcn `Field`/`FieldGroup` (`web-app` only)
- **i18n**: custom `useLocale()` hook — TH/EN in `apps/web-app/src/lib/i18n.tsx`
- **Date**: `dayjs` with `buddhistEra` plugin — utility at `apps/web-app/src/lib/dayjs.ts`
- **Linter**: Biome

## Base Font Size

`17px` — this app serves aging factory workers. Never use `text-xs` for primary content.

## shadcn/ui — ALWAYS use instead of native HTML

Available components: `Button`, `Badge`, `Card`, `Dialog`, `Field`, `FieldGroup`, `Input`, `Select`, `Skeleton`, `Tabs`

```tsx
// ✅ Use shadcn/ui Select for controlled selects (filters, dropdowns)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ❌ Never use native <select> or window.confirm()
```

Component paths:
- `apps/web-app/src/components/ui/select.tsx` — Radix-based shadcn Select
- `apps/web-app/src/components/ui/field.tsx` — `Field`, `FieldGroup`, `FieldLabel`, `FieldError`, `FieldDescription`

## Forms (web-app only) — ALWAYS use TanStack Form

All forms in `apps/web-app` use `@tanstack/react-form` with shadcn `Field`/`FieldGroup` components.
Reference implementation: `apps/web-app/src/components/login-form.tsx`.

```tsx
import { useForm } from '@tanstack/react-form'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import * as z from 'zod'

export function MyForm() {
  const { t } = useLocale()

  const emailSchema = z.string().min(1, t('...')).email(t('...'))

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      // call API, set Firebase error via setError state
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }}>
      <FieldGroup>
        <form.Field name="email" validators={{ onBlur: emailSchema, onSubmit: emailSchema }}>
          {(field) => {
            const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>{t('...')}</FieldLabel>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>
      </FieldGroup>
    </form>
  )
}
```

Rules:
- Zod validators go on **field-level** `validators.onBlur` + `validators.onSubmit` (not form-level) — allows conditional fields (e.g. signin vs reset mode)
- `form.state.isSubmitting` replaces manual `isLoading` state for form submission
- Async/Firebase errors (not validation errors) stay in local `useState`
- `form.reset()` to clear form state on mode/step changes
- `field.state.meta.errors` contains `{ message: string }` objects from Zod — pass directly to `<FieldError errors={...} />`
- All validator error messages must go through `t()` — define zod schemas inside the component where `t` is available
- **Never use `react-hook-form`** in `web-app`

## i18n

```tsx
import { useLocale } from "@/lib/i18n"

function MyComponent() {
  const { t, locale } = useLocale()
  return <h1>{t("quiz.title")}</h1>
}
```

- All user-visible strings go through `t()` — never hardcode Thai or English text in JSX
- Add translations to both `th` and `en` objects in `apps/web-app/src/lib/i18n.tsx`

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

## State: server vs client

Two owners — keep the boundary clean:

- **Server state → TanStack Query.** Anything fetched from the backend (assessments, results, quiz
  configs). Use `useQuery`/`useMutation` — never hand-roll `fetch` + `useState(loading/error)` +
  `useEffect` in components. Fetch through the `api` helper in `@/lib/api` inside the `queryFn`.
  The `QueryClient` lives in `@/lib/queryClient`; the provider is wired in `App.tsx`.
- **Client state → Redux Toolkit.** Auth session, in-progress quiz answers, and other UI state that is
  not owned by the backend. Do NOT mirror server data into Redux.

```tsx
// ✅ Server state
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const { data = [], isPending, isError } = useQuery({
  queryKey: ['admin-assessments', industryFilter, sizeFilter],
  queryFn: () => api.get<AdminAssessment[]>('/admin/assessments'),
})

// ✅ Client state
import { useSelector } from 'react-redux'
import { selectQuizStatus } from '@/store/quizSlice' // slices in apps/web-app/src/store/
```

> Historical note: earlier revisions specified RTK Query. As of CR-003 the project standardized on
> TanStack Query for server state (the app already uses `@tanstack/react-form` and `@tanstack/react-table`).

## Tables — use the `DataTable` (TanStack Table)

Tabular data uses `@tanstack/react-table` via the reusable `DataTable` in
`components/ui/data-table.tsx` — never hand-roll `<table>` with manual sort/filter/pagination state.
It provides client-side sorting, pagination, and a search box, plus an optional `renderExpandedRow`
for accordion detail rows. Per-column responsive classes go through column `meta.headerClassName` /
`meta.cellClassName`. Reference usage: the assessment table in `pages/AdminPage.tsx`.

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
- ALWAYS use `@tanstack/react-form` + `Field`/`FieldGroup` for forms in `web-app` — never `react-hook-form`
- ALWAYS use `useLocale()` for text — never hardcode strings in JSX
- ALWAYS use `formatDateTime()` from `@/lib/dayjs` — never raw `toLocaleDateString()`
- No nested ternaries — extract to named variables
- Min font size `text-sm` for labels, `text-base` for content

*Version: 1.2.0*
*Last updated: 01 July 2026*
