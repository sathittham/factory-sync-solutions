import { type PayloadAction, createSlice } from '@reduxjs/toolkit';

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

type BackofficeRole = 'superadmin' | 'staff';

interface AuthState {
  user: AuthUser | null;
  backofficeRole: BackofficeRole | null;
  isAuthenticated: boolean;
  isBackofficeUser: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  backofficeRole: null,
  isAuthenticated: false,
  isBackofficeUser: false,
  isSuperAdmin: false,
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
    setBackofficeRole(state, action: PayloadAction<BackofficeRole | null>) {
      state.backofficeRole = action.payload;
      state.isBackofficeUser = action.payload !== null;
      state.isSuperAdmin = action.payload === 'superadmin';
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    logout(state) {
      state.user = null;
      state.backofficeRole = null;
      state.isAuthenticated = false;
      state.isBackofficeUser = false;
      state.isSuperAdmin = false;
      state.loading = false;
    },
  },
});

export const { setUser, setBackofficeRole, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
export type { AuthUser, BackofficeRole };
