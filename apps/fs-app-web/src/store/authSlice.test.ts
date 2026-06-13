import { describe, expect, it } from 'vitest';
import authReducer, {
  canManageCompanySettings,
  canManageUsers,
  setActiveCompany,
  setHasCompletedQuiz,
  setLoading,
  setProfile,
  setUser,
  logout,
} from './authSlice';

describe('authSlice', () => {
  const initial = authReducer(undefined, { type: 'unknown' });

  it('has correct initial state', () => {
    expect(initial.user).toBeNull();
    expect(initial.profile).toBeNull();
    expect(initial.isAuthenticated).toBe(false);
    expect(initial.isRegistered).toBe(false);
    expect(initial.isAdmin).toBe(false);
    expect(initial.hasCompletedQuiz).toBe(false);
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

  it('setProfile null clears registered flags', () => {
    let state = authReducer(
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
    state = authReducer(state, setProfile(null));
    expect(state.isRegistered).toBe(false);
    expect(state.isAdmin).toBe(false);
    expect(state.profile).toBeNull();
  });

  it('setActiveCompany switches to a company from the profile company list', () => {
    let state = authReducer(
      initial,
      setProfile({
        uid: 'u-1',
        email: 'a@b.com',
        displayName: 'Test',
        companyName: 'Co',
        companyRegId: '1234567890123',
        industryType: 'manufacturing',
        companySize: 'medium',
        companies: [
          {
            companyName: 'Factory Two',
            companyRegId: '2222222222222',
            industryType: 'automotive',
            companySize: 'large',
          },
        ],
        contactName: 'T',
        contactEmail: 't@t.com',
        contactPhone: '0812345678',
        role: 'user',
      }),
    );

    state = authReducer(state, setActiveCompany('2222222222222'));

    expect(state.profile?.companyName).toBe('Factory Two');
    expect(state.profile?.companyRegId).toBe('2222222222222');
    expect(state.profile?.industryType).toBe('automotive');
    expect(state.profile?.companySize).toBe('large');
    expect(state.profile?.activeCompanyRegId).toBe('2222222222222');

    state = authReducer(state, setActiveCompany('1234567890123'));

    expect(state.profile?.companyName).toBe('Co');
    expect(state.profile?.companyRegId).toBe('1234567890123');
    expect(state.profile?.industryType).toBe('manufacturing');
    expect(state.profile?.companySize).toBe('medium');
    expect(state.profile?.activeCompanyRegId).toBe('1234567890123');
  });

  it('recognizes company admin capabilities from project role and permissions', () => {
    const ownerProfile = {
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
      projectRole: 'owner',
    };
    const managerProfile = { ...ownerProfile, projectRole: 'manager' };
    const permissionProfile = {
      ...ownerProfile,
      projectRole: 'general_user',
      permissions: { canManageUsers: true },
    };

    expect(canManageUsers(ownerProfile)).toBe(true);
    expect(canManageCompanySettings(ownerProfile)).toBe(true);
    expect(canManageUsers(managerProfile)).toBe(false);
    expect(canManageCompanySettings(managerProfile)).toBe(true);
    expect(canManageUsers(permissionProfile)).toBe(true);
  });

  it('setHasCompletedQuiz', () => {
    const state = authReducer(initial, setHasCompletedQuiz(true));
    expect(state.hasCompletedQuiz).toBe(true);
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
    state = authReducer(state, setHasCompletedQuiz(true));
    state = authReducer(state, logout());
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isRegistered).toBe(false);
    expect(state.hasCompletedQuiz).toBe(false);
    expect(state.loading).toBe(false);
  });
});
