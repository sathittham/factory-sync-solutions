import { LocaleProvider } from '@/lib/i18n';
import authReducer, { setProfile, setUser } from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockBack = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ history: { back: mockBack } }),
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

import { NotFoundPage } from './NotFoundPage';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderPage(store = makeStore()) {
  render(
    <Provider store={store}>
      <LocaleProvider>
        <NotFoundPage />
      </LocaleProvider>
    </Provider>,
  );
  return store;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); // default locale = th
});

describe('NotFoundPage', () => {
  it('renders the 404 title and description', () => {
    renderPage();

    expect(screen.getByText('ไม่พบหน้าที่ค้นหา')).toBeInTheDocument();
    expect(screen.getByText('หน้านี้อาจถูกลบออก เปลี่ยนชื่อ หรือไม่เคยมีอยู่')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('shows only the sign-in quick link when unauthenticated', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /เข้าสู่ระบบ/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /แดชบอร์ด/ })).not.toBeInTheDocument();
  });

  it('shows dashboard/quiz/results quick links for an authenticated, registered user', () => {
    const store = makeStore();
    store.dispatch(setUser({ uid: 'uid-1', email: 'a@b.com', displayName: 'A', photoURL: null }));
    store.dispatch(
      setProfile({
        uid: 'uid-1',
        email: 'a@b.com',
        displayName: 'A',
        companyName: 'Co',
        companyRegId: '0105500000000',
        industryType: 'manufacturing',
        companySize: 'S',
        contactName: 'A',
        contactEmail: 'a@b.com',
        contactPhone: '0800000000',
        role: 'user',
      }),
    );
    renderPage(store);

    expect(screen.getByRole('link', { name: /แดชบอร์ด/ })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /แบบประเมิน/ })).toHaveAttribute('href', '/quiz');
    expect(screen.getByRole('link', { name: /ผลลัพธ์/ })).toHaveAttribute('href', '/results');
  });

  it('goBack button calls router.history.back()', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /ย้อนกลับ/ }));
    expect(mockBack).toHaveBeenCalledOnce();
  });

  it('renders a home link pointing to /', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /กลับหน้าหลัก/ })).toHaveAttribute('href', '/');
  });
});
