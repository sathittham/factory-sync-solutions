import { type Profile, getCompanyCandidates, normalizeProfile } from '@/lib/profile';
import { type PayloadAction, createSlice } from '@reduxjs/toolkit';

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

interface AuthState {
  user: AuthUser | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isRegistered: boolean;
  isAdmin: boolean;
  hasCompletedQuiz: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  isAuthenticated: false,
  isRegistered: false,
  isAdmin: false,
  hasCompletedQuiz: false,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
    },
    setProfile(state, action: PayloadAction<Profile | null>) {
      state.profile = normalizeProfile(action.payload);
      state.isRegistered = action.payload !== null;
      state.isAdmin = action.payload?.role === 'admin';
    },
    setActiveCompany(state, action: PayloadAction<string>) {
      if (!state.profile) return;

      const selected = getCompanyCandidates(state.profile).find(
        (company) => company.companyRegId === action.payload,
      );
      if (!selected) return;

      state.profile.companyName = selected.companyName;
      state.profile.companyRegId = selected.companyRegId;
      state.profile.industryType = selected.industryType;
      state.profile.companySize = selected.companySize;
      state.profile.activeCompanyRegId = selected.companyRegId;
    },
    setHasCompletedQuiz(state, action: PayloadAction<boolean>) {
      state.hasCompletedQuiz = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    logout(state) {
      state.user = null;
      state.profile = null;
      state.isAuthenticated = false;
      state.isRegistered = false;
      state.isAdmin = false;
      state.hasCompletedQuiz = false;
      state.loading = false;
    },
  },
});

export const { setUser, setProfile, setActiveCompany, setHasCompletedQuiz, setLoading, logout } =
  authSlice.actions;
export default authSlice.reducer;
export { canManageCompanySettings, canManageUsers } from '@/lib/profile';
export type { CompanyOption, Profile, ProfilePermissions } from '@/lib/profile';
export type { AuthUser };
