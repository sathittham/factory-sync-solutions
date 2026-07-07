// Profile domain types and pure helpers. Extracted from `store/authSlice.ts` so
// that profile can migrate to TanStack Query as its source of truth (CR-003
// Phase 2) while the reducer, query hooks, and consumers share one definition.
// `authSlice` re-exports these for backward compatibility during the migration.

export interface CompanyOption {
  companyName: string;
  companyRegId: string;
  industryType: string;
  companySize: string;
}

export interface ProfilePermissions {
  canManageUsers?: boolean;
  canEditCompany?: boolean;
  canManageCompanySettings?: boolean;
}

export interface Profile {
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
  avatarURL?: string;
}

/** Distinct companies the user belongs to, primary first, deduped by regId. */
export function getCompanyCandidates(profile: Profile): CompanyOption[] {
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

/** Resolve the active company onto the top-level company fields. */
export function normalizeProfile(profile: Profile | null): Profile | null {
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

/** Return a copy of `profile` with `companyRegId` selected as the active company. */
export function selectActiveCompany(profile: Profile | null, companyRegId: string): Profile | null {
  if (!profile) return profile;

  const selected = getCompanyCandidates(profile).find(
    (company) => company.companyRegId === companyRegId,
  );
  if (!selected) return profile;

  return {
    ...profile,
    companyName: selected.companyName,
    companyRegId: selected.companyRegId,
    industryType: selected.industryType,
    companySize: selected.companySize,
    activeCompanyRegId: selected.companyRegId,
  };
}

const userManagementRoles = new Set(['admin', 'owner', 'system_admin']);
const companySettingsRoles = new Set(['admin', 'owner', 'system_admin', 'manager']);

function getEffectiveRole(profile: Profile): string {
  return profile.projectRole || profile.role;
}

export function canManageUsers(profile: Profile | null, isAdmin = false): boolean {
  if (!profile) return isAdmin;
  return (
    isAdmin ||
    profile.permissions?.canManageUsers === true ||
    userManagementRoles.has(getEffectiveRole(profile))
  );
}

export function canManageCompanySettings(profile: Profile | null, isAdmin = false): boolean {
  if (!profile) return isAdmin;
  return (
    isAdmin ||
    profile.permissions?.canEditCompany === true ||
    profile.permissions?.canManageCompanySettings === true ||
    companySettingsRoles.has(getEffectiveRole(profile))
  );
}
