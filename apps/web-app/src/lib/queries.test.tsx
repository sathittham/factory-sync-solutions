import { api } from '@/lib/api';
import type { Profile } from '@/store/authSlice';
import authReducer from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useAssessmentsQuery,
  useQuizQuestionsQuery,
  useQuizzesQuery,
  useSubmitQuizMutation,
  useUpdateProfileMutation,
} from './queries';

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const store = configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>{children}</Provider>
      </QueryClientProvider>
    );
  }

  return { wrapper, queryClient, store };
}

const testProfile: Profile = {
  uid: 'uid-factory-1',
  email: 'a@b.com',
  displayName: 'Test',
  companyName: 'Co',
  companyRegId: '1234567890123',
  industryType: 'manufacturing',
  companySize: 'medium',
  contactName: 'T',
  contactEmail: 't@t.com',
  contactPhone: '0812345678',
  role: 'user',
};

describe('queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useAssessmentsQuery fetches /results', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([{ id: 'a-1' }]);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useAssessmentsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/results');
    expect(result.current.data).toEqual([{ id: 'a-1' }]);
  });

  it('useQuizzesQuery fetches /quiz/quizzes', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([{ id: 'shindan', nameTh: 'x', nameEn: 'y' }]);
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useQuizzesQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/quiz/quizzes');
  });

  it('useQuizQuestionsQuery fetches questions scoped to the given quizId', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ questions: [], dimensions: [] });
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useQuizQuestionsQuery('shindan'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/quiz/questions?quizId=shindan');
  });

  it('useQuizQuestionsQuery stays disabled when enabled=false', () => {
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useQuizQuestionsQuery('shindan', false), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('useQuizQuestionsQuery stays disabled when quizId is empty', () => {
    const { wrapper } = makeWrapper();

    const { result } = renderHook(() => useQuizQuestionsQuery(''), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('useUpdateProfileMutation PUTs /profile and syncs the response back into Redux', async () => {
    vi.mocked(api.put).mockResolvedValueOnce(testProfile);
    const { wrapper, store } = makeWrapper();

    const { result } = renderHook(() => useUpdateProfileMutation(), { wrapper });
    result.current.mutate({ displayName: 'Updated Name' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.put).toHaveBeenCalledWith('/profile', { displayName: 'Updated Name' });
    expect(store.getState().auth.profile?.uid).toBe('uid-factory-1');
    expect(store.getState().auth.isRegistered).toBe(true);
  });

  it('useSubmitQuizMutation posts answers and invalidates the results cache', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ id: 'a-1' });
    const { wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSubmitQuizMutation(), { wrapper });
    result.current.mutate({ quizId: 'shindan', answers: [{ questionId: 'q1', value: 3 }] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.post).toHaveBeenCalledWith('/quiz/submit', {
      quizId: 'shindan',
      answers: [{ questionId: 'q1', value: 3 }],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['results'] });
  });
});
