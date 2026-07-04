import { LocaleProvider } from '@/lib/i18n';
import authReducer, { setLoading, setProfile, setUser } from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock('@/components/login-form', () => ({
  LoginForm: () => <div data-testid="login-form" />,
}));

vi.mock('@/lib/theme', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

// The real widget needs the Cloudflare Turnstile script (window.turnstile), which
// never loads in jsdom. VITE_CF_TURNSTILE_SITE_KEY is set in .env.local, so the
// real component would render and leave the form permanently un-verifiable —
// auto-verify instead, the same way a solved captcha would in production.
vi.mock('@/components/Turnstile', () => ({
  Turnstile: ({ onVerify }: { onVerify: (token: string) => void }) => {
    useEffect(() => {
      onVerify('test-turnstile-token');
    }, [onVerify]);
    return <div data-testid="turnstile-stub" />;
  },
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
  api: { get: vi.fn(), post: vi.fn() },
}));

import { ApiError, api } from '@/lib/api';
import { RegisterPage } from './RegisterPage';

const mockApiGet = vi.mocked(api.get);
const mockApiPost = vi.mocked(api.post);

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderPage(store = makeStore()) {
  return render(
    <Provider store={store}>
      <LocaleProvider>
        <RegisterPage />
      </LocaleProvider>
    </Provider>,
  );
}

function authedStore() {
  const store = makeStore();
  store.dispatch(setLoading(false));
  store.dispatch(
    setUser({ uid: 'uid-factory-1', email: 'op@example.com', displayName: 'Op', photoURL: null }),
  );
  return store;
}

async function selectOption(triggerId: string, optionName: string) {
  await userEvent.click(document.getElementById(triggerId) as HTMLElement);
  await userEvent.click(await screen.findByRole('option', { name: optionName }));
}

async function fillStep1() {
  await userEvent.type(screen.getByLabelText(/เลขทะเบียนนิติบุคคล/), '0105500000000');
  await userEvent.type(screen.getByLabelText('ชื่อบริษัท'), 'บริษัท ทดสอบ จำกัด');
  await selectOption('industryType', 'การผลิต');
  await selectOption('companySize', 'เล็ก (< 50 คน)');
  await userEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));
}

// jsdom does not implement the Pointer Events APIs Radix Select relies on for
// its open/close interaction — stub them so userEvent.click can drive it.
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear(); // default locale = th
  mockApiGet.mockRejectedValue(new ApiError(404, 'not found'));
});

describe('RegisterPage — access states', () => {
  it('shows a loading spinner while auth state is resolving', () => {
    const { container } = renderPage();

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders the login form when unauthenticated', () => {
    const store = makeStore();
    store.dispatch(setLoading(false));
    renderPage(store);

    expect(screen.getByTestId('login-form')).toBeInTheDocument();
  });

  it('redirects an already-registered user to the dashboard', () => {
    const store = authedStore();
    store.dispatch(
      setProfile({
        uid: 'uid-factory-1',
        email: 'op@example.com',
        displayName: 'Op',
        companyName: 'Co',
        companyRegId: '0105500000000',
        industryType: 'manufacturing',
        companySize: 'small',
        contactName: 'Op',
        contactEmail: 'op@example.com',
        contactPhone: '0800000000',
        role: 'user',
      }),
    );
    renderPage(store);

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/dashboard');
  });
});

describe('RegisterPage — step 1: company info', () => {
  it('does not advance to step 2 when required fields are missing', async () => {
    renderPage(authedStore());

    await userEvent.click(screen.getByRole('button', { name: /ถัดไป/ }));

    // Validation blocks the step transition — step 1's fields are still on screen.
    await waitFor(() => {
      expect(screen.getByLabelText(/เลขทะเบียนนิติบุคคล/)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText('ชื่อผู้ติดต่อ')).not.toBeInTheDocument();
  });

  it('looks up DBD data and pre-fills the company name', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/profile/check/')) return Promise.reject(new ApiError(404, 'nf'));
      return Promise.resolve({
        nameTh: 'บริษัท ดีบีดี จำกัด',
        nameEn: 'DBD Co., Ltd.',
        type: 'บริษัทจำกัด',
        registerCapital: '1000000',
        objectiveTextTh: '',
        objectiveTextEn: '',
        address: '',
        subDistrict: '',
        district: '',
        province: '',
      });
    });
    renderPage(authedStore());

    await userEvent.type(screen.getByLabelText(/เลขทะเบียนนิติบุคคล/), '0105500000000');
    await userEvent.click(screen.getByTestId('reg-dbd-lookup-btn'));

    expect(await screen.findByText('บริษัท ดีบีดี จำกัด')).toBeInTheDocument();
    expect(screen.getByDisplayValue('บริษัท ดีบีดี จำกัด')).toBeInTheDocument();
  });

  it('shows a taken-registration notice when the company already exists', async () => {
    mockApiGet.mockImplementation((path: string) => {
      if (path.startsWith('/profile/check/')) {
        return Promise.resolve({
          registered: true,
          companyName: 'บริษัท มีอยู่แล้ว',
          industryType: 'food',
          companySize: 'medium',
        });
      }
      return Promise.reject(new ApiError(404, 'nf'));
    });
    renderPage(authedStore());

    await userEvent.type(screen.getByLabelText(/เลขทะเบียนนิติบุคคล/), '0105500000000');
    await userEvent.click(screen.getByTestId('reg-dbd-lookup-btn'));

    expect(await screen.findByText('บริษัทลงทะเบียนแล้ว')).toBeInTheDocument();
    expect(screen.getByText(/บริษัท มีอยู่แล้ว/)).toBeInTheDocument();
  });

  it('advances to step 2 once all fields are valid', async () => {
    renderPage(authedStore());
    await fillStep1();

    expect(screen.getByLabelText('ชื่อผู้ติดต่อ')).toBeInTheDocument();
    // RegisterShell's step badge is 1-indexed off the internal 1|2 form step (+1).
    expect(screen.getByText(/3\/3/)).toBeInTheDocument();
  });
});

describe('RegisterPage — step 2: contact info and submission', () => {
  it('can go back to step 1 from step 2', async () => {
    renderPage(authedStore());
    await fillStep1();

    await userEvent.click(screen.getByRole('button', { name: /ย้อนกลับ/ }));
    expect(screen.getByLabelText(/เลขทะเบียนนิติบุคคล/)).toBeInTheDocument();
  });

  it('submits successfully and shows the success dialog, then continues to the dashboard', async () => {
    mockApiPost.mockResolvedValue({
      companyName: 'บริษัท ทดสอบ จำกัด',
      companyRegId: '0105500000000',
    });
    renderPage(authedStore());
    await fillStep1();

    const nameInput = screen.getByLabelText('ชื่อผู้ติดต่อ');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Contact Person');
    await userEvent.type(screen.getByLabelText('เบอร์โทรศัพท์'), '0812345678');
    await userEvent.click(screen.getByTestId('registration-submit-btn'));

    expect(await screen.findByText('ลงทะเบียนสำเร็จ!')).toBeInTheDocument();
    expect(mockApiPost).toHaveBeenCalledWith(
      '/profile',
      expect.objectContaining({ contactName: 'Contact Person', contactPhone: '0812345678' }),
    );

    await userEvent.click(screen.getByTestId('registration-success-dashboard-btn'));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
  });

  it('shows an error message when submission fails', async () => {
    mockApiPost.mockRejectedValue(new ApiError(400, 'เลขทะเบียนไม่ถูกต้อง'));
    renderPage(authedStore());
    await fillStep1();

    await userEvent.type(screen.getByLabelText('ชื่อผู้ติดต่อ'), 'Contact Person');
    await userEvent.type(screen.getByLabelText('เบอร์โทรศัพท์'), '0812345678');
    await userEvent.click(screen.getByTestId('registration-submit-btn'));

    await waitFor(() => {
      expect(screen.getByText('เลขทะเบียนไม่ถูกต้อง')).toBeInTheDocument();
    });
    expect(screen.queryByText('ลงทะเบียนสำเร็จ!')).not.toBeInTheDocument();
  });
});
