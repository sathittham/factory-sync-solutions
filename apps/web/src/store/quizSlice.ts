import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface QuizQuestion {
	id: string;
	dimensionId: string;
	textTh: string;
	textEn: string;
}

interface QuizDimension {
	id: string;
	nameTh: string;
	nameEn: string;
	weight: number;
}

interface QuizState {
	questions: QuizQuestion[];
	dimensions: QuizDimension[];
	answers: Record<string, number>;
	currentStep: number;
	isSubmitting: boolean;
	questionsLoaded: boolean;
}

const initialState: QuizState = {
	questions: [],
	dimensions: [],
	answers: {},
	currentStep: 0,
	isSubmitting: false,
	questionsLoaded: false,
};

const quizSlice = createSlice({
	name: "quiz",
	initialState,
	reducers: {
		setQuestions(
			state,
			action: PayloadAction<{
				questions: QuizQuestion[];
				dimensions: QuizDimension[];
			}>,
		) {
			state.questions = action.payload.questions;
			state.dimensions = action.payload.dimensions;
			state.questionsLoaded = true;
		},
		setAnswer(
			state,
			action: PayloadAction<{ questionId: string; value: number }>,
		) {
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

export const { setQuestions, setAnswer, setCurrentStep, setSubmitting, resetQuiz } =
	quizSlice.actions;
export default quizSlice.reducer;
export type { QuizQuestion, QuizDimension };
