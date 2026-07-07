import authReducer from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDebugPanel } from './AppDebugPanel';

function buildStore(authOverrides: Partial<ReturnType<typeof authReducer>> = {}) {
  return configureStore({
    reducer: { auth: authReducer, quiz: quizReducer },
    preloadedState: {
      auth: {
        user: null,
        profile: null,
        isAuthenticated: false,
        isRegistered: false,
        isAdmin: false,
        hasCompletedQuiz: false,
        loading: false,
        ...authOverrides,
      },
    },
  });
}

describe('AppDebugPanel', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/');
  });

  beforeEach(() => {
    window.history.pushState({}, '', '/quiz?debug');
  });

  it('renders the launcher with no session data (user/profile null)', () => {
    render(
      <Provider store={buildStore()}>
        <AppDebugPanel />
      </Provider>,
    );
    expect(screen.getByLabelText(/show debug panel/i)).toBeInTheDocument();
  });

  it('surfaces auth/session fields once expanded when a user and profile are set', async () => {
    const user = userEvent.setup();
    const store = buildStore({
      user: {
        uid: 'uid-factory-1',
        email: 'owner@factory.test',
        displayName: 'Owner',
        photoURL: null,
      },
      profile: {
        uid: 'uid-factory-1',
        email: 'owner@factory.test',
        displayName: 'Owner',
        companyName: 'Acme Factory',
        companyRegId: 'reg-1',
        industryType: 'manufacturing',
        companySize: 'medium',
        contactName: 'Owner',
        contactEmail: 'owner@factory.test',
        contactPhone: '0800000000',
        role: 'admin',
      },
      isAuthenticated: true,
      isRegistered: true,
      isAdmin: true,
      hasCompletedQuiz: true,
    });

    render(
      <Provider store={store}>
        <AppDebugPanel />
      </Provider>,
    );

    await user.click(screen.getByLabelText(/show debug panel/i));

    expect(screen.getByText(/web-app/)).toBeInTheDocument();
    expect(screen.getAllByText(/uid-factory-1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/"role":\s*"admin"/).length).toBeGreaterThan(0);
  });
});
