import { describe, expect, it } from 'vitest';
import authReducer, { logout, setBackofficeRole, setLoading, setUser } from './authSlice';

describe('authSlice', () => {
  const initial = authReducer(undefined, { type: 'unknown' });

  const staffUser = {
    uid: 'uid-staff-1',
    email: 'staff@factorysyncsolutions.com',
    displayName: 'Staff One',
    photoURL: null,
  };

  it('has correct initial state', () => {
    expect(initial.user).toBeNull();
    expect(initial.backofficeRole).toBeNull();
    expect(initial.isAuthenticated).toBe(false);
    expect(initial.isBackofficeUser).toBe(false);
    expect(initial.isSuperAdmin).toBe(false);
    expect(initial.loading).toBe(true);
  });

  it('setUser sets authenticated state', () => {
    const state = authReducer(initial, setUser(staffUser));
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.uid).toBe('uid-staff-1');
  });

  it('setUser null clears auth', () => {
    let state = authReducer(initial, setUser(staffUser));
    state = authReducer(state, setUser(null));
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('setBackofficeRole superadmin grants backoffice and super admin access', () => {
    const state = authReducer(initial, setBackofficeRole('superadmin'));
    expect(state.backofficeRole).toBe('superadmin');
    expect(state.isBackofficeUser).toBe(true);
    expect(state.isSuperAdmin).toBe(true);
  });

  it('setBackofficeRole staff grants backoffice access but not super admin', () => {
    const state = authReducer(initial, setBackofficeRole('staff'));
    expect(state.backofficeRole).toBe('staff');
    expect(state.isBackofficeUser).toBe(true);
    expect(state.isSuperAdmin).toBe(false);
  });

  it('setBackofficeRole null clears backoffice access', () => {
    let state = authReducer(initial, setBackofficeRole('superadmin'));
    state = authReducer(state, setBackofficeRole(null));
    expect(state.backofficeRole).toBeNull();
    expect(state.isBackofficeUser).toBe(false);
    expect(state.isSuperAdmin).toBe(false);
  });

  it('setLoading', () => {
    const state = authReducer(initial, setLoading(false));
    expect(state.loading).toBe(false);
  });

  it('logout resets everything', () => {
    let state = authReducer(initial, setUser(staffUser));
    state = authReducer(state, setBackofficeRole('superadmin'));
    state = authReducer(state, logout());

    expect(state.user).toBeNull();
    expect(state.backofficeRole).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isBackofficeUser).toBe(false);
    expect(state.isSuperAdmin).toBe(false);
    expect(state.loading).toBe(false);
  });
});
