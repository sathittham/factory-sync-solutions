import { LocaleProvider } from '@/lib/i18n';
import authReducer, { setProfile } from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom does not implement the Pointer Events APIs Radix Select/Dialog rely on.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ searchStr: '' }),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
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
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  apiUrl: (path: string) => `/api/v1${path}`,
}));

import { api } from '@/lib/api';
import { AdminPage } from './AdminPage';

const mockApiGet = vi.mocked(api.get);
const mockApiPost = vi.mocked(api.post);
const mockApiPut = vi.mocked(api.put);
const mockApiDelete = vi.mocked(api.delete);

interface AdminAssessmentFixture {
  id: string;
  uid: string;
  quizId?: string;
  companyName?: string;
  industryType?: string;
  companySize?: string;
  contactName?: string;
  contactEmail?: string;
  overallScore: number;
  diagnosis: string;
  submittedAt: string;
  scores?: { dimensionId: string; dimensionName: string; score: number; maxScore: number }[];
  strengths?: string[];
  weaknesses?: string[];
}

interface AdminUserFixture {
  uid: string;
  email: string;
  displayName: string;
  companyName: string;
  companyRegId: string;
  industryType: string;
  companySize: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  role: string;
  isPending?: boolean;
  invitedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function assessment(over: Partial<AdminAssessmentFixture> = {}): AdminAssessmentFixture {
  return {
    id: 'a1',
    uid: 'u1',
    quizId: 'shindan',
    companyName: 'โรงงานทดสอบ',
    industryType: 'manufacturing',
    companySize: 'small',
    contactName: 'Op',
    contactEmail: 'op@example.com',
    overallScore: 3.52,
    diagnosis: 'Established',
    submittedAt: '2026-06-10T00:00:00Z',
    scores: [{ dimensionId: 'mgmt', dimensionName: 'Management', score: 3.5, maxScore: 5 }],
    strengths: ['จุดแข็ง 1'],
    weaknesses: ['จุดอ่อน 1'],
    ...over,
  };
}

function adminUser(over: Partial<AdminUserFixture> = {}): AdminUserFixture {
  return {
    uid: 'uid-2',
    email: 'member@example.com',
    displayName: 'Member',
    companyName: 'โรงงานทดสอบ',
    companyRegId: '0105500000000',
    industryType: 'manufacturing',
    companySize: 'small',
    contactName: 'Member Contact',
    contactEmail: 'member@example.com',
    contactPhone: '0800000000',
    role: 'user',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...over,
  };
}

const OWNER_PROFILE = {
  uid: 'uid-owner',
  email: 'owner@example.com',
  displayName: 'Owner',
  companyName: 'โรงงานทดสอบ',
  companyRegId: '0105500000000',
  industryType: 'manufacturing',
  companySize: 'small',
  contactName: 'Owner',
  contactEmail: 'owner@example.com',
  contactPhone: '0800000000',
  role: 'owner',
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
          <AdminPage />
        </LocaleProvider>
      </Provider>
    </QueryClientProvider>,
  );
  return store;
}

function ownerStore() {
  const store = makeStore();
  store.dispatch(setProfile(OWNER_PROFILE));
  return store;
}

async function selectComboboxOption(testId: string, optionName: string) {
  await userEvent.click(await screen.findByTestId(testId));
  await userEvent.click(await screen.findByRole('option', { name: optionName }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); // default locale = th
  mockApiGet.mockImplementation((path: string) => {
    if (path.startsWith('/admin/assessments')) return Promise.resolve([]);
    if (path.startsWith('/manage/users')) return Promise.resolve([]);
    return Promise.reject(new Error(`unhandled GET ${path}`));
  });
});

describe('AdminPage — tab visibility', () => {
  it('shows only the Users tab for an owner who cannot view all assessments', () => {
    renderPage(ownerStore());

    expect(screen.getByText('จัดการผู้ใช้งาน')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'แบบประเมิน' })).not.toBeInTheDocument();
  });

  it('shows both tabs for an admin', () => {
    const store = makeStore();
    store.dispatch(setProfile({ ...OWNER_PROFILE, role: 'admin' }));
    renderPage(store);

    expect(screen.getByRole('tab', { name: 'แบบประเมิน' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'ผู้ใช้งาน' })).toBeInTheDocument();
  });
});

describe('AdminPage — QuizTab', () => {
  function adminStore() {
    const store = makeStore();
    store.dispatch(setProfile({ ...OWNER_PROFILE, role: 'admin' }));
    return store;
  }

  it('shows stat cards, table rows, and an empty state message when there are no results', async () => {
    renderPage(adminStore());

    expect(await screen.findByText('ไม่พบข้อมูลการประเมิน')).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();
  });

  it('renders assessment rows and expands inline detail on row click', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/admin/assessments')) return Promise.resolve([assessment()]);
      if (path.startsWith('/manage/users')) return Promise.resolve([]);
      return Promise.reject(new Error(`unhandled GET ${path}`));
    });
    renderPage(adminStore());

    const table = await screen.findByTestId('admin-assessment-table');
    expect(within(table).getByText('โรงงานทดสอบ')).toBeInTheDocument();

    await userEvent.click(within(table).getByText('โรงงานทดสอบ'));

    expect(await screen.findByText('จุดแข็ง 1')).toBeInTheDocument();
    expect(screen.getByText('จุดอ่อน 1')).toBeInTheDocument();
  });

  it('filters assessments by industry', async () => {
    renderPage(adminStore());
    await screen.findByText('ไม่พบข้อมูลการประเมิน');

    await selectComboboxOption('admin-filter-industry', 'อาหารและเครื่องดื่ม');

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(expect.stringContaining('industryType=food'));
    });
  });

  it('opens the permissions matrix dialog', async () => {
    renderPage(adminStore());
    await screen.findByText('ไม่พบข้อมูลการประเมิน');

    await userEvent.click(screen.getByRole('tab', { name: 'ผู้ใช้งาน' }));
    await userEvent.click(screen.getByRole('button', { name: 'สิทธิ์การใช้งาน' }));

    expect(await screen.findByText('ทำแบบประเมิน')).toBeInTheDocument();
  });
});

describe('AdminPage — UsersTab', () => {
  it('lists users and shows role badges', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/manage/users')) return Promise.resolve([adminUser()]);
      return Promise.resolve([]);
    });
    renderPage(ownerStore());

    const table = await screen.findByTestId('admin-users-table');
    expect(within(table).getByText('Member Contact')).toBeInTheDocument();
    expect(within(table).getByText('ผู้ใช้')).toBeInTheDocument();
  });

  it('filters users by search text', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/manage/users')) {
        return Promise.resolve([
          adminUser({ uid: 'u1', contactName: 'Alice' }),
          adminUser({ uid: 'u2', contactName: 'Bob', email: 'bob@example.com' }),
        ]);
      }
      return Promise.resolve([]);
    });
    renderPage(ownerStore());

    await screen.findByText('Alice');
    await userEvent.type(screen.getByPlaceholderText('ค้นหาชื่อ หรืออีเมล'), 'Bob');

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('invites a member and shows a success toast', async () => {
    mockApiPost.mockResolvedValue(undefined);
    renderPage(ownerStore());
    await screen.findByText('ไม่พบข้อมูลผู้ใช้');

    await userEvent.click(screen.getByRole('button', { name: /เชิญสมาชิก/ }));
    await userEvent.type(screen.getByLabelText('อีเมล'), 'new@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'ส่งคำเชิญ' }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/manage/invitations', {
        email: 'new@example.com',
        role: 'user',
      });
    });
    expect(await screen.findByText('ส่งคำเชิญเรียบร้อย')).toBeInTheDocument();
  });

  it('edits a user role and shows a success toast', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/manage/users')) return Promise.resolve([adminUser()]);
      return Promise.resolve([]);
    });
    mockApiPut.mockResolvedValue(undefined);
    renderPage(ownerStore());

    const table = await screen.findByTestId('admin-users-table');
    await userEvent.click(within(table).getByRole('button', { name: 'แก้ไขบทบาท' }));

    await selectComboboxOption('admin-role-select', 'ผู้จัดการ');
    await userEvent.click(screen.getByTestId('admin-role-confirm-btn'));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/manage/users/uid-2/role', { role: 'manager' });
    });
    expect(await screen.findByText('อัปเดตบทบาทเรียบร้อย')).toBeInTheDocument();
  });

  it('resends and cancels a pending invitation', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/manage/users')) {
        return Promise.resolve([
          adminUser({ uid: 'pending-1', isPending: true, invitedAt: '2026-06-01T00:00:00Z' }),
        ]);
      }
      return Promise.resolve([]);
    });
    mockApiPost.mockResolvedValue(undefined);
    mockApiDelete.mockResolvedValue(undefined);
    renderPage(ownerStore());

    await screen.findByText('รอการยืนยัน');

    await userEvent.click(screen.getByRole('button', { name: 'ส่งคำเชิญอีกครั้ง' }));
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/manage/invitations/pending-1/resend', {});
    });
    expect(await screen.findByText('ส่งคำเชิญอีกครั้งแล้ว')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'ยกเลิกคำเชิญ' }));
    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('/manage/invitations/pending-1');
    });
  });

  it('opens the user detail dialog on row click', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/manage/users')) {
        return Promise.resolve([adminUser({ contactEmail: 'member-contact@example.com' })]);
      }
      return Promise.resolve([]);
    });
    renderPage(ownerStore());

    const table = await screen.findByTestId('admin-users-table');
    await userEvent.click(within(table).getByText('Member Contact'));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('รายละเอียดผู้ใช้')).toBeInTheDocument();
    // The account email shows both in the profile header and the "Account Email" field.
    expect(within(dialog).getAllByText('member@example.com')).toHaveLength(2);
    expect(within(dialog).getByText('member-contact@example.com')).toBeInTheDocument();
  });
});
