import { describe, expect, it } from 'vitest';
import quizReducer, {
  setQuestions,
  setAnswer,
  setCurrentStep,
  setSubmitting,
  resetQuiz,
} from './quizSlice';

describe('quizSlice', () => {
  const initial = quizReducer(undefined, { type: 'unknown' });

  it('has correct initial state', () => {
    expect(initial.questions).toEqual([]);
    expect(initial.answers).toEqual({});
    expect(initial.currentStep).toBe(0);
    expect(initial.isSubmitting).toBe(false);
    expect(initial.questionsLoaded).toBe(false);
  });

  it('setQuestions', () => {
    const state = quizReducer(
      initial,
      setQuestions({
        questions: [{ id: 'q1', dimensionId: 'd1', textTh: 'T', textEn: 'E' }],
        dimensions: [{ id: 'd1', nameTh: 'T', nameEn: 'E', weight: 1 }],
      }),
    );
    expect(state.questions).toHaveLength(1);
    expect(state.dimensions).toHaveLength(1);
    expect(state.questionsLoaded).toBe(true);
  });

  it('setAnswer', () => {
    const state = quizReducer(initial, setAnswer({ questionId: 'q1', value: 4 }));
    expect(state.answers.q1).toBe(4);
  });

  it('setCurrentStep', () => {
    const state = quizReducer(initial, setCurrentStep(3));
    expect(state.currentStep).toBe(3);
  });

  it('setSubmitting', () => {
    const state = quizReducer(initial, setSubmitting(true));
    expect(state.isSubmitting).toBe(true);
  });

  it('resetQuiz', () => {
    let state = quizReducer(initial, setAnswer({ questionId: 'q1', value: 3 }));
    state = quizReducer(state, setCurrentStep(2));
    state = quizReducer(state, resetQuiz());
    expect(state.answers).toEqual({});
    expect(state.currentStep).toBe(0);
    expect(state.isSubmitting).toBe(false);
  });
});
