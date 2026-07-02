import { describe, expect, it } from 'vitest';
import quizReducer, {
  resetQuiz,
  setAnswer,
  setCurrentStep,
  setQuizId,
  setSubmitting,
} from './quizSlice';

describe('quizSlice', () => {
  const initial = quizReducer(undefined, { type: 'unknown' });

  it('has correct initial state', () => {
    expect(initial.quizId).toBe('shindan');
    expect(initial.answers).toEqual({});
    expect(initial.currentStep).toBe(0);
    expect(initial.isSubmitting).toBe(false);
  });

  it('setQuizId', () => {
    const state = quizReducer(initial, setQuizId('factory'));
    expect(state.quizId).toBe('factory');
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

  it('resetQuiz clears answers, step, and submit flag', () => {
    let state = quizReducer(initial, setAnswer({ questionId: 'q1', value: 3 }));
    state = quizReducer(state, setCurrentStep(2));
    state = quizReducer(state, setSubmitting(true));
    state = quizReducer(state, resetQuiz());
    expect(state.answers).toEqual({});
    expect(state.currentStep).toBe(0);
    expect(state.isSubmitting).toBe(false);
  });
});
