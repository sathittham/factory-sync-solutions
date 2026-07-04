import { LocaleProvider } from '@/lib/i18n';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthActionPage } from './AuthActionPage';

vi.mock('firebase/auth', () => ({
  confirmPasswordReset: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ auth: {} }));

const { mockUseTheme } = vi.hoisted(() => ({
  mockUseTheme: vi.fn(() => ({ resolvedTheme: 'light' })),
}));

vi.mock('@/lib/theme', () => ({
  useTheme: mockUseTheme,
}));

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Import after mocks are registered so the mock factory runs first.
import { api } from '@/lib/api';
import {
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';

const mockConfirmPasswordReset = vi.mocked(confirmPasswordReset);
const mockSignInWithEmailAndPassword = vi.mocked(signInWithEmailAndPassword);
const mockSignOut = vi.mocked(signOut);
const mockUpdateProfile = vi.mocked(updateProfile);
const mockVerifyPasswordResetCode = vi.mocked(verifyPasswordResetCode);
const mockApiPost = vi.mocked(api.post);

interface AuthActionSearch {
  mode?: string;
  oobCode?: string;
}

function validateSearch(search: Record<string, unknown>): AuthActionSearch {
  return {
    mode: typeof search.mode === 'string' ? search.mode : undefined,
    oobCode: typeof search.oobCode === 'string' ? search.oobCode : undefined,
  };
}

function renderPage(initialEntry: string) {
  const rootRoute = createRootRoute({
    component: () => (
      <LocaleProvider>
        <AuthActionPage />
      </LocaleProvider>
    ),
  });
  // Route tree only needs the root — search params are read via useSearch({ strict: false })
  // from whatever matches, so a single root route with validateSearch covers the test cases.
  const authActionRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/auth/action',
    validateSearch,
  });
  const routeTree = rootRoute.addChildren([authActionRoute]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('AuthActionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReturnValue({ resolvedTheme: 'light' });
  });

  it('shows error card when oobCode is missing', async () => {
    renderPage('/auth/action?mode=resetPassword');

    // The invalid-link heading is rendered in an h1 inside the Card
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /ลิงก์ไม่ถูกต้อง/i })).toBeInTheDocument();
    });
  });

  it('shows error card when mode is unknown', async () => {
    renderPage('/auth/action?oobCode=abc');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /ลิงก์ไม่ถูกต้อง/i })).toBeInTheDocument();
    });
  });

  it('renders the password form when mode=resetPassword and oobCode present', async () => {
    renderPage('/auth/action?mode=resetPassword&oobCode=test123');

    await waitFor(() => {
      expect(screen.getByLabelText(/ชื่อผู้ติดต่อ/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/เบอร์โทรศัพท์/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /บันทึกรหัสผ่าน/i })).toBeInTheDocument();
  });

  it('shows success state after confirmPasswordReset resolves', async () => {
    mockVerifyPasswordResetCode.mockResolvedValue('invited@example.com');
    mockConfirmPasswordReset.mockResolvedValue(undefined);
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'uid-1' } } as never);
    mockUpdateProfile.mockResolvedValue(undefined);
    mockApiPost.mockResolvedValue({ uid: 'uid-1' });
    mockSignOut.mockResolvedValue(undefined);

    renderPage('/auth/action?mode=resetPassword&oobCode=test123');

    const nameInput = await screen.findByLabelText(/ชื่อผู้ติดต่อ/i);
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
      expect(screen.getByText(/ตั้งรหัสผ่านเรียบร้อยแล้ว/i)).toBeInTheDocument();
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

  it('renders the dark-mode logo when resolvedTheme is dark', async () => {
    mockUseTheme.mockReturnValue({ resolvedTheme: 'dark' });

    const darkRender = renderPage('/auth/action?mode=resetPassword&oobCode=test123');
    await screen.findByLabelText(/ชื่อผู้ติดต่อ/i);
    const darkSrc = darkRender.container.querySelector('img')?.getAttribute('src');
    darkRender.unmount();

    mockUseTheme.mockReturnValue({ resolvedTheme: 'light' });
    const lightRender = renderPage('/auth/action?mode=resetPassword&oobCode=test123');
    await screen.findByLabelText(/ชื่อผู้ติดต่อ/i);
    const lightSrc = lightRender.container.querySelector('img')?.getAttribute('src');

    expect(darkSrc).toBeTruthy();
    expect(darkSrc).not.toBe(lightSrc);
  });

  it('shows field errors when contact name and phone are too short', async () => {
    renderPage('/auth/action?mode=resetPassword&oobCode=test123');

    const nameInput = await screen.findByLabelText(/ชื่อผู้ติดต่อ/i);
    const phoneInput = screen.getByLabelText(/เบอร์โทรศัพท์/i);

    await userEvent.type(nameInput, 'A');
    fireEvent.blur(nameInput);

    await userEvent.type(phoneInput, '08');
    fireEvent.blur(phoneInput);

    await waitFor(() => {
      expect(screen.getByText('กรุณากรอกชื่อผู้ติดต่อ')).toBeInTheDocument();
    });
    expect(screen.getByText('กรุณากรอกเบอร์โทรศัพท์')).toBeInTheDocument();
  });

  it('shows a mismatch error when confirm password differs, and toggles visibility', async () => {
    renderPage('/auth/action?mode=resetPassword&oobCode=test123');

    const passwordInput = await screen.findByLabelText(/รหัสผ่านใหม่/i);
    const confirmInput = screen.getByLabelText(/ยืนยันรหัสผ่าน/i);

    await userEvent.type(passwordInput, 'NewPass123!');
    fireEvent.blur(passwordInput);

    await userEvent.type(confirmInput, 'Different123!');
    fireEvent.blur(confirmInput);

    await waitFor(() => {
      expect(screen.getByText('รหัสผ่านไม่ตรงกัน')).toBeInTheDocument();
    });

    expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleButton = screen.getByLabelText('แสดงรหัสผ่าน');
    await userEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('ซ่อนรหัสผ่าน')).toBeInTheDocument();
  });

  it('shows the expired-link message when the reset code has expired', async () => {
    mockVerifyPasswordResetCode.mockRejectedValue({ code: 'auth/expired-action-code' });

    renderPage('/auth/action?mode=resetPassword&oobCode=test123');

    const nameInput = await screen.findByLabelText(/ชื่อผู้ติดต่อ/i);
    const phoneInput = screen.getByLabelText(/เบอร์โทรศัพท์/i);
    const passwordInput = screen.getByLabelText(/รหัสผ่านใหม่/i);
    const confirmInput = screen.getByLabelText(/ยืนยันรหัสผ่าน/i);

    await userEvent.type(nameInput, 'Invited User');
    await userEvent.type(phoneInput, '0812345678');
    await userEvent.type(passwordInput, 'NewPass123!');
    await userEvent.type(confirmInput, 'NewPass123!');

    await userEvent.click(screen.getByRole('button', { name: /บันทึกรหัสผ่าน/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('ลิงก์หมดอายุแล้ว กรุณาขอคำเชิญใหม่');
    });
  });

  it('shows the invalid-link message when the reset code is invalid', async () => {
    mockVerifyPasswordResetCode.mockRejectedValue({ code: 'auth/invalid-action-code' });

    renderPage('/auth/action?mode=resetPassword&oobCode=test123');

    const nameInput = await screen.findByLabelText(/ชื่อผู้ติดต่อ/i);
    const phoneInput = screen.getByLabelText(/เบอร์โทรศัพท์/i);
    const passwordInput = screen.getByLabelText(/รหัสผ่านใหม่/i);
    const confirmInput = screen.getByLabelText(/ยืนยันรหัสผ่าน/i);

    await userEvent.type(nameInput, 'Invited User');
    await userEvent.type(phoneInput, '0812345678');
    await userEvent.type(passwordInput, 'NewPass123!');
    await userEvent.type(confirmInput, 'NewPass123!');

    await userEvent.click(screen.getByRole('button', { name: /บันทึกรหัสผ่าน/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('ลิงก์ไม่ถูกต้อง กรุณาตรวจสอบอีเมลอีกครั้ง');
    });
  });

  it('shows a generic error message when the failure carries no error code', async () => {
    mockVerifyPasswordResetCode.mockRejectedValue(new Error('network failure'));

    renderPage('/auth/action?mode=resetPassword&oobCode=test123');

    const nameInput = await screen.findByLabelText(/ชื่อผู้ติดต่อ/i);
    const phoneInput = screen.getByLabelText(/เบอร์โทรศัพท์/i);
    const passwordInput = screen.getByLabelText(/รหัสผ่านใหม่/i);
    const confirmInput = screen.getByLabelText(/ยืนยันรหัสผ่าน/i);

    await userEvent.type(nameInput, 'Invited User');
    await userEvent.type(phoneInput, '0812345678');
    await userEvent.type(passwordInput, 'NewPass123!');
    await userEvent.type(confirmInput, 'NewPass123!');

    await userEvent.click(screen.getByRole('button', { name: /บันทึกรหัสผ่าน/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
    });
  });
});
