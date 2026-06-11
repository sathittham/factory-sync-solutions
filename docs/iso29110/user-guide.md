---
isoOutput: SI.O6
version: 1.0.0
lastUpdated: 2026-06-11
author: Sathittham Sangthong
audience: End users (factory operators), Backoffice staff
---

# User Guide — FactorySync Solutions

*ISO 29110 Basic Profile · SI.O6 User Documentation*

---

## 1. Introduction

**FactorySync Solutions** is a web-based factory health assessment platform for Thai SME manufacturers. It helps factory operators measure their operational maturity across multiple dimensions using structured quizzes, and provides a scored report with strengths, weaknesses, and a diagnosis.

**Who this guide is for:**
- **Factory operators / end users** — take quizzes, view results
- **Backoffice staff** — manage projects, users, and assessment results
- **System admins** — manage access and staff roles

---

## 2. Getting Started

### 2.1 System Requirements

| Requirement | Details |
|---|---|
| Browser | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| Internet | Required (cloud-based application) |
| Screen | Minimum 320px width; mobile, tablet, and desktop supported |
| Language | Thai and English (switchable via language toggle) |

### 2.2 Sign In

1. Open the application URL in your browser.
2. Click **Sign in with Google** on the landing page.
3. Select your Google account.
4. You will be redirected to the registration page on your first sign-in.

### 2.3 Registration (First-Time Users)

1. After signing in, complete the registration form:
   - **Company Name** (required)
   - **Company Registration ID** — 13-digit Thai tax ID. Click **ค้นหา (Lookup)** to auto-fill company details from DBD.
   - **Industry Type** (dropdown)
   - **Company Size** (dropdown)
2. Click **Register**.
3. You will be redirected to the quiz selection page.

---

## 3. Taking a Quiz

### 3.1 Select a Quiz

From the dashboard, choose a quiz variant:

| Quiz | Focus | Dimensions | Questions |
|---|---|---|---|
| FactorySync Shindan | Production management | 8 | 43 |
| Factory Assessment | Overall factory health | 7 | 49 |
| Lean Business | Lean manufacturing | 12 | 29 |
| Cybersecurity | IT security posture | 8 | 51 |
| ISO 29110 | Software process maturity | 8 | 38 |

### 3.2 Answering Questions

1. Each question asks you to rate your current practice from **1 to 5**.
2. The rubric (description for each level) is shown on each question card.
3. Use **Previous** / **Next** to move between dimensions.
4. The progress bar shows how many questions you have answered.
5. The **Submit** button appears on the last dimension tab and becomes active once all questions are answered.

**Rating scale:**
| Score | General meaning |
|---|---|
| 1 | Not performed / no practice in place |
| 2 | Partially performed / ad-hoc |
| 3 | Performed / outcomes achieved |
| 4 | Managed / planned and tracked |
| 5 | Established / standardised and continuously improved |

### 3.3 Submitting

1. Click **Submit Assessment**.
2. Wait for the result to load (typically 1–3 seconds).
3. You will be redirected to your Results page automatically.

---

## 4. Viewing Results

### 4.1 Result Summary

The result page shows:

- **Overall Score** (1.00–5.00) and **Diagnosis**:
  | Score | Diagnosis (EN) | Diagnosis (TH) |
  |---|---|---|
  | ≥ 4.00 | Advanced | ก้าวหน้า |
  | 3.00–3.99 | Established | มั่นคง |
  | 2.00–2.99 | Developing | กำลังพัฒนา |
  | < 2.00 | Beginning | เริ่มต้น |

- **Radar Chart** — dimension scores plotted on a spider chart
- **Dimension Scores** — individual score for each dimension
- **Strengths** — dimensions scoring ≥ 3.50
- **Weaknesses** — dimensions scoring < 2.50

### 4.2 Previous Results

Use the **Assessment Selector** dropdown at the top of the result page to view any previous submission.

### 4.3 ISO 29110 Results

For the ISO 29110 quiz, overall score also maps to a **Capability Level**:

| Score | ISO 29110 Capability Level |
|---|---|
| 5.00 | Level 3 — Established (มีมาตรฐาน) |
| 4.00–4.99 | Level 2 — Managed (มีการจัดการ) |
| 3.00–3.99 | Level 1 — Performed (ดำเนินการได้) |
| 2.00–2.99 | Level 1 Partial — Partially Performed (ดำเนินการบางส่วน) |
| < 2.00 | Level 0 — Not Performed (ยังไม่ดำเนินการ) |

---

## 5. Profile Management

1. Click your name in the navigation bar.
2. Select **Profile** to edit your company information.
3. Update fields and click **Save**.

---

## 6. Backoffice Portal (Staff Only)

> Access requires Firebase custom claim `role = "backoffice"` or `role = "super_admin"`.
> Contact a super admin to request access.

### 6.1 Sign In to Backoffice

1. Open the backoffice URL (separate from the main app).
2. Sign in with your Google account that has been granted backoffice access.

### 6.2 Dashboard

Overview cards showing: total projects, total users, recent assessments.

### 6.3 Projects

- **List** — view all registered company projects
- **Detail** — view members, assessments, and project information for a specific company

### 6.4 Users

- View all registered users
- See user profile, project membership, and submission history

### 6.5 Results

- View all assessment results across all users
- Filter by quiz type, date range, industry, company size

### 6.6 Staff Management (Super Admin only)

- Grant / revoke `backoffice` or `super_admin` role
- Manage staff accounts

---

## 7. Frequently Asked Questions

**Q: Can I retake a quiz?**
Yes. Previous results are saved. You can submit a new assessment at any time and compare results using the history selector.

**Q: Is my data private?**
Assessment data is stored securely in Google Cloud Firestore. Only you and authorised backoffice staff can view your results. See [docs/operations/security.md](../operations/security.md) for details.

**Q: What language does the app support?**
Thai and English. Use the language toggle in the navigation bar to switch.

**Q: I cannot access the backoffice portal.**
Your account must be granted the `backoffice` role by a super admin. Contact the system administrator.

**Q: The DBD lookup didn't find my company.**
Ensure you entered the correct 13-digit Thai company registration ID. If the lookup fails, you can enter company details manually.

---

## 8. Support & Contact

For technical issues, contact the system administrator or open an issue on the project repository.

---

## Document History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0.0 | 2026-06-11 | Sathittham | Initial user guide |
