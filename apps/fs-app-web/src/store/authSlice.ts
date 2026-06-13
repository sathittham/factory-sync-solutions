import { type PayloadAction, createSlice } from '@reduxjs/toolkit';

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

interface CompanyOption {
  companyName: string;
  companyRegId: string;
  industryType: string;
  companySize: string;
}

interface ProfilePermissions {
  canManageUsers?: boolean;
  canEditCompany?: boolean;
  canManageCompanySettings?: boolean;
}

interface Profile {
  uid: string;
  email: string;
  displayName: string;
  companyName: string;
  companyRegId: string;
  industryType: string;
  companySize: string;
  companies?: CompanyOption[];
  activeCompanyRegId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  role: string;
  projectRole?: string;
  permissions?: ProfilePermissions;
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

function getCompanyCandidates(profile: Profile): CompanyOption[] {
  const candidates = [
    {
      companyName: profile.companyName,
      companyRegId: profile.companyRegId,
      industryType: profile.industryType,
      companySize: profile.companySize,
    },
    ...(profile.companies ?? []),
  ];
  const seen = new Set<string>();

  return candidates.filter((company) => {
    if (!company.companyRegId || seen.has(company.companyRegId)) return false;
    seen.add(company.companyRegId);
    return true;
  });
}

function normalizeProfile(profile: Profile | null): Profile | null {
  if (!profile) return null;

  const companies = getCompanyCandidates(profile);
  const activeCompanyRegId = profile.activeCompanyRegId || profile.companyRegId;
  const activeCompany =
    companies.find((company) => company.companyRegId === activeCompanyRegId) ?? companies[0];

  if (!activeCompany) return profile;

  return {
    ...profile,
    companyName: activeCompany.companyName,
    companyRegId: activeCompany.companyRegId,
    industryType: activeCompany.industryType,
    companySize: activeCompany.companySize,
    companies,
    activeCompanyRegId: activeCompany.companyRegId,
  };
}

const userManagementRoles = new Set(['admin', 'owner', 'system_admin']);
const companySettingsRoles = new Set(['admin', 'owner', 'system_admin', 'manager']);

function getEffectiveRole(profile: Profile): string {
  return profile.projectRole || profile.role;
}

function canManageUsers(profile: Profile | null, isAdmin = false): boolean {
  if (!profile) return isAdmin;
  return (
    isAdmin ||
    profile.permissions?.canManageUsers === true ||
    userManagementRoles.has(getEffectiveRole(profile))
  );
}

function canManageCompanySettings(profile: Profile | null, isAdmin = false): boolean {
  if (!profile) return isAdmin;
  return (
    isAdmin ||
    profile.permissions?.canEditCompany === true ||
    profile.permissions?.canManageCompanySettings === true ||
    companySettingsRoles.has(getEffectiveRole(profile))
  );
}

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
export { canManageCompanySettings, canManageUsers };
export type { AuthUser, CompanyOption, Profile, ProfilePermissions };
