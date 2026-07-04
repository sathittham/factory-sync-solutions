import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from './useAuth';

const mocks = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: mocks.onAuthStateChanged,
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

function makeFirebaseUser(claims: Record<string, unknown> = {}) {
  return {
    uid: 'uid-staff-1',
    email: 'staff@factorysyncsolutions.com' as string | null,
    displayName: 'Staff One' as string | null,
    photoURL: null as string | null,
    getIdTokenResult: vi.fn().mockResolvedValue({ claims }),
  };
}

describe('useAuth', () => {
  let triggerAuth: (user: ReturnType<typeof makeFirebaseUser> | null) => Promise<void>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.onAuthStateChanged.mockImplementation((_auth: unknown, cb: typeof triggerAuth) => {
      triggerAuth = cb;
      return vi.fn();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeStore() {
    return configureStore({ reducer: { auth: authReducer } });
  }

  function renderAuth() {
    const store = makeStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const hook = renderHook(() => useAuth(), { wrapper });
    return { hook, store };
  }

  it('dispatches logout + setLoading(false) when there is no Firebase user', async () => {
    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(null);
    });

    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('grants superadmin access when the ID token carries the superadmin claim', async () => {
    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(makeFirebaseUser({ backofficeRole: 'superadmin' }));
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.uid).toBe('uid-staff-1');
    expect(state.backofficeRole).toBe('superadmin');
    expect(state.isBackofficeUser).toBe(true);
    expect(state.isSuperAdmin).toBe(true);
  });

  it('grants staff access but not super admin for the staff claim', async () => {
    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(makeFirebaseUser({ backofficeRole: 'staff' }));
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    const state = store.getState().auth;
    expect(state.isBackofficeUser).toBe(true);
    expect(state.isSuperAdmin).toBe(false);
  });

  it('sets no backoffice role when the token has no backofficeRole claim', async () => {
    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(makeFirebaseUser());
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.backofficeRole).toBeNull();
    expect(state.isBackofficeUser).toBe(false);
  });

  it('clears the backoffice role when refreshing the ID token fails', async () => {
    const user = makeFirebaseUser({ backofficeRole: 'superadmin' });
    user.getIdTokenResult.mockRejectedValue(new Error('token refresh failed'));

    const { store } = renderAuth();

    await act(async () => {
      await triggerAuth(user);
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    const state = store.getState().auth;
    expect(state.isAuthenticated).toBe(true);
    expect(state.backofficeRole).toBeNull();
    expect(state.isBackofficeUser).toBe(false);
  });

  it('falls back to empty strings when the Firebase user has no email or displayName', async () => {
    const { store } = renderAuth();
    const user = makeFirebaseUser({ backofficeRole: 'staff' });
    user.email = null;
    user.displayName = null;

    await act(async () => {
      await triggerAuth(user);
    });

    await waitFor(() => expect(store.getState().auth.loading).toBe(false));

    const state = store.getState().auth;
    expect(state.user?.email).toBe('');
    expect(state.user?.displayName).toBe('');
  });

  it('calls the unsubscribe function returned by onAuthStateChanged on unmount', () => {
    const mockUnsubscribe = vi.fn();
    mocks.onAuthStateChanged.mockReturnValue(mockUnsubscribe);

    const { hook } = renderAuth();
    hook.unmount();

    expect(mockUnsubscribe).toHaveBeenCalledOnce();
  });
});
