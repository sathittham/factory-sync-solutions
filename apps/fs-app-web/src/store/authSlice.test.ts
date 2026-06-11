import { describe, expect, it } from 'vitest';
import authReducer, { setUser, setProfile, setLoading, logout } from './authSlice';

describe('authSlice', () => {
  const initial = authReducer(undefined, { type: 'unknown' });

  it('has correct initial state', () => {
    expect(initial.user).toBeNull();
    expect(initial.profile).toBeNull();
    expect(initial.isAuthenticated).toBe(false);
    expect(initial.isRegistered).toBe(false);
    expect(initial.isAdmin).toBe(false);
    expect(initial.loading).toBe(true);
  });

  it('setUser sets authenticated state', () => {
    const state = authReducer(
      initial,
      setUser({ uid: 'u-1', email: 'a@b.com', displayName: 'Test', photoURL: null }),
    );
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.uid).toBe('u-1');
  });

  it('setUser null clears auth', () => {
    let state = authReducer(
      initial,
      setUser({ uid: 'u-1', email: 'a@b.com', displayName: 'Test', photoURL: null }),
    );
    state = authReducer(state, setUser(null));
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('setProfile sets registered and admin flags', () => {
    const state = authReducer(
      initial,
      setProfile({
        uid: 'u-1',
        email: 'a@b.com',
        displayName: 'Test',
        companyName: 'Co',
        companyRegId: '1234567890123',
        industryType: 'manufacturing',
        companySize: 'medium',
        contactName: 'T',
        contactEmail: 't@t.com',
        contactPhone: '0812345678',
        role: 'admin',
      }),
    );
    expect(state.isRegistered).toBe(true);
    expect(state.isAdmin).toBe(true);
  });

  it('setProfile with user role is not admin', () => {
    const state = authReducer(
      initial,
      setProfile({
        uid: 'u-1',
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
      }),
    );
    expect(state.isRegistered).toBe(true);
    expect(state.isAdmin).toBe(false);
  });

  it('setLoading', () => {
    const state = authReducer(initial, setLoading(false));
    expect(state.loading).toBe(false);
  });

  it('logout resets everything', () => {
    let state = authReducer(
      initial,
      setUser({ uid: 'u-1', email: 'a@b.com', displayName: 'Test', photoURL: null }),
    );
    state = authReducer(state, logout());
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isRegistered).toBe(false);
    expect(state.loading).toBe(false);
  });
});
