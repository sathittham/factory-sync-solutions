---
version: 1.2.0
lastUpdated: 2026-06-11
author: Sathittham Sangthong
---

# UI Wireframes

> **Scope:** This file contains wireframes for `fs-app-web` (user-facing app)
> and `fs-official-web` (public site). Wireframes for `fs-backoffice-web`
> (FactorySync staff portal) live in
> [backoffice/feature-spec.md §4](product/backoffice/feature-spec.md) alongside
> the sidebar layout, page-level ASCII sketches, and component notes.

## 1. Landing Page (/)

```
+------------------------------------------------------+
|  [Logo] Factory Health Check              [Sign In]   |
+------------------------------------------------------+
|                                                       |
|            Factory Health Check                        |
|   Evaluate your factory's operational readiness        |
|   across 7 key dimensions                             |
|                                                       |
|         [ Sign in with Google ]                       |
|                                                       |
+------------------------------------------------------+
|                                                       |
|   How It Works                                        |
|                                                       |
|   +------------+  +------------+  +------------+      |
|   |  1. Sign   |  | 2. Answer  |  | 3. Get     |      |
|   |     In     |  |    Quiz    |  |   Results  |      |
|   | Google     |  | 35 Qs      |  | Spider     |      |
|   | account    |  | 7 areas    |  | chart +    |      |
|   |            |  |            |  | diagnosis  |      |
|   +------------+  +------------+  +------------+      |
|                                                       |
+------------------------------------------------------+
|  Footer: (c) 2026 Sathittham Sangthong                |
+------------------------------------------------------+
```

**Components**: Hero section, `Button` (shadcn), `Card` x3
**data-testid**: `auth-google-signin-btn`

## 2. Registration Page (/register)

### Mobile

```
+----------------------------+
| [<-] Register              |
+----------------------------+
|                            |
| Company Information        |
|                            |
| Company Name *             |
| [____________________]     |
|                            |
| Registration ID (13 digits)|
| [____________________]     |
|                            |
| Industry Type *            |
| [Select industry   v]     |
|                            |
| Company Size *             |
| ( ) Small  ( ) Medium     |
| ( ) Large                  |
|                            |
| Contact Information        |
|                            |
| Contact Name *             |
| [____________________]     |
|                            |
| Contact Email *            |
| [____________________]     |
|                            |
| Contact Phone *            |
| [____________________]     |
|                            |
| [Turnstile Widget]         |
|                            |
| [ Submit Registration ]    |
|                            |
+----------------------------+
```

### Desktop

```
+------------------------------------------------------+
| [Logo] Factory Health Check              [User Menu]  |
+------------------------------------------------------+
|                                                       |
|  +--------------------------------------------------+|
|  | Register Your Company                             ||
|  |                                                   ||
|  | Company Information                               ||
|  | +---------------------+ +---------------------+  ||
|  | | Company Name *      | | Registration ID *   |  ||
|  | | [________________]  | | [________________]  |  ||
|  | +---------------------+ +---------------------+  ||
|  |                                                   ||
|  | +---------------------+ +---------------------+  ||
|  | | Industry Type *     | | Company Size *      |  ||
|  | | [Select...     v]   | | () S  () M  () L   |  ||
|  | +---------------------+ +---------------------+  ||
|  |                                                   ||
|  | Contact Information                               ||
|  | +---------------+ +---------------+ +-----------+ ||
|  | | Name *        | | Email *       | | Phone *   | ||
|  | | [__________]  | | [__________]  | | [_______] | ||
|  | +---------------+ +---------------+ +-----------+ ||
|  |                                                   ||
|  | [Turnstile]            [ Submit Registration ]    ||
|  +--------------------------------------------------+|
+------------------------------------------------------+
```

**Components**: `Card`, `Input`, `Select`, `RadioGroup`, `Button` (shadcn)
**data-testid**: `registration-form`, `registration-submit-btn`

## 3. Quiz Page (/quiz)

### Mobile

```
+----------------------------+
| [<-] Quiz                  |
+----------------------------+
| Progress: [========  ] 60% |
+----------------------------+
| Step 4 of 7                |
|                            |
| > 1. Quality               |
| > 2. Safety                |
| > 3. Equipment             |
| * 4. Workforce    <active> |
|   5. Digital               |
|   6. Supply Chain          |
|   7. Environment           |
+----------------------------+
|                            |
| Workforce & Training       |
|                            |
| Q1. New employees receive  |
| structured onboarding...   |
|                            |
| ( ) 1  ( ) 2  ( ) 3       |
| ( ) 4  (x) 5              |
|                            |
| Q2. A skills matrix...     |
|                            |
| ( ) 1  ( ) 2  (x) 3       |
| ( ) 4  ( ) 5              |
|                            |
| ... (Q3-Q5)                |
|                            |
| [Previous]     [Next]      |
+----------------------------+
```

### Desktop

```
+------------------------------------------------------+
| [Logo] Factory Health Check              [User Menu]  |
+------------------------------------------------------+
| Progress: [========================          ] 60%    |
+------------------------------------------------------+
|                                                       |
| [1.Quality] [2.Safety] [3.Equipment] [4.Workforce*]  |
| [5.Digital] [6.Supply] [7.Environment]                |
|                                                       |
| +--------------------------------------------------+ |
| | Workforce & Training                     4 of 7  | |
| |                                                   | |
| | +----------------------------------------------+  | |
| | | Q1. New employees receive structured         |  | |
| | |     onboarding and role-specific training.   |  | |
| | |                                              |  | |
| | | ( ) 1  ( ) 2  ( ) 3  ( ) 4  (x) 5          |  | |
| | +----------------------------------------------+  | |
| |                                                   | |
| | +----------------------------------------------+  | |
| | | Q2. A skills matrix or competency map        |  | |
| | |     exists for all production roles.         |  | |
| | |                                              |  | |
| | | ( ) 1  ( ) 2  (x) 3  ( ) 4  ( ) 5          |  | |
| | +----------------------------------------------+  | |
| |                                                   | |
| | ... (Q3-Q5)                                       | |
| |                                                   | |
| |              [Previous]      [Next]               | |
| +--------------------------------------------------+ |
+------------------------------------------------------+
```

**Components**: `Progress`, `RadioGroup`, `Card`, `Button` (shadcn)
**data-testid**: `quiz-stepper`, `quiz-question-card`, `quiz-next-btn`, `quiz-prev-btn`, `quiz-submit-btn`

## 4. Result Page (/results)

### Mobile

```
+----------------------------+
| [<-] Results               |
+----------------------------+
|                            |
|   +--------------------+   |
|   |   Overall Score    |   |
|   |                    |   |
|   |      3.75          |   |
|   |   Established      |   |
|   +--------------------+   |
|                            |
|   +--------------------+   |
|   |   [Spider Chart]   |   |
|   |                    |   |
|   |   7-axis radar     |   |
|   |   showing all      |   |
|   |   dimension scores |   |
|   +--------------------+   |
|                            |
|   Strengths                |
|   +--------------------+   |
|   | Quality Mgmt  4.2  |   |
|   +--------------------+   |
|   | Safety        3.8  |   |
|   +--------------------+   |
|                            |
|   Weaknesses               |
|   +--------------------+   |
|   | Digital Trans 2.1  |   |
|   +--------------------+   |
|                            |
|  [ Email Me My Results ]   |
|                            |
+----------------------------+
```

### Desktop

```
+------------------------------------------------------+
| [Logo] Factory Health Check              [User Menu]  |
+------------------------------------------------------+
|                                                       |
|  +-------------+  +--------------------------------+  |
|  |  Overall    |  |                                |  |
|  |   Score     |  |       [Spider Chart]           |  |
|  |             |  |                                |  |
|  |   3.75      |  |   7-axis radar chart           |  |
|  | Established |  |   showing dimension scores     |  |
|  |             |  |                                |  |
|  +-------------+  +--------------------------------+  |
|                                                       |
|  +------------------------+ +----------------------+  |
|  | Strengths              | | Weaknesses           |  |
|  | +--------------------+ | | +------------------+ |  |
|  | | Quality Mgmt  4.2 | | | | Digital Trans 2.1| |  |
|  | +--------------------+ | | +------------------+ |  |
|  | | Safety        3.8 | | |                      |  |
|  | +--------------------+ | |                      |  |
|  +------------------------+ +----------------------+  |
|                                                       |
|          [ Email Me My Results ]                      |
|                                                       |
+------------------------------------------------------+
```

**Components**: `Card`, `Badge`, Recharts `RadarChart`, `Button`, `Toast` (shadcn)
**data-testid**: `result-summary`, `result-spider-chart`, `result-strengths-panel`, `result-weaknesses-panel`, `result-email-success`, `result-email-error`

## 5. Admin Dashboard (/admin)

```
+------------------------------------------------------+
| [Logo] Factory Health Check              [Admin Menu] |
+------------------------------------------------------+
|                                                       |
| Admin Dashboard                                       |
|                                                       |
| +----------+ +----------+ +----------+ +----------+  |
| | Total    | | Avg      | | Advanced | | Beginning|  |
| | Submissions| Score   | | Count    | | Count    |  |
| | 142      | | 3.45    | | 28       | | 12       |  |
| +----------+ +----------+ +----------+ +----------+  |
|                                                       |
| Filters:                                              |
| [Industry Type v]  [Company Size v]  [Export CSV]     |
|                                                       |
| +--------------------------------------------------+ |
| | Company         | Score | Diagnosis  | Date       | |
| |-----------------|-------|------------|------------| |
| | ABC Factory     | 4.2   | Advanced   | 2026-03-01| |
| | XYZ Mfg         | 2.8   | Developing | 2026-02-28| |
| | Thai Parts Co.  | 3.6   | Established| 2026-02-25| |
| | ...             |       |            |           | |
| +--------------------------------------------------+ |
|                                                       |
|  [< Prev]  Page 1 of 5  [Next >]                    |
+------------------------------------------------------+
```

**Components**: `Card` (stats), `Select` (filters), `Table`, `Button` (shadcn)
**data-testid**: `admin-assessment-table`, `admin-filter-industry`, `admin-filter-size`, `admin-export-csv-btn`

## Notes

> **Not yet wireframed**: The following pages/elements exist in implementation but are not yet documented here:
> - **Profile Page (`/profile`)**: Editable company profile with pre-filled registration data
> - **Navigation header**: Hamburger menu (mobile), language toggle (TH/EN), user menu
> - The "Email Me My Results" button shown in the Result Page wireframe is planned but not yet implemented in the frontend.

## 6. 404 Page

```
+------------------------------------------------------+
| [Logo] Factory Health Check                           |
+------------------------------------------------------+
|                                                       |
|                   404                                 |
|            Page Not Found                             |
|                                                       |
|   The page you are looking for does not exist.        |
|                                                       |
|              [ Go Home ]                              |
|                                                       |
+------------------------------------------------------+
```

## 7. Email Template

```
+------------------------------------------------------+
| Factory Health Check - Your Results                   |
+------------------------------------------------------+
|                                                       |
| Hello [Contact Name],                                 |
|                                                       |
| Here are your Factory Health Check results for        |
| [Company Name]:                                       |
|                                                       |
| Overall Score: 3.75 / 5.0                            |
| Diagnosis: Established                                |
|                                                       |
| Dimension Scores:                                     |
| +----------------------------+-------+                |
| | Quality Management         | 4.2   |                |
| | Safety & Compliance        | 3.8   |                |
| | Equipment & Maintenance    | 3.6   |                |
| | Workforce & Training       | 3.4   |                |
| | Digital Transformation     | 2.1   |                |
| | Supply Chain Management    | 4.0   |                |
| | Environmental Sustain.     | 3.2   |                |
| +----------------------------+-------+                |
|                                                       |
| Strengths: Quality Management, Safety, Supply Chain   |
| Weaknesses: Digital Transformation                    |
|                                                       |
| Thank you for using Factory Health Check.             |
|                                                       |
+------------------------------------------------------+
| (c) 2026 Sathittham Sangthong                        |
+------------------------------------------------------+
```

## Design System Notes

### Color Palette (Tailwind)

| Use | Color |
|-----|-------|
| Primary action | `blue-600` |
| Success / Strength | `green-600` |
| Warning / Weakness | `red-600` |
| Neutral scores | `gray-500` |
| Background | `white` / `gray-50` |
| Text primary | `gray-900` |
| Text secondary | `gray-500` |

### Typography

| Element | Mobile | Desktop |
|---------|--------|---------|
| Page title | `text-xl font-bold` | `text-2xl font-bold` |
| Section heading | `text-lg font-semibold` | `text-xl font-semibold` |
| Body text | `text-sm` | `text-base` |
| Score display | `text-3xl font-bold` | `text-4xl font-bold` |

### Responsive Breakpoints

| Screen | Layout |
|--------|--------|
| Mobile (default) | Single column, vertical stepper |
| Tablet (`md:`) | Two columns for forms, horizontal stepper |
| Desktop (`lg:`) | Full-width tables, side-by-side panels |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Fixed /result → /results route, added notes about missing wireframes (ProfilePage, nav, email button) |
