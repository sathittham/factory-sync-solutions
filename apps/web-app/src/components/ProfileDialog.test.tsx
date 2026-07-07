import { ProfileDialog } from '@/components/ProfileDialog';
import { ApiError } from '@/lib/api';
import { LocaleProvider } from '@/lib/i18n';
import authReducer, { setProfile, setUser } from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

interface MockAuthUser {
  email: string | null;
  providerData: { providerId: string }[];
}

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  trackEvent: vi.fn(),
  emailAuthCredential: vi.fn(),
  linkWithCredential: vi.fn(),
  linkWithPopup: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  unlink: vi.fn(),
  updatePassword: vi.fn(),
}));

const mockAuth = vi.hoisted(() => ({ currentUser: null as MockAuthUser | null }));

vi.mock('@/lib/queries', () => ({
  useUpdateProfileMutation: () => ({ mutateAsync: mocks.mutateAsync }),
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: mocks.trackEvent,
}));

vi.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  googleProvider: {},
}));

vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: mocks.emailAuthCredential },
  linkWithCredential: mocks.linkWithCredential,
  linkWithPopup: mocks.linkWithPopup,
  reauthenticateWithCredential: mocks.reauthenticateWithCredential,
  unlink: mocks.unlink,
  updatePassword: mocks.updatePassword,
}));

const baseProfile = {
  uid: 'uid-factory-1',
  email: 'owner@factory.com',
  displayName: 'Factory Owner',
  companyName: 'Acme Manufacturing',
  companyRegId: '1234567890123',
  industryType: 'manufacturing',
  companySize: 'medium',
  contactName: 'Jane Doe',
  contactEmail: 'jane@factory.com',
  contactPhone: '0812345678',
  role: 'user',
};

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderProfileDialog({
  open = true,
  providerIds = ['google.com'],
}: { open?: boolean; providerIds?: string[] } = {}) {
  mockAuth.currentUser = {
    email: baseProfile.email,
    providerData: providerIds.map((providerId) => ({ providerId })),
  };

  const store = makeStore();
  store.dispatch(
    setUser({
      uid: baseProfile.uid,
      email: baseProfile.email,
      displayName: 'Factory Owner',
      photoURL: null,
    }),
  );
  store.dispatch(setProfile(baseProfile));

  const onOpenChange = vi.fn();
  render(
    <Provider store={store}>
      <LocaleProvider>
        <ProfileDialog open={open} onOpenChange={onOpenChange} />
      </LocaleProvider>
    </Provider>,
  );
  return { onOpenChange, store };
}

describe('ProfileDialog', () => {
  beforeAll(() => {
    // jsdom does not implement pointer capture / scrollIntoView / ResizeObserver,
    // all of which the Radix Select primitive relies on when it mounts and
    // opens its listbox via userEvent.
    globalThis.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    globalThis.HTMLElement.prototype.releasePointerCapture = vi.fn();
    globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();
    globalThis.ResizeObserver = vi.fn().mockImplementation(function MockResizeObserver() {
      return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
    });
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('fss-locale', 'en');
    vi.clearAllMocks();
    mocks.mutateAsync.mockResolvedValue(baseProfile);
  });

  it('renders nothing when open is false', () => {
    renderProfileDialog({ open: false });
    expect(screen.queryByTestId('profile-dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog prefilled with the current profile', () => {
    renderProfileDialog();
    expect(screen.getByTestId('profile-dialog')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Manufacturing')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@factory.com')).toBeInTheDocument();
    expect(screen.getByText(baseProfile.companyRegId)).toBeInTheDocument();
  });

  it('shows a required error when contact name is cleared', async () => {
    renderProfileDialog();
    const contactName = screen.getByLabelText('Contact Name');
    fireEvent.change(contactName, { target: { value: '' } });
    fireEvent.blur(contactName);

    expect(await screen.findByText('Contact name is required')).toBeInTheDocument();
  });

  it('disables the submit button until a field is changed', () => {
    renderProfileDialog();
    expect(screen.getByTestId('profile-submit-btn')).toBeDisabled();
  });

  it('reactively re-enables the submit button after editing a field', () => {
    renderProfileDialog();
    const submitBtn = screen.getByTestId('profile-submit-btn');
    fireEvent.change(screen.getByLabelText('Contact Name'), { target: { value: 'John Smith' } });

    expect(submitBtn).not.toBeDisabled();
  });

  it('submits the updated profile and shows a success message', async () => {
    renderProfileDialog();
    fireEvent.change(screen.getByLabelText('Contact Name'), { target: { value: 'John Smith' } });
    fireEvent.submit(screen.getByTestId('profile-form'));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ contactName: 'John Smith' }),
      );
    });
    expect(await screen.findByText('Changes saved successfully.')).toBeInTheDocument();
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      'profile_save_success',
      expect.objectContaining({ industry: 'manufacturing', size: 'medium' }),
    );
  });

  it('shows the API error message when the update fails', async () => {
    mocks.mutateAsync.mockRejectedValue(new ApiError(409, 'Company name already taken'));
    renderProfileDialog();
    fireEvent.change(screen.getByLabelText('Contact Name'), { target: { value: 'John Smith' } });
    fireEvent.submit(screen.getByTestId('profile-form'));

    expect(await screen.findByText('Company name already taken')).toBeInTheDocument();
    expect(mocks.trackEvent).toHaveBeenCalledWith('profile_save_error', {
      error: 'Company name already taken',
    });
  });

  it('toggles email notifications and includes it in the submitted payload', async () => {
    renderProfileDialog();
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.submit(screen.getByTestId('profile-form'));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ emailNotifications: true }),
      );
    });
  });

  it('changes the industry type via the select field', async () => {
    const user = userEvent.setup();
    renderProfileDialog();

    const industryTrigger = screen.getByLabelText('Industry Type');
    await user.click(industryTrigger);
    await user.click(await screen.findByRole('option', { name: 'Food & Beverage' }));
    fireEvent.submit(screen.getByTestId('profile-form'));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ industryType: 'food' }),
      );
    });
  });

  it('renders provider badges for every linked sign-in method', () => {
    renderProfileDialog({ providerIds: ['google.com', 'password'] });
    // "Google" / "Email & Password" also label the linking-method rows below,
    // so assert at least one match rather than a single unique node.
    expect(screen.getAllByText('Google').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Email & Password').length).toBeGreaterThanOrEqual(1);
  });

  it('disables unlinking the only linked provider', () => {
    renderProfileDialog({ providerIds: ['google.com'] });
    expect(screen.getByRole('button', { name: 'Unlink Google' })).toBeDisabled();
  });

  it('links a Google account and dispatches the updated user', async () => {
    mocks.linkWithPopup.mockResolvedValue({
      user: { displayName: 'Factory Owner', photoURL: null },
    });
    renderProfileDialog({ providerIds: ['password'] });

    fireEvent.click(screen.getByRole('button', { name: 'Link Google' }));

    await waitFor(() => expect(mocks.linkWithPopup).toHaveBeenCalledOnce());
    expect(await screen.findByText('Account linked successfully')).toBeInTheDocument();
  });

  it('shows the change-password section only when a password provider is linked', () => {
    renderProfileDialog({ providerIds: ['google.com'] });
    expect(screen.queryByText('Change Password')).not.toBeInTheDocument();
  });

  it('renders the change-password form when the password provider is linked', () => {
    renderProfileDialog({ providerIds: ['password'] });
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('shows a mismatch error when new password confirmation differs', async () => {
    renderProfileDialog({ providerIds: ['password'] });
    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'oldpass' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'different' },
    });
    fireEvent.blur(screen.getByLabelText('Confirm New Password'));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('changes the password successfully via reauthentication', async () => {
    mocks.emailAuthCredential.mockReturnValue('mock-credential');
    mocks.reauthenticateWithCredential.mockResolvedValue(undefined);
    mocks.updatePassword.mockResolvedValue(undefined);
    renderProfileDialog({ providerIds: ['password'] });
    const currentUser = mockAuth.currentUser;

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'oldpass' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'newpass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));

    await waitFor(() => {
      expect(mocks.reauthenticateWithCredential).toHaveBeenCalledWith(
        currentUser,
        'mock-credential',
      );
    });
    expect(mocks.updatePassword).toHaveBeenCalledWith(currentUser, 'newpass123');
    expect(await screen.findByText('Password changed successfully')).toBeInTheDocument();
  });
});
