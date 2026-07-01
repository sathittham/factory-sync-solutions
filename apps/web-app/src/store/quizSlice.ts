import { type PayloadAction, createSlice } from '@reduxjs/toolkit';

// Client state only: the in-progress quiz (which variant, answers, step, submit flag).
// Quiz questions/dimensions and the available-quiz list are server data — fetched via
// TanStack Query hooks in `@/lib/queries`, not stored here.

interface QuizState {
  quizId: string;
  answers: Record<string, number>;
  currentStep: number;
  isSubmitting: boolean;
}

const initialState: QuizState = {
  quizId: 'shindan',
  answers: {},
  currentStep: 0,
  isSubmitting: false,
};

const quizSlice = createSlice({
  name: 'quiz',
  initialState,
  reducers: {
    setQuizId(state, action: PayloadAction<string>) {
      state.quizId = action.payload;
    },
    setAnswer(state, action: PayloadAction<{ questionId: string; value: number }>) {
      state.answers[action.payload.questionId] = action.payload.value;
    },
    setCurrentStep(state, action: PayloadAction<number>) {
      state.currentStep = action.payload;
    },
    setSubmitting(state, action: PayloadAction<boolean>) {
      state.isSubmitting = action.payload;
    },
    resetQuiz(state) {
      state.answers = {};
      state.currentStep = 0;
      state.isSubmitting = false;
    },
  },
});

export const { setQuizId, setAnswer, setCurrentStep, setSubmitting, resetQuiz } = quizSlice.actions;
export default quizSlice.reducer;
