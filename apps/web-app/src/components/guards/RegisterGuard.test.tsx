import { LocaleProvider } from '@/lib/i18n';
import authReducer, { setProfile } from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterGuard } from './RegisterGuard';

const mocks = vi.hoisted(() => ({
  authSignOut: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { signOut: mocks.authSignOut },
}));

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderRegisterGuard(store: ReturnType<typeof makeStore>) {
  const rootRoute = createRootRoute({ component: Outlet });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home Page</div>,
  });
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/register',
    component: () => <div>Register Page</div>,
  });
  const guardRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'guard',
    component: RegisterGuard,
  });
  const dashboardRoute = createRoute({
    getParentRoute: () => guardRoute,
    path: '/dashboard',
    component: () => <div>Dashboard Content</div>,
  });
  const routeTree = rootRoute.addChildren([
    indexRoute,
    registerRoute,
    guardRoute.addChildren([dashboardRoute]),
  ]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
  });

  return render(
    <Provider store={store}>
      <LocaleProvider>
        <RouterProvider router={router} />
      </LocaleProvider>
    </Provider>,
  );
}

describe('RegisterGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('fss-locale', 'en');
    vi.clearAllMocks();
    mocks.authSignOut.mockResolvedValue(undefined);
  });

  it('renders the guarded route when the user is registered', async () => {
    const store = makeStore();
    store.dispatch(
      setProfile({
        uid: 'uid-factory-1',
        email: 'a@b.com',
        displayName: 'Test',
        companyName: 'Co',
        companyRegId: '1234567890123',
        industryType: 'manufacturing',
        companySize: 'medium',
        contactName: 'T',
        contactEmail: 't@t.com',
        contactPhone: '0812345678',
        role: 'user',
      }),
    );
    renderRegisterGuard(store);

    expect(await screen.findByText('Dashboard Content')).toBeInTheDocument();
  });

  it('shows the no-company dialog when the user is not registered', async () => {
    const store = makeStore();
    renderRegisterGuard(store);

    expect(await screen.findByText('No Company Account Found')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
  });

  it('signs the user out when the Sign Out button is clicked', async () => {
    const store = makeStore();
    renderRegisterGuard(store);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign Out' }));

    expect(mocks.authSignOut).toHaveBeenCalledOnce();
  });

  it('navigates to /register when the Create Company button is clicked', async () => {
    const store = makeStore();
    renderRegisterGuard(store);

    fireEvent.click(await screen.findByRole('button', { name: 'Create Company' }));

    expect(await screen.findByText('Register Page')).toBeInTheDocument();
  });

  it('does not close the dialog when Escape is pressed (interaction is blocked)', async () => {
    const store = makeStore();
    renderRegisterGuard(store);
    await screen.findByText('No Company Account Found');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

    expect(screen.getByText('No Company Account Found')).toBeInTheDocument();
  });

  it('does not close the dialog when clicking outside its content (interaction is blocked)', async () => {
    const store = makeStore();
    renderRegisterGuard(store);
    await screen.findByText('No Company Account Found');

    fireEvent.pointerDown(document.body);
    fireEvent.pointerUp(document.body);

    expect(screen.getByText('No Company Account Found')).toBeInTheDocument();
  });
});
