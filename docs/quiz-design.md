---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# Quiz Design

## Overview

The Factory Health Check quiz evaluates manufacturing factory readiness across 7 dimensions. Users answer 35 questions (5 per dimension) on a 1-5 Likert scale. Scores are computed per dimension and aggregated into an overall diagnosis.

## Dimensions

| # | Dimension | Questions | Description |
|---|-----------|-----------|-------------|
| 1 | Quality Management | 5 | Quality control processes, standards, defect tracking |
| 2 | Safety & Compliance | 5 | Workplace safety, regulatory compliance, incident management |
| 3 | Equipment & Maintenance | 5 | Equipment upkeep, preventive maintenance, downtime tracking |
| 4 | Workforce & Training | 5 | Employee skills, training programs, knowledge management |
| 5 | Digital Transformation | 5 | Automation, data systems, technology adoption |
| 6 | Supply Chain Management | 5 | Supplier relationships, inventory, logistics |
| 7 | Environmental Sustainability | 5 | Waste management, energy efficiency, environmental compliance |

**Total: 35 questions**

## Answer Scale (1-5 Likert)

| Value | Label |
|-------|-------|
| 1 | Strongly Disagree / Very Poor |
| 2 | Disagree / Poor |
| 3 | Neutral / Average |
| 4 | Agree / Good |
| 5 | Strongly Agree / Excellent |

## Sample Questions

### Quality Management

```json
[
  {
    "id": "qm-1",
    "dimension": "Quality Management",
    "text": "Your factory has documented quality control procedures for all production processes.",
    "weight": 1.0
  },
  {
    "id": "qm-2",
    "dimension": "Quality Management",
    "text": "Quality metrics (defect rate, rework rate) are tracked and reviewed regularly.",
    "weight": 1.0
  },
  {
    "id": "qm-3",
    "dimension": "Quality Management",
    "text": "Your factory uses statistical process control or similar methods to monitor product quality.",
    "weight": 1.0
  },
  {
    "id": "qm-4",
    "dimension": "Quality Management",
    "text": "Customer complaints and returns are systematically recorded and addressed.",
    "weight": 1.0
  },
  {
    "id": "qm-5",
    "dimension": "Quality Management",
    "text": "Your factory holds or is pursuing quality certifications (ISO 9001 or equivalent).",
    "weight": 1.0
  }
]
```

### Safety & Compliance

```json
[
  {
    "id": "sc-1",
    "dimension": "Safety & Compliance",
    "text": "All employees receive regular safety training and know emergency procedures.",
    "weight": 1.0
  },
  {
    "id": "sc-2",
    "dimension": "Safety & Compliance",
    "text": "Safety incidents are recorded, investigated, and corrective actions are implemented.",
    "weight": 1.0
  },
  {
    "id": "sc-3",
    "dimension": "Safety & Compliance",
    "text": "Personal protective equipment (PPE) is provided and enforced across all areas.",
    "weight": 1.0
  },
  {
    "id": "sc-4",
    "dimension": "Safety & Compliance",
    "text": "Your factory complies with all applicable local and national safety regulations.",
    "weight": 1.0
  },
  {
    "id": "sc-5",
    "dimension": "Safety & Compliance",
    "text": "Regular safety audits are conducted and findings are resolved promptly.",
    "weight": 1.0
  }
]
```

### Equipment & Maintenance

```json
[
  {
    "id": "em-1",
    "dimension": "Equipment & Maintenance",
    "text": "A preventive maintenance schedule exists and is followed for all critical equipment.",
    "weight": 1.0
  },
  {
    "id": "em-2",
    "dimension": "Equipment & Maintenance",
    "text": "Equipment downtime is tracked and analyzed to identify recurring issues.",
    "weight": 1.0
  },
  {
    "id": "em-3",
    "dimension": "Equipment & Maintenance",
    "text": "Spare parts inventory is managed to minimize production disruption.",
    "weight": 1.0
  },
  {
    "id": "em-4",
    "dimension": "Equipment & Maintenance",
    "text": "Equipment operators are trained on proper usage and basic troubleshooting.",
    "weight": 1.0
  },
  {
    "id": "em-5",
    "dimension": "Equipment & Maintenance",
    "text": "Equipment performance data is used to plan replacements and upgrades.",
    "weight": 1.0
  }
]
```

### Workforce & Training

```json
[
  {
    "id": "wt-1",
    "dimension": "Workforce & Training",
    "text": "New employees receive structured onboarding and role-specific training.",
    "weight": 1.0
  },
  {
    "id": "wt-2",
    "dimension": "Workforce & Training",
    "text": "A skills matrix or competency map exists for all production roles.",
    "weight": 1.0
  },
  {
    "id": "wt-3",
    "dimension": "Workforce & Training",
    "text": "Employees have regular opportunities for upskilling and cross-training.",
    "weight": 1.0
  },
  {
    "id": "wt-4",
    "dimension": "Workforce & Training",
    "text": "Employee performance is reviewed regularly with clear feedback and development plans.",
    "weight": 1.0
  },
  {
    "id": "wt-5",
    "dimension": "Workforce & Training",
    "text": "Knowledge transfer processes exist so critical knowledge is not lost when employees leave.",
    "weight": 1.0
  }
]
```

### Digital Transformation

```json
[
  {
    "id": "dt-1",
    "dimension": "Digital Transformation",
    "text": "Production data is collected digitally (not just on paper) and accessible to decision-makers.",
    "weight": 1.0
  },
  {
    "id": "dt-2",
    "dimension": "Digital Transformation",
    "text": "Your factory uses an ERP, MES, or similar system to manage operations.",
    "weight": 1.0
  },
  {
    "id": "dt-3",
    "dimension": "Digital Transformation",
    "text": "Automation is used in repetitive or high-risk production tasks.",
    "weight": 1.0
  },
  {
    "id": "dt-4",
    "dimension": "Digital Transformation",
    "text": "Data analytics or dashboards are used to support operational decisions.",
    "weight": 1.0
  },
  {
    "id": "dt-5",
    "dimension": "Digital Transformation",
    "text": "There is a roadmap or plan for adopting new technologies in the next 1-3 years.",
    "weight": 1.0
  }
]
```

### Supply Chain Management

```json
[
  {
    "id": "sm-1",
    "dimension": "Supply Chain Management",
    "text": "Key suppliers are evaluated and performance is tracked regularly.",
    "weight": 1.0
  },
  {
    "id": "sm-2",
    "dimension": "Supply Chain Management",
    "text": "Inventory levels are managed to balance availability with cost efficiency.",
    "weight": 1.0
  },
  {
    "id": "sm-3",
    "dimension": "Supply Chain Management",
    "text": "Lead times from suppliers are predictable and meet production schedule requirements.",
    "weight": 1.0
  },
  {
    "id": "sm-4",
    "dimension": "Supply Chain Management",
    "text": "Contingency plans exist for supply chain disruptions (alternative suppliers, safety stock).",
    "weight": 1.0
  },
  {
    "id": "sm-5",
    "dimension": "Supply Chain Management",
    "text": "Logistics and warehousing are organized to minimize waste and delays.",
    "weight": 1.0
  }
]
```

### Environmental Sustainability

```json
[
  {
    "id": "es-1",
    "dimension": "Environmental Sustainability",
    "text": "Waste is sorted, tracked, and reduced through documented processes.",
    "weight": 1.0
  },
  {
    "id": "es-2",
    "dimension": "Environmental Sustainability",
    "text": "Energy consumption is monitored and initiatives exist to improve efficiency.",
    "weight": 1.0
  },
  {
    "id": "es-3",
    "dimension": "Environmental Sustainability",
    "text": "Your factory complies with all applicable environmental regulations and permits.",
    "weight": 1.0
  },
  {
    "id": "es-4",
    "dimension": "Environmental Sustainability",
    "text": "Water usage is managed responsibly with treatment for any industrial discharge.",
    "weight": 1.0
  },
  {
    "id": "es-5",
    "dimension": "Environmental Sustainability",
    "text": "Environmental goals (carbon reduction, waste minimization) are set and tracked.",
    "weight": 1.0
  }
]
```

## Scoring Algorithm

### 1. Dimension Score

Weighted average of answers within a dimension:

```
dimensionScore = sum(answer[i].value * question[i].weight) / sum(question[i].weight)
```

With default weight 1.0 and 5 questions: `dimensionScore = sum(5 answers) / 5`

Result: **1.0 - 5.0**

### 2. Overall Score

Average of all 7 dimension scores:

```
overallScore = sum(dimensionScores) / 7
```

Result: **1.0 - 5.0**

### 3. Strengths and Weaknesses

| Classification | Threshold |
|---------------|-----------|
| Strength | Dimension score >= 3.5 |
| Weakness | Dimension score < 2.5 |
| Neutral | 2.5 - 3.4 (not shown as strength or weakness) |

### 4. Diagnosis Categories

| Score Range | Category | Description |
|-------------|----------|-------------|
| 4.0 - 5.0 | Advanced | Factory demonstrates excellence across most areas |
| 3.0 - 3.9 | Established | Solid foundation in place with room for targeted improvement |
| 2.0 - 2.9 | Developing | Basic practices exist but significant gaps remain |
| 1.0 - 1.9 | Beginning | Minimal practices in place, needs fundamental improvement |

## Configuration File

Location: `apps/api/config/questions.json`

```json
{
  "version": "1.0.0",
  "dimensions": [
    {
      "id": "quality-management",
      "name": "Quality Management",
      "order": 1
    },
    {
      "id": "safety-compliance",
      "name": "Safety & Compliance",
      "order": 2
    },
    {
      "id": "equipment-maintenance",
      "name": "Equipment & Maintenance",
      "order": 3
    },
    {
      "id": "workforce-training",
      "name": "Workforce & Training",
      "order": 4
    },
    {
      "id": "digital-transformation",
      "name": "Digital Transformation",
      "order": 5
    },
    {
      "id": "supply-chain",
      "name": "Supply Chain Management",
      "order": 6
    },
    {
      "id": "environmental-sustainability",
      "name": "Environmental Sustainability",
      "order": 7
    }
  ],
  "questions": [
    {
      "id": "qm-1",
      "dimension": "Quality Management",
      "text": "Your factory has documented quality control procedures for all production processes.",
      "weight": 1.0
    }
  ]
}
```

## UX Design

### Quiz Flow

1. User lands on `/quiz` after registration
2. Stepper shows 7 steps (one per dimension)
3. Each step shows 5 question cards with 1-5 radio buttons
4. Previous / Next navigation between steps
5. Progress bar shows overall completion (0-100%)
6. Final step shows Submit button (enabled only when all 35 questions answered)
7. On submit: loading indicator, then redirect to `/result`

### Stepper Layout

- **Mobile**: Vertical stepper on the left side, question cards below
- **Tablet+**: Horizontal stepper at top, question cards below

### Validation

- All 35 questions must be answered before submission
- Unanswered questions highlighted when user tries to skip ahead
- No partial submissions allowed

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
