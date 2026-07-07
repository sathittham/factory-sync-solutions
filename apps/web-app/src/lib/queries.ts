import { ApiError, api } from '@/lib/api';
import { auth } from '@/lib/firebase';
import {
  type Profile,
  canManageCompanySettings,
  canManageUsers,
  normalizeProfile,
} from '@/lib/profile';
import type { Assessment, QuizDimension, QuizListItem, QuizQuestion } from '@/lib/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { setProfile } from '@/store/authSlice';
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

/**
 * Fetch the signed-in user's profile, mirroring the branch logic that
 * `useAuth` performs today (CR-003 Phase 2 §3.3):
 *   200 → profile
 *   404 → try accepting a pending invitation; success ⇒ profile, 404 ⇒ null
 *         (authenticated but unregistered — drives RegisterGuard)
 *   401 → sign the Firebase session out, then throw
 * `null` is a valid resolved value (unregistered), not an error.
 */
async function fetchProfile(): Promise<Profile | null> {
  try {
    return await api.get<Profile>('/profile');
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      try {
        return await api.post<Profile>('/invitations/accept', {});
      } catch (invErr) {
        if (invErr instanceof ApiError && invErr.status === 404) return null;
        throw invErr;
      }
    }
    if (err instanceof ApiError && err.status === 401) {
      await auth.signOut();
    }
    throw err;
  }
}

/**
 * Profile as server state (CR-003 Phase 2). Gated on a signed-in user; the
 * active company is resolved via `normalizeProfile` in `select`. 404/401 are
 * terminal, so retries are disabled.
 *
 * NOT yet wired into guards/consumers — see docs/architecture/
 * profile-usequery-design.md steps 3–7 (require live-Firebase verification).
 */
export function useProfileQuery() {
  const user = useAppSelector((s) => s.auth.user);
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
    enabled: Boolean(user),
    select: normalizeProfile,
    retry: false,
  });
}

/**
 * Facade over `useProfileQuery` exposing the profile plus the flags that used
 * to live in `authSlice` (isRegistered/isAdmin/permissions), computed at read
 * time. Consumers migrate from `useAppSelector((s) => s.auth)` to this.
 */
export function useProfile() {
  const query = useProfileQuery();
  const profile = query.data ?? null;
  const isAdmin = profile?.role === 'admin';
  return {
    profile,
    isRegistered: profile !== null,
    isAdmin,
    canManageUsers: canManageUsers(profile, isAdmin),
    canManageCompanySettings: canManageCompanySettings(profile, isAdmin),
    isLoading: query.isLoading,
    isPending: query.isPending,
  };
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
