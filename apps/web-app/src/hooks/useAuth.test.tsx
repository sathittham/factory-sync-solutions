import { Provider } from 'react-redux';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import resultReducer from '@/store/resultSlice';
import { ApiError } from '@/lib/api';
import { useAuth } from './useAuth';

const mocks = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  authSignOut: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mocks.onAuthStateChanged,
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null, signOut: mocks.authSignOut },
}));

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  }
  return { ApiError, api: { get: mocks.apiGet, post: mocks.apiPost } };
});

const mockProfile = {
  uid: 'u-1',
  email: 'test@test.com',
  displayName: 'Test',
  companyName: 'TestCo',
  companyRegId: '1234567890123',
  industryType: 'manufacturing',
  companySize: 'medium',
  contactName: 'T',
  contactEmail: 'test@test.com',
  contactPhone: '0812345678',
  role: 'user',
};

const mockFirebaseUser = {
  uid: 'u-1',
  email: 'test@test.com',
  displayName: 'Test User',
  photoURL: null as string | null,
  getIdToken: vi.fn().mockResolvedValue('mock-token'),
};

describe('useAuth', () => {
  let triggerAuth: (user: typeof mockFirebaseUser | null) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.authSignOut.mockResolvedValue(undefined);
    // Default: no pending invitation — existing tests that only set up apiGet still pass
    mocks.apiPost.mockRejectedValue(new ApiError(404, 'Not found'));
    mocks.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof triggerAuth) => {
      triggerAuth = cb;
      return vi.fn();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeStore() {
    return configureStore({
      reducer: { auth: authReducer, quiz: quizReducer, result: resultReducer },
    });
  }

  function renderAuth() {
    const store = makeStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const hook = renderHook(() => useAuth(), { wrapper });
    return { hook, store };
  }

  it('dispatches logout + setLoading(false) when no Firebase user', async () => {
    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(null);
    });

    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('sets user + profile + hasCompletedQuiz on successful login', async () => {
    mocks.apiGet
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce([{ id: 'r-1' }]);

    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(mockFirebaseUser);
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.uid).toBe('u-1');
    expect(state.isRegistered).toBe(true);
    expect(state.hasCompletedQuiz).toBe(true);
  });

  it('sets hasCompletedQuiz=false when results array is empty', async () => {
    mocks.apiGet
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce([]);

    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(mockFirebaseUser);
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));
    expect(store.getState().auth.hasCompletedQuiz).toBe(false);
  });

  it('on 404 profile + successful invitation accept — sets profile and isRegistered', async () => {
    mocks.apiGet
      .mockRejectedValueOnce(new ApiError(404, 'Not found')) // profile fetch
      .mockResolvedValueOnce([]); // results fetch after accept
    mocks.apiPost.mockResolvedValueOnce(mockProfile); // POST /invitations/accept

    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(mockFirebaseUser);
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    const state = store.getState().auth;
    expect(state.isRegistered).toBe(true);
    expect(state.profile?.uid).toBe('u-1');
    expect(mocks.authSignOut).not.toHaveBeenCalled();
  });

  it('on 404 profile + 404 invitation accept — sets profile null (no invitation)', async () => {
    mocks.apiGet.mockRejectedValueOnce(new ApiError(404, 'Not found'));
    // apiPost already defaults to 404 reject in beforeEach

    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(mockFirebaseUser);
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    const state = store.getState().auth;
    expect(state.profile).toBeNull();
    expect(state.isRegistered).toBe(false);
  });

  it('on 404 profile + invitation accept error — sets profile null', async () => {
    mocks.apiGet.mockRejectedValueOnce(new ApiError(404, 'Not found'));
    mocks.apiPost.mockRejectedValueOnce(new ApiError(500, 'Internal error'));

    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(mockFirebaseUser);
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    const state = store.getState().auth;
    expect(state.profile).toBeNull();
    expect(state.isRegistered).toBe(false);
  });

  it('calls signOut and dispatches logout on 401 profile fetch', async () => {
    mocks.apiGet.mockRejectedValueOnce(new ApiError(401, 'Unauthorized'));

    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(mockFirebaseUser);
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    expect(mocks.authSignOut).toHaveBeenCalledOnce();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it('calls the unsubscribe function returned by onAuthStateChanged on unmount', () => {
    const mockUnsubscribe = vi.fn();
    mocks.onAuthStateChanged.mockReturnValue(mockUnsubscribe);

    const { hook } = renderAuth();
    hook.unmount();

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
  });
});
