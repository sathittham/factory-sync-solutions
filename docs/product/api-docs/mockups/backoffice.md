# web-backoffice · API Docs Publishing — ASCII Mockups

Surface: `web-backoffice` (internal staff portal, React + shadcn/ui · Tailwind).
The feature's only screen is the superadmin Help / API Docs page. Staff-role users never
see the Help sidebar item at all.

---

## 1. `/help/api-docs` — API Docs viewer (superadmin only)

### 1a. State: loaded

```
┌──────────────────────┬──────────────────────────────────────────────────────────────┐
│  ◉ FactorySync BO     │  ☰   Help — API Docs                    EN ▾    ☼    ◍ Admin │
│                       ├──────────────────────────────────────────────────────────────┤
│    Dashboard          │   API Documentation                                          │
│    Users              │   Inspect the published OpenAPI spec per environment         │
│    Projects           │                                                              │
│    Staff              │   ┌────────────────────────────────────────────────────┐    │
│  ▰ Help               │   │ [API v1 ▾]   env: staging   OpenAPI 2.0            │    │
│    └ API Docs         │   │ commit abc123d · generated 14 มิ.ย. 2569 15:00     │    │
│                       │   │              [Download JSON]  [Download YAML]      │    │
│                       │   └────────────────────────────────────────────────────┘    │
│                       │   ┌────────────────────────────────────────────────────┐    │
│                       │   │  ▸ profile     GET  /api/v1/profile                │    │
│                       │   │  ▸ quiz        GET  /api/v1/quizzes                │    │
│                       │   │  ▸ result      POST /api/v1/results        …       │    │
│                       │   │  ▸ admin       GET  /api/v1/admin/users            │    │
│  ───────────────────  │   │        (Swagger UI — expandable operations)        │    │
│  ◍ Super Admin…   ⇅   │   └────────────────────────────────────────────────────┘    │
└──────────────────────┴──────────────────────────────────────────────────────────────┘

[API v1 ▾] is a shadcn Select fed by GET /backoffice/api-docs/versions.
Dates via formatDateTime() — Thai locale shows Buddhist Era (พ.ศ.).
```

### 1b. State: loading

```
   ┌────────────────────────────────────────────────────┐
   │ [API v1 ▾]   ░░░░░░░░░░░░   ░░░░░░░░              │
   ├────────────────────────────────────────────────────┤
   │              ⟳  Loading API documentation…         │
   │              ░░░░░░░░░░░░░░░░░░░░░░░░░░            │
   └────────────────────────────────────────────────────┘
```

### 1c. State: error / artifact missing

```
   ┌────────────────────────────────────────────────────┐
   │ ⚠  API documentation is unavailable                │
   │    The spec could not be loaded for this version.  │
   │    Local dev: run `make docs-api` to generate it.  │
   │                                       [Retry]      │
   └────────────────────────────────────────────────────┘

Localized (TH/EN). Backend returned 404 (ErrAPIDocsNotFound) or 500.
```

### 1d. State: staff role (denial)

```
┌──────────────────────┬──────────────────────────────────────────────┐
│  ◉ FactorySync BO     │  Sidebar has NO Help item for staff.         │
│    Dashboard          │                                              │
│    Users              │  Direct navigation to /help/api-docs is      │
│    Projects           │  blocked by SuperAdminGuard; direct API      │
│  (no Help item)       │  calls return 403 before any R2 read.        │
└──────────────────────┴──────────────────────────────────────────────┘
```

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
