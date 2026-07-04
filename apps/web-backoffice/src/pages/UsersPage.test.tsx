import { LocaleProvider } from '@/lib/i18n';
import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersPage } from './UsersPage';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    listUsers: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

vi.mock('@/components/AuditActivityDialog', () => ({
  AuditActivityDialog: ({ open, title }: { open: boolean; title: string }) =>
    open ? <div data-testid="audit-activity-dialog">{title}</div> : null,
}));

const { backofficeApi } = await import('@/api/backoffice');
const mockedBackofficeApi = vi.mocked(backofficeApi);

const user = {
  uid: 'uid-user-1',
  email: 'user@example.com',
  displayName: 'Jane User',
  avatarURL: '',
  photoURL: '',
  companyName: 'Acme Co',
  companyRegId: '1234567890123',
  industryType: 'manufacturing',
  companySize: 'medium',
  contactName: 'Jane Contact',
  contactEmail: 'contact@example.com',
  contactPhone: '0812345678',
  role: 'owner',
  emailNotifications: true,
  createdAt: '2026-01-01T00:00:00Z',
};

type AuthState = ReturnType<typeof authReducer>;

const baseState: AuthState = {
  user: null,
  backofficeRole: null,
  isAuthenticated: true,
  isBackofficeUser: true,
  isSuperAdmin: false,
  loading: false,
};

function renderPage(authState: Partial<AuthState> = {}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...baseState, ...authState } },
  });

  return render(
    <Provider store={store}>
      <LocaleProvider>
        <UsersPage />
      </LocaleProvider>
    </Provider>,
  );
}

describe('UsersPage', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders users once loaded', async () => {
    mockedBackofficeApi.listUsers.mockResolvedValue([user]);

    renderPage();

    expect(await screen.findByText('Jane User')).toBeInTheDocument();
    expect(screen.getByText('Acme Co')).toBeInTheDocument();
  });

  it('shows the empty state when there are no users', async () => {
    mockedBackofficeApi.listUsers.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No data')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedBackofficeApi.listUsers.mockRejectedValue(new Error('boom'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('filters users by the search box', async () => {
    mockedBackofficeApi.listUsers.mockResolvedValue([user]);

    renderPage();
    await screen.findByText('Jane User');

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'nomatch' } });

    expect(screen.queryByText('Jane User')).not.toBeInTheDocument();
  });

  it('opens the user profile detail dialog', async () => {
    mockedBackofficeApi.listUsers.mockResolvedValue([user]);

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^view$/i }));

    expect(await screen.findByText('User Profile')).toBeInTheDocument();
    expect(screen.getByText('Jane Contact')).toBeInTheDocument();
  });

  it('does not show superadmin-only actions for a non-superadmin', async () => {
    mockedBackofficeApi.listUsers.mockResolvedValue([user]);

    renderPage({ isSuperAdmin: false });
    await screen.findByText('Jane User');

    expect(screen.queryByRole('button', { name: /view activity/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });

  it('shows superadmin-only actions and opens the activity dialog', async () => {
    mockedBackofficeApi.listUsers.mockResolvedValue([user]);

    renderPage({ isSuperAdmin: true });
    await screen.findByText('Jane User');

    fireEvent.click(screen.getByRole('button', { name: /view activity/i }));

    expect(await screen.findByTestId('audit-activity-dialog')).toHaveTextContent('User Activity');
  });

  it('deletes a user after confirming', async () => {
    mockedBackofficeApi.listUsers.mockResolvedValue([user]);
    mockedBackofficeApi.deleteUser.mockResolvedValue(undefined);

    renderPage({ isSuperAdmin: true });
    await screen.findByText('Jane User');

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    const deleteButtons = await screen.findAllByRole('button', { name: /^delete$/i });
    const lastDeleteButton = deleteButtons.at(-1);
    if (!lastDeleteButton) throw new Error('expected a delete button in the confirm dialog');
    fireEvent.click(lastDeleteButton);

    await waitFor(() => {
      expect(mockedBackofficeApi.deleteUser).toHaveBeenCalledWith('uid-user-1');
    });
    expect(screen.queryByText('Jane User')).not.toBeInTheDocument();
  });
});
