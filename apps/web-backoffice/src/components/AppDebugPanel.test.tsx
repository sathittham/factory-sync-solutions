import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDebugPanel } from './AppDebugPanel';

type AuthState = ReturnType<typeof authReducer>;

const baseState: AuthState = {
  user: null,
  backofficeRole: null,
  isAuthenticated: false,
  isBackofficeUser: false,
  isSuperAdmin: false,
  loading: false,
};

function renderPanel(authState: Partial<AuthState> = {}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...baseState, ...authState } },
  });

  return render(
    <Provider store={store}>
      <AppDebugPanel />
    </Provider>,
  );
}

describe('AppDebugPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a collapsed launcher button by default', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: 'Show debug panel' })).toBeInTheDocument();
    expect(screen.queryByText('🐞 web-backoffice')).not.toBeInTheDocument();
  });

  it('expands to show the panel title and auth section when the launcher is clicked', async () => {
    renderPanel({
      user: {
        uid: 'uid-staff-1',
        email: 'staff@factorysyncsolutions.com',
        displayName: 'Staff One',
        photoURL: null,
      },
      backofficeRole: 'superadmin',
      isAuthenticated: true,
      isBackofficeUser: true,
      isSuperAdmin: true,
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Show debug panel' }));

    expect(screen.getByText('🐞 web-backoffice')).toBeInTheDocument();
    // "auth" and "store" sections both dump the same values, so at least one match suffices.
    expect(screen.getAllByText(/uid-staff-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/superadmin/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/isSuperAdmin/).length).toBeGreaterThan(0);
  });

  it('surfaces the current route path in the data section', async () => {
    renderPanel();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Show debug panel' }));

    expect(screen.getByText(/"route"/)).toBeInTheDocument();
  });

  it('closes again when the launcher is toggled a second time', async () => {
    renderPanel();

    const user = userEvent.setup();
    const launcher = screen.getByRole('button', { name: 'Show debug panel' });
    await user.click(launcher);
    expect(screen.getByText('🐞 web-backoffice')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hide debug panel' }));
    expect(screen.queryByText('🐞 web-backoffice')).not.toBeInTheDocument();
  });
});
