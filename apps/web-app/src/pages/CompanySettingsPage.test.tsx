import { LocaleProvider } from '@/lib/i18n';
import authReducer, { setProfile } from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
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
  api: { put: vi.fn() },
}));

import { ApiError, api } from '@/lib/api';
import { CompanySettingsPage } from './CompanySettingsPage';

const mockApiPut = vi.mocked(api.put);

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
  render(
    <Provider store={store}>
      <LocaleProvider>
        <CompanySettingsPage />
      </LocaleProvider>
    </Provider>,
  );
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); // default locale = th
});

describe('CompanySettingsPage', () => {
  it('shows a skeleton form while the profile has not loaded yet', () => {
    const { container } = render(
      <Provider store={makeStore()}>
        <LocaleProvider>
          <CompanySettingsPage />
        </LocaleProvider>
      </Provider>,
    );

    expect(screen.getByText('ตั้งค่าบริษัท')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('ชื่อบริษัท')).not.toBeInTheDocument();
  });

  it('pre-fills the form from the profile in Redux', () => {
    const store = makeStore();
    store.dispatch(setProfile(PROFILE));
    renderPage(store);

    expect(screen.getByDisplayValue('โรงงานทดสอบ')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Op Contact')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0105500000000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled();
  });

  it('saves successfully, calls the API, syncs the updated profile to Redux, and shows the success banner', async () => {
    mockApiPut.mockResolvedValue({ ...PROFILE, companyName: 'ชื่อใหม่' });
    const store = makeStore();
    store.dispatch(setProfile(PROFILE));
    renderPage(store);

    const nameInput = screen.getByDisplayValue('โรงงานทดสอบ');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'ชื่อใหม่');
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        '/profile',
        expect.objectContaining({ companyName: 'ชื่อใหม่' }),
      );
    });
    expect(store.getState().auth.profile?.companyName).toBe('ชื่อใหม่');
    expect(await screen.findByText('บันทึกข้อมูลเรียบร้อยแล้ว')).toBeInTheDocument();
  });

  it('shows the API error message when the save fails', async () => {
    mockApiPut.mockRejectedValue(new ApiError(409, 'ชื่อบริษัทซ้ำ'));
    const store = makeStore();
    store.dispatch(setProfile(PROFILE));
    renderPage(store);

    const nameInput = screen.getByDisplayValue('โรงงานทดสอบ');
    await userEvent.type(nameInput, ' 2');
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

    await waitFor(() => {
      expect(screen.getByText('ชื่อบริษัทซ้ำ')).toBeInTheDocument();
    });
  });

  it('toggles the email notifications switch', async () => {
    const store = makeStore();
    store.dispatch(setProfile(PROFILE));
    renderPage(store);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeEnabled();
  });
});
