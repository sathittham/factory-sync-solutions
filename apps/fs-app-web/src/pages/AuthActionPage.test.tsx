import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { LocaleProvider } from '@/lib/i18n';
import { AuthActionPage } from './AuthActionPage';

vi.mock('firebase/auth', () => ({
  confirmPasswordReset: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ auth: {} }));

vi.mock('react-router', async (importActual) => {
  const actual = await importActual<typeof import('react-router')>();
  return { ...actual, useSearchParams: vi.fn() };
});

// Import after mocks are registered so the mock factory runs first.
import { confirmPasswordReset, signOut } from 'firebase/auth';
import { useSearchParams } from 'react-router';

const mockUseSearchParams = vi.mocked(useSearchParams);
const mockConfirmPasswordReset = vi.mocked(confirmPasswordReset);
const mockSignOut = vi.mocked(signOut);

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

    // Submit button with the i18n key text (Thai: "บันทึกรหัสผ่าน")
    expect(
      screen.getByRole('button', { name: /บันทึกรหัสผ่าน/i }),
    ).toBeInTheDocument();
  });

  it('shows success state after confirmPasswordReset resolves', async () => {
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams('mode=resetPassword&oobCode=test123'),
      vi.fn() as never,
    ]);
    mockConfirmPasswordReset.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);

    renderPage();

    const passwordInput = screen.getByLabelText(/รหัสผ่านใหม่/i);
    const confirmInput = screen.getByLabelText(/ยืนยันรหัสผ่าน/i);

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

    expect(mockConfirmPasswordReset).toHaveBeenCalledOnce();
    expect(mockSignOut).toHaveBeenCalledOnce();
  });
});
