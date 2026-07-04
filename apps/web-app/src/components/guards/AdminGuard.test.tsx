import authReducer, { type Profile, setProfile } from '@/store/authSlice';
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
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { AdminGuard } from './AdminGuard';

const baseProfile: Profile = {
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
};

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderAdminGuard(store: ReturnType<typeof makeStore>) {
  const rootRoute = createRootRoute({ component: Outlet });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home Page</div>,
  });
  const guardRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'guard',
    component: AdminGuard,
  });
  const adminRoute = createRoute({
    getParentRoute: () => guardRoute,
    path: '/admin',
    component: () => <div>Admin Content</div>,
  });
  const routeTree = rootRoute.addChildren([indexRoute, guardRoute.addChildren([adminRoute])]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/admin'] }),
  });

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
}

describe('AdminGuard', () => {
  it('redirects to home when there is no profile (default state)', async () => {
    const store = makeStore();
    renderAdminGuard(store);

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders the admin route when the profile role is admin', async () => {
    const store = makeStore();
    store.dispatch(setProfile({ ...baseProfile, role: 'admin' }));
    renderAdminGuard(store);

    expect(await screen.findByText('Admin Content')).toBeInTheDocument();
  });

  it('redirects to home for a plain user with no elevated role', async () => {
    const store = makeStore();
    store.dispatch(setProfile({ ...baseProfile, role: 'user' }));
    renderAdminGuard(store);

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders the admin route for a project-level owner role', async () => {
    const store = makeStore();
    store.dispatch(setProfile({ ...baseProfile, role: 'user', projectRole: 'owner' }));
    renderAdminGuard(store);

    expect(await screen.findByText('Admin Content')).toBeInTheDocument();
  });

  it('redirects to home for a project-level manager role (insufficient for user management)', async () => {
    const store = makeStore();
    store.dispatch(setProfile({ ...baseProfile, role: 'user', projectRole: 'manager' }));
    renderAdminGuard(store);

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
  });

  it('renders the admin route when permissions.canManageUsers is explicitly true', async () => {
    const store = makeStore();
    store.dispatch(
      setProfile({
        ...baseProfile,
        role: 'user',
        projectRole: 'general_user',
        permissions: { canManageUsers: true },
      }),
    );
    renderAdminGuard(store);

    expect(await screen.findByText('Admin Content')).toBeInTheDocument();
  });
});
