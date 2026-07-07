import { describe, expect, it } from 'vitest';
import {
  type Profile,
  canManageCompanySettings,
  canManageUsers,
  getCompanyCandidates,
  normalizeProfile,
  selectActiveCompany,
} from './profile';

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    uid: 'u1',
    email: 'a@b.com',
    displayName: 'A',
    companyName: 'Primary Co',
    companyRegId: 'REG-1',
    industryType: 'manufacturing',
    companySize: 'sme',
    contactName: 'A',
    contactEmail: 'a@b.com',
    contactPhone: '0812345678',
    role: 'member',
    ...overrides,
  };
}

describe('getCompanyCandidates', () => {
  it('puts the primary company first and dedupes by regId', () => {
    const profile = makeProfile({
      companies: [
        { companyName: 'Second', companyRegId: 'REG-2', industryType: 'x', companySize: 's' },
        { companyName: 'Dup', companyRegId: 'REG-1', industryType: 'x', companySize: 's' },
      ],
    });
    const result = getCompanyCandidates(profile);
    expect(result.map((c) => c.companyRegId)).toEqual(['REG-1', 'REG-2']);
  });

  it('drops entries with an empty regId', () => {
    const profile = makeProfile({
      companyRegId: '',
      companies: [
        { companyName: 'Second', companyRegId: 'REG-2', industryType: 'x', companySize: 's' },
      ],
    });
    expect(getCompanyCandidates(profile).map((c) => c.companyRegId)).toEqual(['REG-2']);
  });
});

describe('normalizeProfile', () => {
  it('returns null for null input', () => {
    expect(normalizeProfile(null)).toBeNull();
  });

  it('resolves activeCompanyRegId onto the top-level company fields', () => {
    const profile = makeProfile({
      activeCompanyRegId: 'REG-2',
      companies: [
        {
          companyName: 'Second',
          companyRegId: 'REG-2',
          industryType: 'lean',
          companySize: 'large',
        },
      ],
    });
    const result = normalizeProfile(profile);
    expect(result?.companyName).toBe('Second');
    expect(result?.companyRegId).toBe('REG-2');
    expect(result?.industryType).toBe('lean');
    expect(result?.activeCompanyRegId).toBe('REG-2');
  });

  it('falls back to the primary company when no active is set', () => {
    const result = normalizeProfile(makeProfile());
    expect(result?.companyRegId).toBe('REG-1');
    expect(result?.activeCompanyRegId).toBe('REG-1');
  });
});

describe('selectActiveCompany', () => {
  it('switches the active company to the requested regId', () => {
    const profile = makeProfile({
      companies: [
        {
          companyName: 'Second',
          companyRegId: 'REG-2',
          industryType: 'lean',
          companySize: 'large',
        },
      ],
    });
    const result = selectActiveCompany(profile, 'REG-2');
    expect(result?.companyName).toBe('Second');
    expect(result?.activeCompanyRegId).toBe('REG-2');
  });

  it('returns the profile unchanged when the regId is unknown', () => {
    const profile = makeProfile();
    expect(selectActiveCompany(profile, 'REG-UNKNOWN')).toEqual(profile);
  });

  it('returns null for null input', () => {
    expect(selectActiveCompany(null, 'REG-1')).toBeNull();
  });
});

describe('canManageUsers', () => {
  it.each([
    ['null profile, isAdmin=true', null, true, true],
    ['null profile, isAdmin=false', null, false, false],
    ['member role', makeProfile({ role: 'member' }), false, false],
    ['owner role', makeProfile({ role: 'owner' }), false, true],
    ['system_admin role', makeProfile({ role: 'system_admin' }), false, true],
    ['permission flag', makeProfile({ permissions: { canManageUsers: true } }), false, true],
    [
      'projectRole overrides base role',
      makeProfile({ role: 'member', projectRole: 'admin' }),
      false,
      true,
    ],
  ])('%s', (_label, profile, isAdmin, expected) => {
    expect(canManageUsers(profile, isAdmin)).toBe(expected);
  });
});

describe('canManageCompanySettings', () => {
  it.each([
    ['manager role', makeProfile({ role: 'manager' }), false, true],
    ['member role', makeProfile({ role: 'member' }), false, false],
    [
      'canEditCompany permission',
      makeProfile({ permissions: { canEditCompany: true } }),
      false,
      true,
    ],
    ['isAdmin short-circuit', makeProfile({ role: 'member' }), true, true],
  ])('%s', (_label, profile, isAdmin, expected) => {
    expect(canManageCompanySettings(profile, isAdmin)).toBe(expected);
  });
});
