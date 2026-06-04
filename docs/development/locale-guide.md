---
version: 1.1.0
lastUpdated: 2026-03-07
author: Sathittham Sangthong
---

# Locale and Date/Time Format Guide

## Quick Reference

| Context | Format | Example |
|---------|--------|---------|
| **API Storage (Firestore)** | UTC ISO 8601 | `2026-02-01T08:30:00Z` |
| **API Response** | UTC ISO 8601 | `2026-02-01T08:30:00Z` |
| **Frontend Display** | Browser locale | `Feb 1, 2026, 3:30 PM` |
| **Timezone** | Asia/Bangkok | UTC+7 |

---

## Backend (Go) — API Layer

### Always Use UTC

```go
// Correct — always store and return UTC
now := time.Now().UTC().Format(time.RFC3339)
// Output: "2026-02-01T08:30:00Z"

// Wrong — never use local time
now := time.Now().Format(time.RFC3339) // Don't do this!
```

### Date/Time Formats

| Use Case | Format | Go Code |
|----------|--------|---------|
| API response | RFC3339 | `time.Now().UTC().Format(time.RFC3339)` |
| Log timestamp | RFC3339 | `time.Now().UTC().Format(time.RFC3339)` |
| Date only | YYYY-MM-DD | `time.Now().UTC().Format("2006-01-02")` |

### Firestore Model Example

```go
type Assessment struct {
    ID          string `json:"id" firestore:"id"`
    UID         string `json:"uid" firestore:"uid"`
    OverallScore float64 `json:"overallScore" firestore:"overallScore"`
    SubmittedAt string `json:"submittedAt" firestore:"submittedAt"` // Always UTC ISO 8601
    CreatedAt   string `json:"createdAt" firestore:"createdAt"`
}

// Service layer — timestamps set here
func (s *Service) SubmitQuiz(ctx context.Context, uid string, answers []Answer) (*Assessment, error) {
    now := time.Now().UTC().Format(time.RFC3339)
    assessment := &Assessment{
        ID:          uuid.New().String(),
        UID:         uid,
        SubmittedAt: now,
        CreatedAt:   now,
    }
    // ...
}
```

### Parsing Dates from Requests

```go
func parseDate(dateStr string) (time.Time, error) {
    // Try RFC3339 first (full timestamp)
    if t, err := time.Parse(time.RFC3339, dateStr); err == nil {
        return t.UTC(), nil
    }

    // Try date-only format
    if t, err := time.Parse("2006-01-02", dateStr); err == nil {
        return t.UTC(), nil
    }

    return time.Time{}, fmt.Errorf("invalid date format: %s", dateStr)
}
```

---

## Frontend Display Rules

The backend **never** formats dates for display — it always returns UTC ISO 8601. The frontend converts to local time for display.

### Using Intl.DateTimeFormat (Recommended)

Use the browser's built-in `Intl.DateTimeFormat` for locale-aware formatting — no extra library needed:

```typescript
// Short date
new Intl.DateTimeFormat('th-TH', { dateStyle: 'short' }).format(new Date(utcDate))
// → "1/2/69"

// Medium date
new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(utcDate))
// → "1 ก.พ. 2569"

// Full date + time
new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
}).format(new Date(utcDate))
// → "1 กุมภาพันธ์ 2569 15:30"
```

### Display Formats

| Context | Thai (`th-TH`) | English (`en-US`) |
|---------|----------------|-------------------|
| Short date | `1/2/69` | `2/1/2026` |
| Medium date | `1 ก.พ. 2569` | `Feb 1, 2026` |
| Full date | `1 กุมภาพันธ์ 2569` | `February 1, 2026` |
| Date + time | `1 ก.พ. 2569 15:30` | `Feb 1, 2026, 3:30 PM` |
| Time only | `15:30` | `3:30 PM` |

### Helper Function

```typescript
const formatDate = (utcDate: string, style: 'short' | 'medium' | 'long' = 'medium') => {
    return new Intl.DateTimeFormat('th-TH', {
        dateStyle: style,
        timeZone: 'Asia/Bangkok',
    }).format(new Date(utcDate));
};

const formatDateTime = (utcDate: string) => {
    return new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Bangkok',
    }).format(new Date(utcDate));
};
```

---

## Thai Buddhist Calendar

Thailand uses Buddhist Era (พ.ศ.) which is 543 years ahead of the Gregorian calendar.

`Intl.DateTimeFormat` with `th-TH` locale handles Buddhist Era automatically — no manual conversion needed.

| Context | Calendar | Example |
|---------|----------|---------|
| Frontend display (Thai) | Buddhist Era | 1 ก.พ. 2569 |
| API dates | Gregorian (ISO 8601) | 2026-02-01T08:30:00Z |
| Export files | Gregorian | 2026-02-01 |

---

## Multi-Language Support (Implemented)

Multi-language (TH/EN) with a language switcher is already implemented. Key components:

- `useLocale()` hook manages current locale state
- Language switcher in the header allows toggling between Thai and English
- Quiz questions are bilingual (`textTh`/`textEn` fields in `questions.json`)
- Dimension names are bilingual (`nameTh`/`nameEn`)
- UI text uses locale-aware rendering

### Date Formatting with Locale

The helper functions shown above are **recommended patterns** but not yet implemented as shared utilities. Currently, date formatting uses `toLocaleDateString()` directly in components. Consider extracting shared helpers as the app grows.

---

## Best Practices

### Do

1. **Always store dates in UTC** — API and Firestore
2. **Always use ISO 8601 (RFC3339)** for API responses
3. **Convert to local time only for display** — frontend responsibility
4. **Use `Intl.DateTimeFormat`** for locale-aware formatting (zero dependencies)
5. **Use `Asia/Bangkok` timezone** explicitly when displaying local time
6. **Use Buddhist Era** for Thai locale display (automatic with `th-TH`)

### Don't

1. **Don't store local time** — always UTC in Firestore and API responses
2. **Don't hardcode date formats** — use locale-aware formatting
3. **Don't assume timezone** — always convert explicitly
4. **Don't mix calendar systems** — API is Gregorian, display is locale-based
5. **Don't format dates in backend** for display — frontend handles all display formatting

### API Date Field Naming

```go
// Correct — camelCase, consistent naming
type Record struct {
    CreatedAt   string `json:"createdAt" firestore:"createdAt"`     // ISO 8601 UTC
    UpdatedAt   string `json:"updatedAt" firestore:"updatedAt"`     // ISO 8601 UTC
    SubmittedAt string `json:"submittedAt" firestore:"submittedAt"` // ISO 8601 UTC
}
```

---

## Testing Dates

### Go Tests

```go
func TestDateFormatting(t *testing.T) {
    // Use fixed time for reproducible tests
    fixedTime := time.Date(2026, 2, 1, 8, 30, 0, 0, time.UTC)

    formatted := fixedTime.Format(time.RFC3339)
    expected := "2026-02-01T08:30:00Z"

    if formatted != expected {
        t.Errorf("expected %s, got %s", expected, formatted)
    }
}
```

### Frontend Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('date formatting', () => {
    it('formats UTC date for Thai locale', () => {
        const utcDate = '2026-02-01T08:30:00Z';
        const formatted = new Intl.DateTimeFormat('th-TH', {
            dateStyle: 'medium',
            timeZone: 'Asia/Bangkok',
        }).format(new Date(utcDate));
        expect(formatted).toContain('2569'); // Buddhist Era
    });
});
```

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated multi-language section from "Phase 2 future" to "Implemented", added date formatting note |
