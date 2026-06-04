import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface RubricLevel {
	th: string;
	en: string;
}

interface QuizQuestion {
	id: string;
	dimensionId: string;
	textTh: string;
	textEn: string;
	descriptionTh?: string;
	descriptionEn?: string;
	rubric?: Record<string, RubricLevel>;
}

interface QuizDimension {
	id: string;
	nameTh: string;
	nameEn: string;
	weight: number;
}

interface QuizListItem {
	id: string;
	nameTh: string;
	nameEn: string;
}

interface QuizState {
	quizId: string;
	questions: QuizQuestion[];
	dimensions: QuizDimension[];
	answers: Record<string, number>;
	currentStep: number;
	isSubmitting: boolean;
	questionsLoaded: boolean;
	availableQuizzes: QuizListItem[];
}

const initialState: QuizState = {
	quizId: "shindan",
	questions: [],
	dimensions: [],
	answers: {},
	currentStep: 0,
	isSubmitting: false,
	questionsLoaded: false,
	availableQuizzes: [],
};

const quizSlice = createSlice({
	name: "quiz",
	initialState,
	reducers: {
		setQuizId(state, action: PayloadAction<string>) {
			state.quizId = action.payload;
		},
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
		setAvailableQuizzes(state, action: PayloadAction<QuizListItem[]>) {
			state.availableQuizzes = action.payload;
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
			state.questionsLoaded = false;
		},
	},
});

export const { setQuizId, setQuestions, setAvailableQuizzes, setAnswer, setCurrentStep, setSubmitting, resetQuiz } =
	quizSlice.actions;
export default quizSlice.reducer;
export type { QuizQuestion, QuizDimension, QuizListItem };
