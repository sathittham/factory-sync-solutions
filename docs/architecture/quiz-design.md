---
version: 2.0.0
lastUpdated: 2026-03-08
author: Sathittham Sangthong
---

# Quiz Design

## Overview

The Factory Health Check quiz evaluates manufacturing factory production management maturity across 8 dimensions based on the Shindan methodology. Users answer 43 questions (variable per dimension) on a 1-5 rubric scale with dimension-specific level descriptions. Scores are computed per dimension and aggregated into an overall diagnosis.

Source: `docs/ประเมิน 8 ด้านการผลิต_rev2.3.xls`

## Dimensions

| # | Dimension (TH) | Dimension (EN) | Questions | Key Topics |
|---|----------------|----------------|-----------|------------|
| 1 | การจัดการงานเบื้องต้น | Basic Management | 6 | 5S, Visual Management, 3MU, Work Environment, 5G, OJT |
| 2 | การปรับปรุงการทำงาน | Work Improvement | 4 | QCC, Kaizen Culture, Tools & Equipment, Setup Time (SMED) |
| 3 | การประสานงาน | Coordination | 4 | Leadership, Data Utilization, Recreation, Goal Setting |
| 4 | การบำรุงรักษา | Maintenance (TPM) | 4 | Preventive Maintenance, Daily Inspection, Activity Groups, Measurement Tools |
| 5 | การควบคุมคุณภาพ/การประกันคุณภาพ | Quality Control & Assurance | 6 | 5W/PPM, Traceability, Poka-Yoke, ISO/GMP, SOPs, Internal QC Communication |
| 6 | การผลิต การควบคุม การส่งมอบ | Production, Control & Delivery | 8 | Lot Size, Work Orders, Delivery Planning, Lead Time, Layout, Multi-Skill, Sales Data, IT Systems |
| 7 | การควบคุมวัสดุ | Material Control | 5 | WIP/Finished Goods, Advance Ordering, ABC Analysis, Inventory Control, Internal Handling |
| 8 | การควบคุมต้นทุน | Cost Control | 6 | Cost System, Profit Plan, VE/VA, Problem-Solving Teams, IE/Workflow, Supplier Management |

**Total: 43 questions**

## Answer Scale (1-5 Rubric)

Each question has its own rubric descriptions for levels 1-5. Unlike a generic Likert scale, each level describes a specific maturity state for that topic.

### General Pattern

| Level | General Description |
|-------|-------------------|
| 1 | No system / not understood / no interest |
| 2 | Planning stage / studying / policy exists |
| 3 | Partially implemented / in practice |
| 4 | Checked, evaluated, and raised standards |
| 5 | Fully effective with prevention and continuous improvement |

## Sample Question (with Rubric)

> **Note**: Each question has bilingual fields (`textTh`/`textEn`) and a `rubric` object with level descriptions for 1-5. See `apps/backend/config/questions*.json` for the full set.

```json
{
  "id": "bm-1",
  "dimensionId": "basic-management",
  "textTh": "5 ส.",
  "textEn": "5S (Sort, Set, Shine, Standardize, Sustain)",
  "weight": 1.0,
  "rubric": {
    "1": { "th": "สับสน", "en": "Confused / no system" },
    "2": { "th": "กำลังวางแผน", "en": "Planning stage" },
    "3": { "th": "ลงมือทำแต่ยังไม่สมบูรณ์", "en": "Implementing but not yet complete" },
    "4": { "th": "มีการตรวจเช็คและยกระดับ", "en": "Check and raise standards" },
    "5": { "th": "มีการแก้ไขและป้องกัน", "en": "Corrective and preventive actions" }
  }
}
```

## Scoring Algorithm

### 1. Dimension Score

Weighted average of answers within a dimension:

```
dimensionScore = sum(answer[i].value * question[i].weight) / sum(question[i].weight)
```

With default weight 1.0, variable questions per dimension (4-8 questions).

Result: **1.0 - 5.0**

### 2. Overall Score

Average of all 8 dimension scores:

```
overallScore = sum(dimensionScores) / 8
```

Result: **1.0 - 5.0**

### 3. Rounding

All scores are rounded to **2 decimal places** before classification:

```go
score = math.Round(score*100) / 100
```

### 4. Strengths and Weaknesses

| Classification | Threshold |
|---------------|-----------|
| Strength | Dimension score >= 3.50 |
| Weakness | Dimension score < 2.50 |
| Neutral | 2.50 – 3.49 (not shown as strength or weakness) |

### 5. Diagnosis Categories

Boundaries are **inclusive on the lower bound, exclusive on the upper bound** (except Advanced which includes 5.0):

| Score Range | Category (EN) | Category (TH) | Description |
|-------------|---------------|---------------|-------------|
| >= 4.00 | Advanced | ก้าวหน้า | Factory demonstrates excellence across most areas |
| >= 3.00 and < 4.00 | Established | มั่นคง | Solid foundation in place with room for targeted improvement |
| >= 2.00 and < 3.00 | Developing | กำลังพัฒนา | Basic practices exist but significant gaps remain |
| >= 1.00 and < 2.00 | Beginning | เริ่มต้น | Minimal practices in place, needs fundamental improvement |

## Configuration File

Location: `apps/backend/config/questions*.json`

```json
{
  "version": "2.0.0",
  "dimensions": [
    { "id": "basic-management", "nameTh": "การจัดการงานเบื้องต้น", "nameEn": "Basic Management", "weight": 1.0 },
    { "id": "work-improvement", "nameTh": "การปรับปรุงการทำงาน", "nameEn": "Work Improvement", "weight": 1.0 },
    ...
  ],
  "questions": [
    {
      "id": "bm-1",
      "dimensionId": "basic-management",
      "textTh": "5 ส.",
      "textEn": "5S (Sort, Set, Shine, Standardize, Sustain)",
      "weight": 1.0,
      "rubric": {
        "1": { "th": "สับสน", "en": "Confused / no system" },
        "2": { "th": "กำลังวางแผน", "en": "Planning stage" },
        "3": { "th": "ลงมือทำแต่ยังไม่สมบูรณ์", "en": "Implementing but not yet complete" },
        "4": { "th": "มีการตรวจเช็คและยกระดับ", "en": "Check and raise standards" },
        "5": { "th": "มีการแก้ไขและป้องกัน", "en": "Corrective and preventive actions" }
      }
    }
  ]
}
```

## UX Design

### Quiz Flow

1. User lands on `/quiz` after registration
2. Stepper shows 8 steps (one per dimension)
3. Each step shows question cards (4-8 per dimension) with rubric-based 1-5 selection
4. Each level shows its specific rubric description (not generic Likert labels)
5. Previous / Next navigation between steps
6. Progress bar shows overall completion (0-100%)
7. Final step shows Submit button (enabled only when all 43 questions answered)
8. On submit: loading indicator, then redirect to `/results`

### Stepper Layout

- **Mobile**: Horizontal scrollable tabs at top, question cards below
- **Tablet+**: Horizontal tabs at top, question cards below

### Validation

- All 43 questions must be answered before submission
- Unanswered questions highlighted when user tries to skip ahead
- No partial submissions allowed

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 2.0.0 | 2026-03-08 | Migrate to 8-dimension Shindan production management assessment (43 questions) with rubric-style scoring from XLS; variable questions per dimension (4-8) |
| 1.1.0 | 2026-03-07 | Update configuration schema to match actual bilingual format (`nameTh`/`nameEn`, `textTh`/`textEn`, `dimensionId`); fix `/result` to `/results` |
| 1.0.0 | 2026-03-06 | Initial version |
