import authReducer, { setLoading, setUser } from '@/store/authSlice';
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
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { AuthGuard } from './AuthGuard';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderAuthGuard(store: ReturnType<typeof makeStore>) {
  const rootRoute = createRootRoute({ component: Outlet });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <div>Home Page</div>,
  });
  const guardRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: 'guard',
    component: AuthGuard,
  });
  const protectedRoute = createRoute({
    getParentRoute: () => guardRoute,
    path: '/protected',
    component: () => <div>Protected Content</div>,
  });
  const routeTree = rootRoute.addChildren([indexRoute, guardRoute.addChildren([protectedRoute])]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/protected'] }),
  });

  return render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
}

describe('AuthGuard', () => {
  it('shows a loading skeleton while auth state is resolving', async () => {
    const store = makeStore();
    const { container } = renderAuthGuard(store);

    await waitFor(() => expect(container.querySelector('.animate-pulse')).toBeInTheDocument());
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });

  it('redirects to home when the user is not authenticated', async () => {
    const store = makeStore();
    store.dispatch(setLoading(false));
    renderAuthGuard(store);

    expect(await screen.findByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders the protected route when the user is authenticated', async () => {
    const store = makeStore();
    store.dispatch(
      setUser({ uid: 'uid-factory-1', email: 'a@b.com', displayName: 'Test', photoURL: null }),
    );
    store.dispatch(setLoading(false));
    renderAuthGuard(store);

    expect(await screen.findByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });
});
