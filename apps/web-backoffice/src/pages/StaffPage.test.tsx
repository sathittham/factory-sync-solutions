import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  AuditActivityDialog: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div data-testid="audit-activity-dialog">{title}</div> : null,
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

function renderPage() {
  return render(
    <LocaleProvider>
      <StaffPage />
    </LocaleProvider>,
  );
}

describe('StaffPage', () => {
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
});
