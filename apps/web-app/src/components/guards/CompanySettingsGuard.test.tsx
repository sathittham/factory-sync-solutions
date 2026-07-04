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
import { CompanySettingsGuard } from './CompanySettingsGuard';

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

function renderCompanySettingsGuard(store: ReturnType<typeof makeStore>) {
  const rootRoute = createRootRoute({ component: Outlet });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home Page</div>,
  });
  const guardRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'guard',
    component: CompanySettingsGuard,
  });
  const settingsRoute = createRoute({
    getParentRoute: () => guardRoute,
    path: '/company-settings',
    component: () => <div>Company Settings Content</div>,
  });
  const routeTree = rootRoute.addChildren([indexRoute, guardRoute.addChildren([settingsRoute])]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/company-settings'] }),
  });

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
}

describe('CompanySettingsGuard', () => {
  it('redirects to home when there is no profile (default state)', async () => {
    const store = makeStore();
    renderCompanySettingsGuard(store);

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Company Settings Content')).not.toBeInTheDocument();
  });

  it('renders company settings when the profile role is admin', async () => {
    const store = makeStore();
    store.dispatch(setProfile({ ...baseProfile, role: 'admin' }));
    renderCompanySettingsGuard(store);

    expect(await screen.findByText('Company Settings Content')).toBeInTheDocument();
  });

  it('redirects to home for a plain user with no elevated role', async () => {
    const store = makeStore();
    store.dispatch(setProfile({ ...baseProfile, role: 'user' }));
    renderCompanySettingsGuard(store);

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Company Settings Content')).not.toBeInTheDocument();
  });

  it('renders company settings for a project-level manager role (allowed unlike AdminGuard)', async () => {
    const store = makeStore();
    store.dispatch(setProfile({ ...baseProfile, role: 'user', projectRole: 'manager' }));
    renderCompanySettingsGuard(store);

    expect(await screen.findByText('Company Settings Content')).toBeInTheDocument();
  });

  it('renders company settings when permissions.canEditCompany is explicitly true', async () => {
    const store = makeStore();
    store.dispatch(
      setProfile({
        ...baseProfile,
        role: 'user',
        projectRole: 'general_user',
        permissions: { canEditCompany: true },
      }),
    );
    renderCompanySettingsGuard(store);

    expect(await screen.findByText('Company Settings Content')).toBeInTheDocument();
  });

  it('renders company settings when permissions.canManageCompanySettings is explicitly true', async () => {
    const store = makeStore();
    store.dispatch(
      setProfile({
        ...baseProfile,
        role: 'user',
        projectRole: 'general_user',
        permissions: { canManageCompanySettings: true },
      }),
    );
    renderCompanySettingsGuard(store);

    expect(await screen.findByText('Company Settings Content')).toBeInTheDocument();
  });
});
