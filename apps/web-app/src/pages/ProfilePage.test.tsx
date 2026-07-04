import { LocaleProvider } from '@/lib/i18n';
import authReducer, { setProfile, setUser } from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Radix Switch measures its thumb via ResizeObserver, which jsdom does not implement.
class ResizeObserverStub {
  observe() {
    /* noop: jsdom has no layout engine */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const mockAuth = vi.hoisted(() => ({
  currentUser: null as {
    uid: string;
    email: string;
    providerData: { providerId: string }[];
  } | null,
}));

vi.mock('@/lib/firebase', () => ({
  auth: mockAuth,
  googleProvider: {},
}));

vi.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: vi.fn().mockReturnValue('mock-credential') },
  linkWithCredential: vi.fn(),
  linkWithPopup: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  unlink: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    postForm: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '@/lib/api';
import {
  EmailAuthProvider,
  linkWithPopup,
  reauthenticateWithCredential,
  unlink,
  updatePassword,
} from 'firebase/auth';
import { ProfilePage } from './ProfilePage';

const mockApiGet = vi.mocked(api.get);
const mockApiPut = vi.mocked(api.put);
const mockApiPostForm = vi.mocked(api.postForm);
const mockApiDelete = vi.mocked(api.delete);
const mockLinkWithPopup = vi.mocked(linkWithPopup);
const mockUnlink = vi.mocked(unlink);
const mockReauthenticate = vi.mocked(reauthenticateWithCredential);
const mockUpdatePassword = vi.mocked(updatePassword);

const PROFILE = {
  uid: 'uid-factory-1',
  email: 'op@example.com',
  displayName: 'Op',
  companyName: 'โรงงานทดสอบ',
  companyRegId: '0105500000000',
  industryType: 'manufacturing',
  companySize: 'small',
  contactName: 'Op Contact',
  contactEmail: 'op@example.com',
  contactPhone: '0800000000',
  role: 'user',
  emailNotifications: false,
};

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderPage(store = makeStore()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <LocaleProvider>
          <ProfilePage />
        </LocaleProvider>
      </Provider>
    </QueryClientProvider>,
  );
  return store;
}

function setupAuthedStore(providers: string[] = ['password']) {
  mockAuth.currentUser = {
    uid: 'uid-factory-1',
    email: 'op@example.com',
    providerData: providers.map((providerId) => ({ providerId })),
  };
  const store = makeStore();
  store.dispatch(
    setUser({ uid: 'uid-factory-1', email: 'op@example.com', displayName: 'Op', photoURL: null }),
  );
  store.dispatch(setProfile(PROFILE));
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); // default locale = th
  mockAuth.currentUser = null;
  mockApiGet.mockResolvedValue([]);
});

describe('ProfilePage — account header', () => {
  it('shows the display name, email, and linked-provider badges', () => {
    const store = setupAuthedStore(['password', 'google.com']);
    renderPage(store);

    expect(screen.getByText('Op')).toBeInTheDocument();
    expect(screen.getByText('op@example.com')).toBeInTheDocument();
    expect(screen.getByText('อีเมล & รหัสผ่าน')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });
});

describe('ProfilePage — profile tab', () => {
  it('pre-fills the contact fields and saves changes', async () => {
    mockApiPut.mockResolvedValue({ ...PROFILE, contactName: 'New Contact' });
    const store = setupAuthedStore();
    renderPage(store);

    const nameInput = screen.getByDisplayValue('Op Contact');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Contact');
    await userEvent.click(screen.getByTestId('profile-submit-btn'));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        '/profile',
        expect.objectContaining({ contactName: 'New Contact' }),
      );
    });
    expect(screen.getByText('บันทึกเรียบร้อยแล้ว')).toBeInTheDocument();
    expect(store.getState().auth.profile?.contactName).toBe('New Contact');
  });
});

describe('ProfilePage — notifications tab', () => {
  it('toggles email notifications and saves', async () => {
    mockApiPut.mockResolvedValue({ ...PROFILE, emailNotifications: true });
    const store = setupAuthedStore();
    renderPage(store);

    await userEvent.click(screen.getByRole('tab', { name: 'การแจ้งเตือน' }));
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole('button', { name: 'บันทึกการเปลี่ยนแปลง' }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        '/profile',
        expect.objectContaining({ emailNotifications: true }),
      );
    });
  });
});

describe('ProfilePage — activity tab', () => {
  it('shows an empty state when there is no activity', async () => {
    mockApiGet.mockResolvedValue([]);
    const store = setupAuthedStore();
    renderPage(store);

    await userEvent.click(screen.getByRole('tab', { name: 'ประวัติการใช้งาน' }));

    expect(await screen.findByText('ยังไม่มีประวัติการใช้งาน')).toBeInTheDocument();
  });

  it('lists activity events with a translated label', async () => {
    mockApiGet.mockResolvedValue([
      { id: 'ev-1', eventType: 'user.login', createdAt: '2026-06-10T00:00:00Z' },
    ]);
    const store = setupAuthedStore();
    renderPage(store);

    await userEvent.click(screen.getByRole('tab', { name: 'ประวัติการใช้งาน' }));

    expect(await screen.findByText('เข้าสู่ระบบ')).toBeInTheDocument();
  });
});

describe('ProfilePage — security tab', () => {
  it('shows the change-password form only when a password provider is linked', async () => {
    const store = setupAuthedStore(['password']);
    renderPage(store);

    await userEvent.click(screen.getByRole('tab', { name: 'ความปลอดภัย' }));

    expect(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' })).toBeInTheDocument();
  });

  it('hides the change-password form and disables unlink when only Google is linked', async () => {
    const store = setupAuthedStore(['google.com']);
    renderPage(store);

    await userEvent.click(screen.getByRole('tab', { name: 'ความปลอดภัย' }));

    expect(screen.queryByRole('button', { name: 'เปลี่ยนรหัสผ่าน' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ยกเลิก Google' })).toBeDisabled();
  });

  it('links a Google account and updates the sign-in methods card', async () => {
    mockLinkWithPopup.mockResolvedValue({
      user: { displayName: 'Op', photoURL: null },
    } as never);
    const store = setupAuthedStore(['password']);
    renderPage(store);

    await userEvent.click(screen.getByRole('tab', { name: 'ความปลอดภัย' }));
    await userEvent.click(screen.getByRole('button', { name: 'เชื่อมต่อ Google' }));

    expect(await screen.findByText('เชื่อมต่อบัญชีเรียบร้อยแล้ว')).toBeInTheDocument();
    expect(mockLinkWithPopup).toHaveBeenCalledOnce();
  });

  it('unlinks a provider when more than one is linked', async () => {
    mockUnlink.mockResolvedValue(undefined as never);
    const store = setupAuthedStore(['password', 'google.com']);
    renderPage(store);

    await userEvent.click(screen.getByRole('tab', { name: 'ความปลอดภัย' }));
    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิก Google' }));

    expect(await screen.findByText('ยกเลิกการเชื่อมต่อแล้ว')).toBeInTheDocument();
    expect(mockUnlink).toHaveBeenCalledWith(mockAuth.currentUser, 'google.com');
  });

  it('changes the password after re-authentication succeeds', async () => {
    mockReauthenticate.mockResolvedValue(undefined as never);
    mockUpdatePassword.mockResolvedValue(undefined as never);
    setupAuthedStore(['password']);
    renderPage();

    await userEvent.click(screen.getByRole('tab', { name: 'ความปลอดภัย' }));

    await userEvent.type(screen.getByLabelText('รหัสผ่านปัจจุบัน'), 'oldpass123');
    await userEvent.type(screen.getByLabelText('รหัสผ่านใหม่'), 'newpass123');
    await userEvent.type(screen.getByLabelText('ยืนยันรหัสผ่านใหม่'), 'newpass123');
    await userEvent.click(screen.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน' }));

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith(mockAuth.currentUser, 'newpass123');
    });
    expect(EmailAuthProvider.credential).toHaveBeenCalledWith('op@example.com', 'oldpass123');
    expect(await screen.findByText('เปลี่ยนรหัสผ่านเรียบร้อยแล้ว')).toBeInTheDocument();
  });
});

describe('ProfilePage — avatar upload', () => {
  it('rejects an oversized file client-side without calling the API', async () => {
    const store = setupAuthedStore();
    renderPage(store);

    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('avatar file input not found');
    const bigFile = new File([new Uint8Array(3 * 1024 * 1024)], 'big.png', {
      type: 'image/png',
    });
    await userEvent.upload(input as HTMLInputElement, bigFile);

    expect(await screen.findByText('ขนาดไฟล์ต้องไม่เกิน 2 MB')).toBeInTheDocument();
    expect(mockApiPostForm).not.toHaveBeenCalled();
  });

  it('uploads a valid avatar and syncs the URL to Redux', async () => {
    mockApiPostForm.mockResolvedValue({
      avatarURL: 'https://cdn.example.com/a.png',
      contentType: 'image/png',
      fileSizeBytes: 1024,
    });
    const store = setupAuthedStore();
    renderPage(store);

    const input = document.querySelector('input[type="file"]');
    if (!input) throw new Error('avatar file input not found');
    const file = new File(['abc'], 'avatar.png', { type: 'image/png' });
    await userEvent.upload(input as HTMLInputElement, file);

    await waitFor(() => {
      expect(store.getState().auth.profile?.avatarURL).toBe('https://cdn.example.com/a.png');
    });
  });

  it('deletes the avatar when the remove button is clicked', async () => {
    mockApiDelete.mockResolvedValue(undefined);
    const store = setupAuthedStore();
    store.dispatch(setProfile({ ...PROFILE, avatarURL: 'https://cdn.example.com/a.png' }));
    renderPage(store);

    const avatarCard = screen.getByText('Op').closest('div')?.parentElement;
    if (!avatarCard) throw new Error('avatar card not found');
    await userEvent.click(within(avatarCard).getByRole('button', { name: 'ลบรูปภาพ' }));

    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('/upload/avatar');
    });
    expect(store.getState().auth.profile?.avatarURL).toBe('');
  });
});
