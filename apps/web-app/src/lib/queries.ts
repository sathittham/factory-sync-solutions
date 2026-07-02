import { api } from '@/lib/api';
import type { Assessment, QuizDimension, QuizListItem, QuizQuestion } from '@/lib/types';
import { useAppDispatch } from '@/store';
import { type Profile, setProfile } from '@/store/authSlice';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Server-state hooks (TanStack Query). Server data is never mirrored into Redux —
// these hooks own fetching, caching, and invalidation. See `.claude/rules/react.md`.

interface QuizQuestionsResponse {
  questions: QuizQuestion[];
  dimensions: QuizDimension[];
}

interface SubmitQuizInput {
  quizId: string;
  answers: { questionId: string; value: number }[];
}

/** All assessments (quiz results) for the signed-in user, newest first. */
export function useAssessmentsQuery() {
  return useQuery({
    queryKey: ['results'],
    queryFn: () => api.get<Assessment[]>('/results'),
  });
}

/** The list of quiz variants available to take. */
export function useQuizzesQuery() {
  return useQuery({
    queryKey: ['quizzes'],
    queryFn: () => api.get<QuizListItem[]>('/quiz/quizzes'),
  });
}

/** Questions + dimensions for a single quiz variant. Cached per quizId. */
export function useQuizQuestionsQuery(quizId: string, enabled = true) {
  return useQuery({
    queryKey: ['quiz-questions', quizId],
    queryFn: () => api.get<QuizQuestionsResponse>(`/quiz/questions?quizId=${quizId}`),
    enabled: enabled && Boolean(quizId),
  });
}

/**
 * Update the signed-in user's profile.
 *
 * Transitional bridge: profile is still owned by Redux (route guards and the
 * `useAuth` bootstrap read `state.auth.profile`), so on success we sync the
 * fresh copy back via `setProfile` rather than caching it here — keeping a
 * single source of truth. This centralizes the previously duplicated raw
 * `api.put('/profile')` writes (ProfilePage tabs, ProfileDialog) behind one
 * hook with consistent `isPending`/`isError`/`reset` state.
 */
export function useUpdateProfileMutation() {
  const dispatch = useAppDispatch();
  return useMutation({
    mutationFn: (body: Partial<Profile>) => api.put<Profile>('/profile', body),
    onSuccess: (updated) => {
      dispatch(setProfile(updated));
    },
  });
}

/** Submit quiz answers; invalidates the results cache so pages refetch. */
export function useSubmitQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitQuizInput) => api.post<Assessment>('/quiz/submit', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
  });
}
