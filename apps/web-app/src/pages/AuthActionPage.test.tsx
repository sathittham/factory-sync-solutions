import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/lib/i18n';
import { AuthActionPage } from './AuthActionPage';

vi.mock('firebase/auth', () => ({
  confirmPasswordReset: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ auth: {} }));

vi.mock('@/lib/theme', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock('react-router', async (importActual) => {
  const actual = await importActual<typeof import('react-router')>();
  return { ...actual, useSearchParams: vi.fn() };
});

// Import after mocks are registered so the mock factory runs first.
import { api } from '@/lib/api';
import {
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { useSearchParams } from 'react-router';

const mockUseSearchParams = vi.mocked(useSearchParams);
const mockConfirmPasswordReset = vi.mocked(confirmPasswordReset);
const mockSignInWithEmailAndPassword = vi.mocked(signInWithEmailAndPassword);
const mockSignOut = vi.mocked(signOut);
const mockUpdateProfile = vi.mocked(updateProfile);
const mockVerifyPasswordResetCode = vi.mocked(verifyPasswordResetCode);
const mockApiPost = vi.mocked(api.post);

function renderPage() {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <AuthActionPage />
      </LocaleProvider>
    </MemoryRouter>,
  );
}

describe('AuthActionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error card when oobCode is missing', () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('mode=resetPassword'),
      vi.fn() as never,
    ]);

    renderPage();

    // The invalid-link heading is rendered in an h1 inside the Card
    expect(
      screen.getByRole('heading', { level: 1, name: /ลิงก์ไม่ถูกต้อง/i }),
    ).toBeInTheDocument();
  });

  it('shows error card when mode is unknown', () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('oobCode=abc'),
      vi.fn() as never,
    ]);

    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: /ลิงก์ไม่ถูกต้อง/i }),
    ).toBeInTheDocument();
  });

  it('renders the password form when mode=resetPassword and oobCode present', () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('mode=resetPassword&oobCode=test123'),
      vi.fn() as never,
    ]);

    renderPage();

    expect(screen.getByLabelText(/ชื่อผู้ติดต่อ/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/เบอร์โทรศัพท์/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /บันทึกรหัสผ่าน/i }),
    ).toBeInTheDocument();
  });

  it('shows success state after confirmPasswordReset resolves', async () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('mode=resetPassword&oobCode=test123'),
      vi.fn() as never,
    ]);
    mockVerifyPasswordResetCode.mockResolvedValue('invited@example.com');
    mockConfirmPasswordReset.mockResolvedValue(undefined);
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'uid-1' } } as never);
    mockUpdateProfile.mockResolvedValue(undefined);
    mockApiPost.mockResolvedValue({ uid: 'uid-1' });
    mockSignOut.mockResolvedValue(undefined);

    renderPage();

    const nameInput = screen.getByLabelText(/ชื่อผู้ติดต่อ/i);
    const phoneInput = screen.getByLabelText(/เบอร์โทรศัพท์/i);
    const passwordInput = screen.getByLabelText(/รหัสผ่านใหม่/i);
    const confirmInput = screen.getByLabelText(/ยืนยันรหัสผ่าน/i);

    await userEvent.type(nameInput, 'Invited User');
    fireEvent.blur(nameInput);

    await userEvent.type(phoneInput, '0812345678');
    fireEvent.blur(phoneInput);

    await userEvent.type(passwordInput, 'NewPass123!');
    fireEvent.blur(passwordInput);

    await userEvent.type(confirmInput, 'NewPass123!');
    fireEvent.blur(confirmInput);

    const submitButton = screen.getByRole('button', { name: /บันทึกรหัสผ่าน/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/ตั้งรหัสผ่านเรียบร้อยแล้ว/i),
      ).toBeInTheDocument();
    });

    expect(mockVerifyPasswordResetCode).toHaveBeenCalledWith({}, 'test123');
    expect(mockConfirmPasswordReset).toHaveBeenCalledOnce();
    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      'invited@example.com',
      'NewPass123!',
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      { uid: 'uid-1' },
      { displayName: 'Invited User' },
    );
    expect(mockApiPost).toHaveBeenCalledWith('/invitations/accept', {
      contactName: 'Invited User',
      contactPhone: '0812345678',
    });
    expect(mockSignOut).toHaveBeenCalledOnce();
  });
});
