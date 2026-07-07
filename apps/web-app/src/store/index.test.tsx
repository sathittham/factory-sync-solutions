import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { setLoading } from './authSlice';
import { store, useAppDispatch, useAppSelector } from './index';
import { setQuizId } from './quizSlice';

function wrapper({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

describe('store', () => {
  it('combines the auth and quiz reducers under the expected keys', () => {
    const state = store.getState();
    expect(state).toHaveProperty('auth');
    expect(state).toHaveProperty('quiz');
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.quiz.quizId).toBe('shindan');
  });

  it('useAppSelector reads state from the store', () => {
    const { result } = renderHook(() => useAppSelector((s) => s.quiz.quizId), { wrapper });
    expect(result.current).toBe('shindan');
  });

  it('useAppDispatch dispatches actions that update the store', () => {
    const { result: dispatchResult } = renderHook(() => useAppDispatch(), { wrapper });
    const { result: selectorResult, rerender } = renderHook(
      () => useAppSelector((s) => s.auth.loading),
      { wrapper },
    );

    dispatchResult.current(setLoading(false));
    rerender();

    expect(selectorResult.current).toBe(false);

    // Restore shared-store state so this test does not leak into others.
    dispatchResult.current(setLoading(true));
    dispatchResult.current(setQuizId('shindan'));
  });
});
