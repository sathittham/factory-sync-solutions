// Shared server-data types. These describe payloads fetched from the backend and
// are consumed by the TanStack Query hooks in `@/lib/queries` and the pages that
// render them. Client state (in-progress quiz answers) lives in `@/store/quizSlice`.

export interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  dimensionNameTh: string;
  score: number;
  maxScore: number;
}

export interface Assessment {
  id: string;
  uid: string;
  quizId: string;
  scores: DimensionScore[];
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  diagnosis: string;
  submittedAt: string;
}

export interface RubricLevel {
  th: string;
  en: string;
}

export interface QuizQuestion {
  id: string;
  dimensionId: string;
  textTh: string;
  textEn: string;
  descriptionTh?: string;
  descriptionEn?: string;
  rubric?: Record<string, RubricLevel>;
}

export interface QuizDimension {
  id: string;
  nameTh: string;
  nameEn: string;
  weight: number;
}

export interface QuizListItem {
  id: string;
  nameTh: string;
  nameEn: string;
}
