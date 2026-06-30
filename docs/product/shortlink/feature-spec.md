---
version: 1.0.0
lastUpdated: 2026-06-15
author: Sathittham Sangthong
status: Planning
---

# Shortlink Service — Feature Spec

> A URL shortening service that creates short links (like bit.ly), tracks analytics
> including click counts and geographic data, and generates QR codes for each
> shortlink. Authenticated users can create and manage their own shortlinks through
> both API and UI surfaces.

---

## 1. Summary

The shortlink service provides authenticated users with the ability to convert long
web URLs into short, shareable links (e.g., `https://fs.link/abc123`). Each shortlink
tracks analytics data including total clicks, unique visitors, geographic distribution,
device types, and referrer sources. Users can generate QR codes for their shortlinks
and view analytics through both API endpoints and a dedicated frontend interface.

**Key features:**
- URL shortening with customizable slug (optional)
- Click analytics with detailed breakdown
- QR code generation
- Bilingual support (TH/EN)
- User-scoped shortlinks (users only see their own)
- RESTful API following project conventions
- Real-time analytics aggregation

---

## 2. Goals & Non-Goals

### Goals

- Provide authenticated users with URL shortening functionality
- Track comprehensive analytics for each shortlink (clicks, geography, devices, referrers)
- Generate QR codes for shortlinks in SVG format
- Expose RESTful API endpoints for shortlink CRUD operations
- Create a user-friendly frontend interface for shortlink management
- Implement proper authentication and authorization
- Follow project conventions (Chi router, Firestore, Firebase Auth, pkg helpers)
- Support bilingual UI (TH/EN)
- Rate limit shortlink creation to prevent abuse

### Non-Goals

- Public anonymous shortlink creation (all users must be authenticated)
- Custom domain support (will use `fs.link` domain initially)
- Link expiration or TTL (all links permanent unless deleted)
- Bulk shortlink creation (one at a time)
- Link preview metadata (Open Graph tags)
- Social media sharing integrations
- Export analytics data (CSV/Excel)
- Shortlink redirects with query parameter preservation (will preserve existing params)

---

## 3. Current State

| Component | Location | Status |
|-----------|----------|--------|
| Shortlink service | `services/shortlink/` | ❌ Not created |
| Shortlink handler | `services/shortlink/handler.go` | ❌ Not created |
| Shortlink models | `services/shortlink/models.go` | ❌ Not created |
| Shortlink service layer | `services/shortlink/service.go` | ❌ Not created |
| Firestore schema | `firestore.rules` | ❌ Not created |
| Frontend components | `apps/web-app/src/components/` | ❌ Not created |
| Frontend pages | `apps/web-app/src/pages/` | ❌ Not created |
| Analytics API | `services/shortlink/handler.go` | ❌ Not created |
| QR code generation | `services/shortlink/qrcode.go` | ❌ Not created |
| Tests | `services/shortlink/service_test.go` | ❌ Not created |

---

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ ShortlinkList   │  │ CreateShortlink │  │AnalyticsView│ │
│  │ (manage links)  │  │   (form)        │  │  (charts)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API (Chi router)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Go + Chi)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Shortlink Handler                          │ │
│  │  POST   /api/v1/shortlinks        (create)              │ │
│  │  GET    /api/v1/shortlinks        (list own)            │ │
│  │  GET    /api/v1/shortlinks/:id    (get details)         │ │
│  │  DELETE /api/v1/shortlinks/:id    (delete)              │ │
│  │  GET    /api/v1/shortlinks/:id/analytics (stats)        │ │
│  │  GET    /s/:slug                    (redirect)           │ │
│  └────────────────────────────────────────────────────────┘ │
│                            │                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Shortlink Service                          │ │
│  │  - Business logic                                        │ │
│  │  - Slug generation (nanoid)                              │ │
│  │  - QR code generation (SVG)                              │ │
│  │  - Click analytics aggregation                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Firestore (NoSQL)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Firestore Collections                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  shortlinks/{shortlinkID}                            │  │
│  │  { uid, originalURL, slug, createdAt, clicks }       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  clicks/{clickID}                                    │  │
│  │  { shortlinkID, uid, slug, userAgent, ip, country,   │  │
│  │    city, device, referrer, clickedAt }               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. UI Layout

### Shortlink Management Page (`/shortlinks`)

```
┌──────────────────────────────────────────────────────────────┐
│  Shortlinks                                                  │
│  Create and manage your short links with analytics           │
│                                                              │
│  [Create Shortlink] [Filter: All | Active | Archived]        │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Delete]  fs.link/abc123                               │ │
│  │ Original: https://example.com/very-long-url-...         │ │
│  │ Created: 2026-06-15 08:00 | Clicks: 42                 │ │
│  │ [View Analytics] [Copy Link] [Download QR]             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Delete]  fs.link/xyz789                               │ │
│  │ Original: https://another-site.com/path/to/page        │ │
│  │ Created: 2026-06-14 15:30 | Clicks: 128                │ │
│  │ [View Analytics] [Copy Link] [Download QR]             │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Create Shortlink Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  Create Shortlink                                            │
│  Enter a URL to create a short, shareable link               │
├─────────────────────────────────────────────────────────────┤
│  Original URL *                                              │
│  [https://example.com/very-long-url-that-needs-shortening]  │
│  ✅ Valid URL                                                │
│                                                              │
│  Custom Slug (optional)                                      │
│  [my-custom-slug                      ] Max 20 chars        │
│  Leave blank for auto-generated                             │
│                                                              │
│  [Create Shortlink]  [Cancel]                                │
└─────────────────────────────────────────────────────────────┘
```

### Analytics View

```
┌──────────────────────────────────────────────────────────────┐
│  Analytics: fs.link/abc123                                   │
│  [← Back to Shortlinks]                                      │
│                                                              │
│  Total Clicks: 1,234 | Unique Visitors: 856                  │
│                                                              │
│  Clicks Over Time (Line Chart)                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1500 ┤     ╭─────╮                                      │ │
│  │ 1000 ┤   ╭─╯     ╰─────╮                                │ │
│  │  500 ┤ ╭─╯             ╰──                             │ │
│  │    0 └───────────────────────────────────────────────  │ │
│  │        Jun 1  Jun 5  Jun 10  Jun 15                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Geographic Distribution (Map or Bar Chart)                  │
│  🇹🇭 Thailand: 856 (69%)  🇺🇸 USA: 247 (20%)  🇯🇵 Japan: 131 (11%) │
│                                                              │
│  Device Types (Pie Chart)                                    │
│  📱 Mobile: 723 (59%)  💻 Desktop: 432 (35%)  📱 Tablet: 79 (6%) │
│                                                              │
│  Top Referrers                                                │
│  1. google.com: 456 clicks                                   │
│  2. facebook.com: 234 clicks                                 │
│  3. direct: 312 clicks                                       │
│                                                              │
│  Recent Clicks Table                                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Time          | Country | Device    | Referrer          │ │
│  │ 2026-06-15 08:00 | 🇹🇭    | Mobile    | google.com        │ │
│  │ 2026-06-15 07:45 | 🇺🇸    | Desktop   | direct            │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Backend API

### POST `/api/v1/shortlinks`

Create a new shortlink for the authenticated user.

**Auth:** Firebase ID token (Bearer). UID extracted from context.

**Request body**

```jsonc
{
  "originalURL": "https://example.com/very-long-url-that-needs-shortening",
  "customSlug": "my-custom-slug"  // optional, max 20 chars, alphanumeric + hyphen
}
```

**Response — 201** (`ShortlinkResponse`)
```jsonc
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "uid": "firebase-uid",
    "originalURL": "https://example.com/very-long-url-that-needs-shortening",
    "shortURL": "https://fs.link/abc123",
    "slug": "abc123",
    "qrCodeSVG": "<svg>...</svg>",
    "totalClicks": 0,
    "uniqueClicks": 0,
    "createdAt": "2026-06-15T08:00:00Z",
    "updatedAt": "2026-06-15T08:00:00Z"
  }
}
```

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Invalid URL, customSlug format, or slug already exists |
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 429 | `RATE_LIMIT_EXCEEDED` | User exceeded shortlink creation rate limit |
| 500 | `INTERNAL_ERROR` | Firestore write failed |

---

### GET `/api/v1/shortlinks`

List all shortlinks for the authenticated user.

**Auth:** Firebase ID token (Bearer).

**Query params**

| Param | Default | Description |
|-------|---------|-------------|
| `limit` | `50` | Max `100` |
| `offset` | `0` | Pagination offset |
| `sortBy` | `createdAt` | `createdAt` \| `totalClicks` |
| `sortOrder` | `desc` | `asc` \| `desc` |

**Response — 200**
```jsonc
{
  "success": true,
  "data": [
    {
      "id": "uuid-v4",
      "uid": "firebase-uid",
      "originalURL": "https://example.com/very-long-url",
      "shortURL": "https://fs.link/abc123",
      "slug": "abc123",
      "qrCodeSVG": "<svg>...</svg>",
      "totalClicks": 42,
      "uniqueClicks": 38,
      "createdAt": "2026-06-15T08:00:00Z",
      "updatedAt": "2026-06-15T08:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### GET `/api/v1/shortlinks/:id`

Get details of a specific shortlink.

**Auth:** Firebase ID token (Bearer).

**Path params**

| Param | Description |
|-------|-------------|
| `id` | Shortlink UUID |

**Response — 200:** Same shape as POST response.

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 403 | `FORBIDDEN` | Shortlink belongs to another user |
| 404 | `NOT_FOUND` | Shortlink not found (`ErrShortlinkNotFound`) |

---

### DELETE `/api/v1/shortlinks/:id`

Delete a shortlink.

**Auth:** Firebase ID token (Bearer).

**Response — 204** (No Content)

**Errors**

| HTTP | Code | Condition |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 403 | `FORBIDDEN` | Shortlink belongs to another user |
| 404 | `NOT_FOUND` | Shortlink not found |
| 500 | `INTERNAL_ERROR` | Firestore deletion failed |

---

### GET `/api/v1/shortlinks/:id/analytics`

Get detailed analytics for a shortlink.

**Auth:** Firebase ID token (Bearer).

**Query params**

| Param | Default | Description |
|-------|---------|-------------|
| `startDate` | 30 days ago | ISO 8601 date |
| `endDate` | now | ISO 8601 date |

**Response — 200**
```jsonc
{
  "success": true,
  "data": {
    "shortlinkID": "uuid-v4",
    "slug": "abc123",
    "totalClicks": 1234,
    "uniqueClicks": 856,
    "clicksOverTime": [
      { "date": "2026-06-01", "clicks": 45 },
      { "date": "2026-06-02", "clicks": 52 }
    ],
    "geographicDistribution": [
      { "country": "TH", "countryName": "Thailand", "clicks": 856 },
      { "country": "US", "countryName": "United States", "clicks": 247 }
    ],
    "deviceBreakdown": [
      { "device": "mobile", "clicks": 723 },
      { "device": "desktop", "clicks": 432 },
      { "device": "tablet", "clicks": 79 }
    ],
    "topReferrers": [
      { "referrer": "google.com", "clicks": 456 },
      { "referrer": "facebook.com", "clicks": 234 },
      { "referrer": "direct", "clicks": 312 }
    ],
    "recentClicks": [
      {
        "clickedAt": "2026-06-15T08:00:00Z",
        "country": "TH",
        "countryName": "Thailand",
        "city": "Bangkok",
        "device": "mobile",
        "referrer": "google.com"
      }
    ]
  }
}
```

---

### GET `/s/:slug`

Public redirect endpoint. Logs analytics without requiring authentication.

**No auth required.** This is the public-facing shortlink.

**Path params**

| Param | Description |
|-------|-------------|
| `slug` | Shortlink slug (alphanumeric + hyphen) |

**Behavior:**
1. Look up shortlink by slug
2. Log click event to `clicks/{clickID}` collection
3. Extract metadata (user agent, IP, referrer, geo-location)
4. Redirect to original URL (HTTP 301)

**Response — 301** (Permanent Redirect) to `originalURL`

**Errors**

| HTTP | Condition |
|------|-----------|
| 404 | Shortlink not found or deleted |

---

## 7. Firestore Schema

### Collection: `shortlinks/{shortlinkID}`

| Field | Type | Mutable | Description |
|-------|------|---------|-------------|
| `id` | string | ❌ | UUIDv4 |
| `uid` | string | ❌ | Firebase UID of owner |
| `originalURL` | string | ❌ | Full original URL |
| `shortURL` | string | ❌ | Full short URL (`https://fs.link/{slug}`) |
| `slug` | string | ❌ | Short slug (alphanumeric + hyphen, max 20 chars) |
| `qrCodeSVG` | string | ❌ | QR code SVG |
| `totalClicks` | int64 | ✅ | Total click count (incremented on each click) |
| `uniqueClicks` | int64 | ✅ | Unique click count (based on IP + user agent) |
| `createdAt` | string | ❌ | ISO 8601 (UTC) |
| `updatedAt` | string | ✅ | ISO 8601 (UTC) |

**Indexes:**
- `uid` (for listing user's shortlinks)
- `slug` (unique, for redirect lookup)

---

### Collection: `clicks/{clickID}`

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUIDv4 |
| `shortlinkID` | string | Foreign key to `shortlinks` |
| `slug` | string | Shortlink slug (for analytics grouping) |
| `uid` | string | Owner UID (for query scoping) |
| `userAgent` | string | Browser user agent string |
| `ip` | string | Client IP address |
| `country` | string | ISO 3166-1 alpha-2 country code |
| `countryName` | string | Full country name (optional) |
| `city` | string | City name (optional) |
| `device` | string | `mobile` \| `desktop` \| `tablet` |
| `referrer` | string | Referrer URL or `direct` |
| `clickedAt` | string | ISO 8601 (UTC) |

**Indexes:**
- `shortlinkID` + `clickedAt` (for analytics queries)
- `slug` + `clickedAt` (for analytics queries)
- `uid` + `clickedAt` (for user-scoped analytics)
- `clickedAt` (for cleanup/retention policies)

**TTL:** Click data retained for 90 days (configurable).

---

## 8. QR Code Generation

QR codes are generated as SVG strings using the `github.com/skip2/go-qrcode` package
or similar lightweight library.

**Specifications:**
- Size: 200x200 pixels
- Error correction: Medium (15%)
- Background: White
- Foreground: Black
- Format: SVG (scalable, lightweight)
- Embedded data: Full short URL (`https://fs.link/{slug}`)

**Storage:** QR code SVG stored in `shortlinks/{shortlinkID}.qrCodeSVG` field.

**Download:** Frontend offers SVG download as `qrcode-{slug}.svg`.

---

## 9. Service Layer Design

### `shortlink.Service` Interface

```go
type Service interface {
    CreateShortlink(ctx context.Context, uid string, req *CreateShortlinkRequest) (*Shortlink, error)
    GetShortlink(ctx context.Context, uid, id string) (*Shortlink, error)
    ListShortlinks(ctx context.Context, uid string, limit, offset int, sortBy, sortOrder string) ([]*Shortlink, int64, error)
    DeleteShortlink(ctx context.Context, uid, id string) error
    GetAnalytics(ctx context.Context, uid, id string, startDate, endDate time.Time) (*Analytics, error)
    RecordClick(ctx context.Context, slug string, metadata *ClickMetadata) error
    GetShortlinkBySlug(ctx context.Context, slug string) (*Shortlink, error)
}
```

### Sentinel Errors

```go
var (
    ErrShortlinkNotFound    = errors.New("shortlink not found")
    ErrSlugAlreadyExists    = errors.New("slug already exists")
    ErrInvalidURL           = errors.New("invalid URL format")
    ErrInvalidSlug          = errors.New("invalid slug format")
    ErrShortlinkAccessDenied = errors.New("access denied to shortlink")
)
```

---

## 10. Frontend Components

### `CreateShortlinkDialog`

**Location:** `apps/web-app/src/components/CreateShortlinkDialog.tsx`

**Props:** `open: boolean`, `onOpenChange: (open: boolean) => void`, `onSuccess: (shortlink: Shortlink) => void`

**Features:**
- URL validation (Zod schema)
- Custom slug input with character counter
- Real-time slug availability check
- Loading state during creation
- Error handling with inline messages
- Success callback for parent component

---

### `ShortlinkList`

**Location:** `apps/web-app/src/components/ShortlinkList.tsx`

**Props:** `shortlinks: Shortlink[]`, `onDelete: (id: string) => void`, `onViewAnalytics: (id: string) => void`

**Features:**
- Card-based layout
- Copy to clipboard functionality
- Download QR code button
- Delete confirmation dialog (shadcn `AlertDialog`)
- Empty state illustration
- Loading skeleton

---

### `ShortlinkAnalyticsPage`

**Location:** `apps/web-app/src/pages/ShortlinkAnalyticsPage.tsx`

**Route:** `/shortlinks/:id/analytics`

**Features:**
- Date range picker (last 7/30/90 days, custom)
- Clicks over time line chart (recharts)
- Geographic distribution chart (bar or map)
- Device breakdown pie chart
- Top referrers table
- Recent clicks table with pagination
- Export analytics button (future)

---

### `ShortlinkListPage`

**Location:** `apps/web-app/src/pages/ShortlinkListPage.tsx`

**Route:** `/shortlinks`

**Features:**
- List all user's shortlinks
- Create button (opens `CreateShortlinkDialog`)
- Filter by status (future: active/archived)
- Sort by date or click count
- Search by slug or original URL
- Pagination

---

## 11. Redux Integration

### `shortlinksSlice`

**Location:** `apps/web-app/src/store/shortlinksSlice.ts`

**State:**
```typescript
interface ShortlinksState {
  shortlinks: Shortlink[];
  currentShortlink: Shortlink | null;
  analytics: Analytics | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}
```

**Actions:**
- `fetchShortlinks` - `GET /api/v1/shortlinks`
- `createShortlink` - `POST /api/v1/shortlinks`
- `deleteShortlink` - `DELETE /api/v1/shortlinks/:id`
- `fetchAnalytics` - `GET /api/v1/shortlinks/:id/analytics`
- `copyShortlink` - Copy to clipboard utility

---

## 12. Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `SHORTLINK_DOMAIN` | No | `fs.link` | Base domain for short URLs |
| `SHORTLINK_RATE_LIMIT` | No | `10/hour` | Shortlink creation rate limit per user |
| `CLICK_RETENTION_DAYS` | No | `90` | Days to retain click analytics data |
| `GEOLOCATION_API_KEY` | No | — | Optional geolocation API key (MaxMind, IPInfo) |

---

## 13. Security & Privacy

### Authentication
- All management endpoints require Firebase ID token
- UID extracted from context via `middleware.GetUID(r)`
- Users can only access their own shortlinks

### Rate Limiting
- Shortlink creation: 10 per hour per user (configurable)
- Redirect endpoint: 100 per minute per IP (to prevent abuse)

### Privacy
- IP addresses logged for analytics only
- IP addresses not exposed in API responses
- Click data retention: 90 days (configurable)
- User agents stored but not exposed in aggregate analytics

### Input Validation
- Original URL: Must be valid HTTP/HTTPS URL
- Custom slug: Alphanumeric + hyphen, max 20 chars, unique
- Slug generation: nanoid (7 chars, URL-safe) if not provided

---

## 14. Open Tasks

### 14.1 Backend Implementation
- [ ] Create `services/shortlink/` directory structure
- [ ] Implement `models.go` with request/response structs
- [ ] Implement `service.go` with business logic
- [ ] Implement `handler.go` with Chi routes and swagger annotations
- [ ] Implement `qrcode.go` for SVG generation
- [ ] Write table-driven tests in `service_test.go`
- [ ] Add Firestore security rules for `shortlinks` and `clicks`
- [ ] Update `main.go` to wire shortlink routes

### 14.2 Frontend Implementation
- [ ] Create `ShortlinkListPage` component
- [ ] Create `CreateShortlinkDialog` component
- [ ] Create `ShortlinkList` component
- [ ] Create `ShortlinkAnalyticsPage` component
- [ ] Implement `shortlinksSlice` in Redux
- [ ] Add shortlink routes to router
- [ ] Add navigation menu item
- [ ] Implement charts for analytics (recharts)

### 14.3 Analytics Enhancement
- [ ] Implement geolocation lookup (IP → country/city)
- [ ] Implement user agent parsing (device detection)
- [ ] Add real-time analytics aggregation
- [ ] Implement analytics caching for performance

### 14.4 Future Enhancements
- [ ] Custom domain support per user
- [ ] Shortlink expiration/TTL
- [ ] Bulk shortlink creation
- [ ] Export analytics (CSV/Excel)
- [ ] A/B testing for shortlinks
- [ ] UTM parameter tracking and reporting

---

## 15. Acceptance Criteria

### Backend
- [ ] `POST /api/v1/shortlinks` creates a shortlink and returns 201 with slug, shortURL, and qrCodeSVG
- [ ] Custom slug validation rejects invalid formats and existing slugs
- [ ] Auto-generated slugs use nanoid (7 chars, URL-safe, unique)
- [ ] `GET /api/v1/shortlinks` returns only the authenticated user's shortlinks
- [ ] `GET /api/v1/shortlinks/:id` returns 403 for shortlinks owned by other users
- [ ] `DELETE /api/v1/shortlinks/:id` deletes shortlink and returns 204
- [ ] `GET /s/:slug` redirects to original URL with 301 status
- [ ] `GET /s/:slug` logs click event to `clicks` collection
- [ ] `GET /api/v1/shortlinks/:id/analytics` returns aggregated analytics data
- [ ] Analytics include: totalClicks, uniqueClicks, clicksOverTime, geographicDistribution, deviceBreakdown, topReferrers, recentClicks
- [ ] Rate limiting enforced on shortlink creation (10/hour per user)
- [ ] `make test-api` passes for all shortlink service tests
- [ ] Swagger annotations present on all endpoints

### Frontend
- [ ] `/shortlinks` page renders list of user's shortlinks
- [ ] "Create Shortlink" button opens dialog with URL input
- [ ] URL validation prevents invalid URLs
- [ ] Custom slug input shows character count (max 20)
- [ ] Creating shortlink updates list without page reload
- [ ] Copy link button copies short URL to clipboard
- [ ] Download QR button downloads SVG file
- [ ] Delete button shows confirmation dialog before deletion
- [ ] View Analytics button navigates to analytics page
- [ ] Analytics page shows charts for clicks over time, geography, devices
- [ ] Analytics page shows top referrers and recent clicks tables
- [ ] All UI text uses i18n (TH/EN)
- [ ] Date/time formatting uses `formatDateTime()` from `@/lib/dayjs`
- [ ] `make lint-web` and `make test-web` pass

### Integration
- [ ] Clicking a shortlink (`/s/:slug`) increments click count in Firestore
- [ ] Click analytics appear in frontend within 5 seconds (eventual consistency acceptable)
- [ ] QR code scans redirect correctly to original URL
- [ ] Shortlink creation rate limit displays user-friendly error message
- [ ] Deleted shortlinks return 404 on redirect attempts

---

## 16. Testing

### Unit Tests (`service_test.go`)

**Shortlink Creation:**
- `CreateShortlink` with valid URL returns shortlink with generated slug
- `CreateShortlink` with custom slug returns shortlink with that slug
- `CreateShortlink` with duplicate custom slug returns `ErrSlugAlreadyExists`
- `CreateShortlink` with invalid URL returns `ErrInvalidURL`
- `CreateShortlink` generates valid QR code SVG

**Shortlink Retrieval:**
- `GetShortlink` returns shortlink for existing ID
- `GetShortlink` returns `ErrShortlinkNotFound` for non-existent ID
- `ListShortlinks` returns only shortlinks for the given UID

**Click Tracking:**
- `RecordClick` creates click document with metadata
- `RecordClick` increments shortlink's `totalClicks` counter
- `RecordClick` with duplicate IP+user agent increments `uniqueClicks` once

**Analytics:**
- `GetAnalytics` returns correct aggregation over date range
- `GetAnalytics` groups clicks by country correctly
- `GetAnalytics` groups clicks by device correctly
- `GetAnalytics` orders referrers by click count descending

### Integration Tests

- Create shortlink → redirect via `/s/:slug` → verify click logged
- Create shortlink with custom slug → verify slug works in redirect
- Create shortlink → delete → redirect returns 404
- Create multiple shortlinks → verify `GET /api/v1/shortlinks` returns all
- Verify rate limiting enforced after 10 creations in 1 hour

### E2E Tests (Playwright)

- Navigate to `/shortlinks` → assert list renders
- Click "Create Shortlink" → fill URL → submit → assert shortlink appears in list
- Copy shortlink → verify clipboard contains correct URL
- Delete shortlink → confirm dialog → assert shortlink removed from list
- View analytics → assert charts and tables render
- Create shortlink → open in new tab → verify redirect works
- Verify analytics increment after redirect

---

## 17. Analytics Events

| Event | Trigger | Properties |
|-------|---------|------------|
| `shortlink_create` | Shortlink created | `{ slug, hasCustomSlug: boolean }` |
| `shortlink_delete` | Shortlink deleted | `{ slug, totalClicks }` |
| `shortlink_view_analytics` | Analytics page opened | `{ shortlinkID, slug }` |
| `shortlink_copy` | Copy link clicked | `{ slug }` |
| `shortlink_qr_download` | QR code downloaded | `{ slug }` |
| `shortlink_redirect` | Public redirect executed | `{ slug }` |

---

## 18. i18n Key Map

| Key | TH (approx.) | EN |
|-----|-------------|----|
| `shortlink.title` | ลิงก์ย่อ | Shortlinks |
| `shortlink.subtitle` | สร้างและจัดการลิงก์ย่อพร้อมวิเคราะห์ | Create and manage short links with analytics |
| `shortlink.create` | สร้างลิงก์ย่อ | Create Shortlink |
| `shortlink.createTitle` | สร้างลิงก์ย่อใหม่ | Create New Shortlink |
| `shortlink.createSubtitle` | ป้อน URL เพื่อสร้างลิงก์ย่อที่แชร์ได้ | Enter a URL to create a short, shareable link |
| `shortlink.originalURL` | URL เดิม | Original URL |
| `shortlink.customSlug` | ชื่อลิงก์ย่อ (ไม่ระบุก็ได้) | Custom Slug (optional) |
| `shortlink.slugPlaceholder` | เช่น my-link | e.g. my-link |
| `shortlink.slugHint` | สูงสุด 20 ตัวอักษร ใช้ตัวอักษรและขีดกลาง | Max 20 chars, alphanumeric + hyphen |
| `shortlink.creating` | กำลังสร้าง… | Creating… |
| `shortlink.created` | สร้างสำเร็จแล้ว | Shortlink created successfully! |
| `shortlink.errorInvalidURL` | URL ไม่ถูกต้อง | Invalid URL format |
| `shortlink.errorInvalidSlug` | ชื่อลิงก์ย่อไม่ถูกต้อง | Invalid slug format |
| `shortlink.errorSlugExists` | ชื่อลิงก์ย่อนี้ถูกใช้แล้ว | This slug is already taken |
| `shortlink.errorRateLimit` | เกินจำนวนที่อนุญาต กรุณาลองใหม่ภายหลัง | Rate limit exceeded, please try again later |
| `shortlink.copy` | คัดลอกลิงก์ | Copy Link |
| `shortlink.copied` | คัดลอกแล้ว! | Copied! |
| `shortlink.downloadQR` | ดาวน์โหลด QR Code | Download QR Code |
| `shortlink.viewAnalytics` | ดูวิเคราะห์ | View Analytics |
| `shortlink.delete` | ลบ | Delete |
| `shortlink.deleteConfirm` | คุณแน่ใจหรือไม่ที่จะลบลิงก์ย่อนี้? | Are you sure you want to delete this shortlink? |
| `shortlink.deleteCancel` | ยกเลิก | Cancel |
| `shortlink.deleteConfirmBtn` | ลบ | Delete |
| `shortlink.deleted` | ลบสำเร็จแล้ว | Shortlink deleted successfully |
| `shortlink.empty` | ยังไม่มีลิงก์ย่อ | No shortlinks yet. Create your first one! |
| `shortlink.totalClicks` | คลิกทั้งหมด | Total Clicks |
| `shortlink.uniqueClicks` | คลิกไม่ซ้ำ | Unique Clicks |
| `shortlink.createdAt` | สร้างเมื่อ | Created |
| `shortlink.analytics.title` | วิเคราะห์: {slug} | Analytics: {slug} |
| `shortlink.analytics.clicksOverTime` | คลิกตามเวลา | Clicks Over Time |
| `shortlink.analytics.geographic` | การกระจายทางภูมิศาสตร์ | Geographic Distribution |
| `shortlink.analytics.devices` | ประเภทอุปกรณ์ | Device Types |
| `shortlink.analytics.referrers` | แหล่งที่มา | Top Referrers |
| `shortlink.analytics.recentClicks` | คลิกล่าสุด | Recent Clicks |
| `shortlink.analytics.time` | เวลา | Time |
| `shortlink.analytics.country` | ประเทศ | Country |
| `shortlink.analytics.device` | อุปกรณ์ | Device |
| `shortlink.analytics.referrer` | แหล่งที่มา | Referrer |
| `shortlink.analytics.direct` | โดยตรง | Direct |
| `shortlink.analytics.last7Days` | 7 วันล่าสุด | Last 7 Days |
| `shortlink.analytics.last30Days` | 30 วันล่าสุด | Last 30 Days |
| `shortlink.analytics.last90Days` | 90 วันล่าสุด | Last 90 Days |
| `shortlink.analytics.customRange` | กำหนดช่วงเวลา | Custom Range |
| `shortlink.analytics.export` | ส่งออกข้อมูล | Export Data |

---

## 19. References

- Backend structure: [AGENTS.md](../../../AGENTS.md)
- API conventions: [api/conventions.md](../../api/conventions.md)
- Error handling: [development/error-handling.md](../../development/error-handling.md)
- Go patterns: [development/go-patterns.md](../../development/go-patterns.md)
- i18n guide: [development/locale-guide.md](../../development/locale-guide.md)
- Firestore schema: [architecture/database.md](../../architecture/database.md)
- Testing guide: [development/testing-guide.md](../../development/testing-guide.md)
- Swagger setup: [api/swagger.md](../../api/swagger.md)