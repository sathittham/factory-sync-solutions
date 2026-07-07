import { Layout } from '@/components/Layout';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import authReducer, { setLoading, setProfile, setUser } from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  trackEvent: vi.fn(),
  trackPageView: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  signOut: mocks.signOut,
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: mocks.trackEvent,
  trackPageView: mocks.trackPageView,
}));

function setupMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
  // Force desktop layout — useIsMobile() reads window.innerWidth directly, and
  // a "mobile" viewport swaps the sidebar for a closed-by-default Sheet.
  Object.defineProperty(globalThis, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
}

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

function renderLayout(initialPath: string, store: ReturnType<typeof makeStore>) {
  const rootRoute = createRootRoute({ component: Layout });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home Content</div>,
  });
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/register',
    component: () => <div>Register Content</div>,
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard',
    component: () => <div>Dashboard Content</div>,
  });
  const profileRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/profile',
    component: () => <div>Profile Content</div>,
  });
  const adminRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/admin',
    component: () => <div>Admin Content</div>,
  });
  const companySettingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/company-settings',
    component: () => <div>Company Settings Content</div>,
  });
  const routeTree = rootRoute.addChildren([
    homeRoute,
    registerRoute,
    dashboardRoute,
    profileRoute,
    adminRoute,
    companySettingsRoute,
  ]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <LocaleProvider>
          <ThemeProvider>
            <RouterProvider router={router} />
          </ThemeProvider>
        </LocaleProvider>
      </Provider>
    </QueryClientProvider>,
  );
}

describe('Layout', () => {
  beforeAll(() => {
    // jsdom does not implement pointer capture / scrollIntoView, which the
    // Radix DropdownMenu primitive (sidebar user menu, company switcher)
    // relies on when opening its menu via user interaction.
    globalThis.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    globalThis.HTMLElement.prototype.releasePointerCapture = vi.fn();
    globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('fss-locale', 'en');
    localStorage.setItem('fss-cookie-consent', 'all');
    setupMatchMedia();
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue(undefined);
  });

  it('renders only the outlet and top-right switchers on the sign-in auth page', async () => {
    const store = makeStore();
    store.dispatch(setLoading(false));
    renderLayout('/', store);

    // TanStack Router resolves the initial match asynchronously, even against
    // memory history — content is not present on the very first render tick.
    expect(await screen.findByText('Home Content')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Theme')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('renders only the outlet on the /register auth page', async () => {
    const store = makeStore();
    store.dispatch(setLoading(false));
    renderLayout('/register', store);

    expect(await screen.findByText('Register Content')).toBeInTheDocument();
  });

  it('shows header skeletons while auth is still loading', async () => {
    const store = makeStore();
    const { container } = renderLayout('/dashboard', store);

    // The routed page content renders regardless of auth-loading state — only
    // the header chrome (breadcrumb / sidebar nav) is gated on it.
    await waitFor(() => expect(container.querySelector('.animate-pulse')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /Dashboard/ })).not.toBeInTheDocument();
  });

  it('renders the sidebar navigation and breadcrumb for an authenticated user', async () => {
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
    store.dispatch(setLoading(false));
    renderLayout('/dashboard', store);

    expect(await screen.findByText('Dashboard Content')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quiz/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Results/ })).toBeInTheDocument();
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
  });

  it('hides the admin menu for a regular user without elevated permissions', async () => {
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
    store.dispatch(setLoading(false));
    renderLayout('/dashboard', store);

    await screen.findByText('Dashboard Content');
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  it('shows the admin menu for an admin user', async () => {
    const store = makeStore();
    store.dispatch(
      setUser({
        uid: baseProfile.uid,
        email: baseProfile.email,
        displayName: 'Factory Owner',
        photoURL: null,
      }),
    );
    store.dispatch(setProfile({ ...baseProfile, role: 'admin' }));
    store.dispatch(setLoading(false));
    renderLayout('/dashboard', store);

    await screen.findByText('Dashboard Content');
    expect(screen.getByText('Administration')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Admin/ })).toBeInTheDocument();
  });

  it('navigates to /profile when the profile menu item is clicked', async () => {
    const user = userEvent.setup();
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
    store.dispatch(setLoading(false));
    renderLayout('/dashboard', store);

    await screen.findByText('Dashboard Content');
    // The sidebar user menu label prefers profile.contactName over the
    // Firebase user's displayName — see SidebarUserMenu in Layout.tsx.
    await user.click(screen.getByText('Jane Doe'));
    await user.click(await screen.findByTestId('nav-profile-btn'));

    expect(await screen.findByText('Profile Content')).toBeInTheDocument();
    expect(mocks.trackEvent).toHaveBeenCalledWith('profile_open', { source: 'sidebar_user_menu' });
  });

  it('signs the user out and returns to the home route', async () => {
    const user = userEvent.setup();
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
    store.dispatch(setLoading(false));
    renderLayout('/dashboard', store);

    await screen.findByText('Dashboard Content');
    await user.click(screen.getByText('Jane Doe'));
    await user.click(await screen.findByText('Sign Out'));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(await screen.findByText('Home Content')).toBeInTheDocument();
  });

  it('opens the terms modal from the footer', async () => {
    // The footer only renders on non-auth-page layouts (with the sidebar
    // chrome) — the bare auth-page branch ('/', '/register') omits it.
    const store = makeStore();
    store.dispatch(setLoading(false));
    renderLayout('/dashboard', store);

    fireEvent.click(await screen.findByRole('button', { name: 'Terms & Conditions' }));

    expect(
      await screen.findByRole('heading', { name: 'Terms and Conditions' }),
    ).toBeInTheDocument();
  });

  it('opens cookie settings from the footer', async () => {
    const store = makeStore();
    store.dispatch(setLoading(false));
    renderLayout('/dashboard', store);

    fireEvent.click(await screen.findByRole('button', { name: 'Cookie Settings' }));

    expect(await screen.findByTestId('cookie-confirm-btn')).toBeInTheDocument();
  });

  it('tracks a locale change when the language switcher is used', async () => {
    const store = makeStore();
    store.dispatch(setLoading(false));
    renderLayout('/', store);

    fireEvent.click(await screen.findByLabelText('Language'));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'TH Thai' }));

    expect(mocks.trackEvent).toHaveBeenCalledWith('locale_change', { locale: 'th' });
  });

  it('switches the active company and tracks the event', async () => {
    const user = userEvent.setup();
    const store = makeStore();
    store.dispatch(
      setUser({
        uid: baseProfile.uid,
        email: baseProfile.email,
        displayName: 'Factory Owner',
        photoURL: null,
      }),
    );
    store.dispatch(
      setProfile({
        ...baseProfile,
        companies: [
          {
            companyName: 'Second Factory',
            companyRegId: '9999999999999',
            industryType: 'food',
            companySize: 'small',
          },
        ],
      }),
    );
    store.dispatch(setLoading(false));
    renderLayout('/dashboard', store);

    await screen.findByText('Dashboard Content');
    // aria-label overrides the visible company name as the accessible name.
    expect(screen.getByText('Acme Manufacturing')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Company' }));
    await user.click(await screen.findByText('Second Factory'));

    expect(mocks.trackEvent).toHaveBeenCalledWith('company_switch', { source: 'header' });
    expect(store.getState().auth.profile?.companyRegId).toBe('9999999999999');
  });
});
