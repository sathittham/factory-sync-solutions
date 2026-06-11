import { type PayloadAction, createSlice } from '@reduxjs/toolkit';

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

interface Profile {
  uid: string;
  email: string;
  displayName: string;
  companyName: string;
  companyRegId: string;
  industryType: string;
  companySize: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  role: string;
  emailNotifications?: boolean;
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
      state.profile = action.payload;
      state.isRegistered = action.payload !== null;
      state.isAdmin = action.payload?.role === 'admin';
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

export const { setUser, setProfile, setHasCompletedQuiz, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
export type { AuthUser, Profile };
