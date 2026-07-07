import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { StaffPage } from './StaffPage';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    listStaff: vi.fn(),
    setStaffRole: vi.fn(),
    revokeStaffRole: vi.fn(),
    inviteStaff: vi.fn(),
  },
}));

// Avoid pulling in @/lib/firebase (initializeApp/getAuth) transitively via
// @/lib/api — this app has no Firebase test config, so that import throws.
vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/components/AuditActivityDialog', () => ({
  AuditActivityDialog: ({
    open,
    title,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="audit-activity-dialog">
        <span>{title}</span>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-audit-dialog
        </button>
      </div>
    ) : null,
}));

const { backofficeApi } = await import('@/api/backoffice');
const mockedBackofficeApi = vi.mocked(backofficeApi);
const { ApiError } = await import('@/lib/api');

const staffMember = {
  uid: 'uid-staff-1',
  email: 'staff@factorysyncsolutions.com',
  displayName: 'Staff Member',
  backofficeRole: 'staff',
};

// No display name — exercises getInitials' email fallback + single-word slice branch.
const staffMemberNoName = {
  uid: 'uid-staff-2',
  email: 'bob@factorysyncsolutions.com',
  displayName: '',
  backofficeRole: 'superadmin',
};

function renderPage() {
  return render(
    <LocaleProvider>
      <StaffPage />
    </LocaleProvider>,
  );
}

describe('StaffPage', () => {
  beforeAll(() => {
    // jsdom does not implement pointer capture / scrollIntoView, which the
    // Radix Select primitive relies on when opening its listbox via userEvent.
    globalThis.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    globalThis.HTMLElement.prototype.releasePointerCapture = vi.fn();
    globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders staff members once loaded', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);

    renderPage();

    expect(await screen.findByText('Staff Member')).toBeInTheDocument();
    expect(screen.getByText('staff@factorysyncsolutions.com')).toBeInTheDocument();
  });

  it('shows the empty state when there is no staff', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No data')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedBackofficeApi.listStaff.mockRejectedValue(new Error('boom'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('opens the audit activity dialog for a staff member', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /view activity/i }));

    expect(await screen.findByTestId('audit-activity-dialog')).toHaveTextContent('Staff Activity');
  });

  it('changes a staff member role', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);
    mockedBackofficeApi.setStaffRole.mockResolvedValue({
      ...staffMember,
      backofficeRole: 'superadmin',
    });

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /^change role$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.setStaffRole).toHaveBeenCalledWith('uid-staff-1', 'staff');
    });
  });

  it('revokes staff access', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);
    mockedBackofficeApi.revokeStaffRole.mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.revokeStaffRole).toHaveBeenCalledWith('uid-staff-1');
    });
    expect(screen.queryByText('Staff Member')).not.toBeInTheDocument();
  });

  it('validates the add-staff email format before sending an invite', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(mockedBackofficeApi.inviteStaff).not.toHaveBeenCalled();
  });

  it('disables the send-invite button until an email is entered', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));

    expect(screen.getByRole('button', { name: /send invite/i })).toBeDisabled();
  });

  it('sends a staff invitation', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);
    mockedBackofficeApi.inviteStaff.mockResolvedValue(staffMember);

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@factorysyncsolutions.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.inviteStaff).toHaveBeenCalledWith({
        email: 'staff@factorysyncsolutions.com',
        backofficeRole: 'staff',
      });
    });
    expect(await screen.findByText('Staff invitation sent')).toBeInTheDocument();
  });

  it('shows a forbidden-specific error when inviting staff without permission', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);
    mockedBackofficeApi.inviteStaff.mockRejectedValue(new ApiError(403, 'forbidden'));

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@factorysyncsolutions.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    expect(
      await screen.findByText('You do not have permission to invite staff.'),
    ).toBeInTheDocument();
  });

  it('opens the permissions matrix dialog', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /^permissions$/i }));

    expect(
      await screen.findByText('Backoffice feature access by role: Staff < Super Admin'),
    ).toBeInTheDocument();
  });

  it('closes the permissions matrix dialog on Escape', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /^permissions$/i }));
    await screen.findByText('Backoffice feature access by role: Staff < Super Admin');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(
        screen.queryByText('Backoffice feature access by role: Staff < Super Admin'),
      ).not.toBeInTheDocument();
    });
  });

  it('falls back to email-derived initials for a member with no display name', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMemberNoName]);

    renderPage();

    expect(await screen.findByText('BO')).toBeInTheDocument();
    expect(screen.getByText('superadmin')).toBeInTheDocument();
  });

  it('updates only the targeted member when changing role with multiple staff', async () => {
    const user = userEvent.setup();
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember, staffMemberNoName]);
    mockedBackofficeApi.setStaffRole.mockResolvedValue({
      ...staffMember,
      backofficeRole: 'superadmin',
    });

    renderPage();
    await screen.findByText('Staff Member');

    const changeRoleButtons = screen.getAllByRole('button', { name: /^change role$/i });
    fireEvent.click(changeRoleButtons[0]);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'superadmin' }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.setStaffRole).toHaveBeenCalledWith('uid-staff-1', 'superadmin');
    });
    // The second member (already superadmin) must be left untouched.
    expect(screen.getByText('bob@factorysyncsolutions.com')).toBeInTheDocument();
  });

  it('shows an error when changing a staff member role fails', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);
    mockedBackofficeApi.setStaffRole.mockRejectedValue(new Error('boom'));

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /^change role$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('closes the change-role dialog via Cancel without saving', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /^change role$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^confirm$/i })).not.toBeInTheDocument();
    });
    expect(mockedBackofficeApi.setStaffRole).not.toHaveBeenCalled();
  });

  it('closes the change-role dialog on Escape without saving', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /^change role$/i }));
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^confirm$/i })).not.toBeInTheDocument();
    });
    expect(mockedBackofficeApi.setStaffRole).not.toHaveBeenCalled();
  });

  it('shows an error when revoking staff access fails', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);
    mockedBackofficeApi.revokeStaffRole.mockRejectedValue(new Error('boom'));

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Staff Member')).toBeInTheDocument();
  });

  it('closes the revoke dialog via Cancel without revoking', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^confirm$/i })).not.toBeInTheDocument();
    });
    expect(mockedBackofficeApi.revokeStaffRole).not.toHaveBeenCalled();
  });

  it('closes the revoke dialog on Escape without revoking', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^confirm$/i })).not.toBeInTheDocument();
    });
    expect(mockedBackofficeApi.revokeStaffRole).not.toHaveBeenCalled();
  });

  it('shows a generic error when inviting staff fails for a non-permission reason', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);
    mockedBackofficeApi.inviteStaff.mockRejectedValue(new Error('network down'));

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@factorysyncsolutions.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    expect(await screen.findByText(/failed to send invite/i)).toBeInTheDocument();
    expect(
      screen.queryByText('You do not have permission to invite staff.'),
    ).not.toBeInTheDocument();
  });

  it('re-invites an existing staff member and updates their role in place', async () => {
    const user = userEvent.setup();
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);
    mockedBackofficeApi.inviteStaff.mockResolvedValue({
      ...staffMember,
      backofficeRole: 'superadmin',
    });

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: staffMember.email },
    });

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'superadmin' }));
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.inviteStaff).toHaveBeenCalledWith({
        email: staffMember.email,
        backofficeRole: 'superadmin',
      });
    });
    // Still exactly one row for this uid — updated in place, not duplicated.
    expect(screen.getAllByText(staffMember.email)).toHaveLength(1);
  });

  it('closes the add-staff dialog via Cancel and does not send an invite', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'someone@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /send invite/i })).not.toBeInTheDocument();
    });
    expect(mockedBackofficeApi.inviteStaff).not.toHaveBeenCalled();
  });

  it('closes the add-staff dialog on Escape and clears the form', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([]);

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    await screen.findByText('Invalid email address');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /send invite/i })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add staff/i }));
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.queryByText('Invalid email address')).not.toBeInTheDocument();
  });

  it('closes the audit activity dialog for a staff member', async () => {
    mockedBackofficeApi.listStaff.mockResolvedValue([staffMember]);

    renderPage();
    await screen.findByText('Staff Member');

    fireEvent.click(screen.getByRole('button', { name: /view activity/i }));
    await screen.findByTestId('audit-activity-dialog');

    fireEvent.click(screen.getByRole('button', { name: /close-audit-dialog/i }));

    expect(screen.queryByTestId('audit-activity-dialog')).not.toBeInTheDocument();
  });
});
