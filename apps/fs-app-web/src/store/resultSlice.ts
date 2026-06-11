import { type PayloadAction, createSlice } from '@reduxjs/toolkit';

interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  dimensionNameTh: string;
  score: number;
  maxScore: number;
}

interface Assessment {
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

interface ResultState {
  assessment: Assessment | null;
  assessments: Assessment[];
  loading: boolean;
}

const initialState: ResultState = {
  assessment: null,
  assessments: [],
  loading: false,
};

const resultSlice = createSlice({
  name: 'result',
  initialState,
  reducers: {
    setAssessment(state, action: PayloadAction<Assessment | null>) {
      state.assessment = action.payload;
    },
    setAssessments(state, action: PayloadAction<Assessment[]>) {
      state.assessments = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setAssessment, setAssessments, setLoading } = resultSlice.actions;
export default resultSlice.reducer;
export type { Assessment, DimensionScore };
