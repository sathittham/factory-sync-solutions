import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { setUser } from './authSlice';
import { store, useAppDispatch, useAppSelector } from './index';

function Probe() {
  const dispatch = useAppDispatch();
  const uid = useAppSelector((s) => s.auth.user?.uid ?? 'none');

  return (
    <button
      type="button"
      onClick={() =>
        dispatch(
          setUser({
            uid: 'uid-staff-1',
            email: 'staff@factorysyncsolutions.com',
            displayName: 'Staff One',
            photoURL: null,
          }),
        )
      }
    >
      {uid}
    </button>
  );
}

describe('store', () => {
  it('registers the auth reducer with the correct initial shape', () => {
    const state = store.getState();
    expect(state.auth.isAuthenticated).toBe(false);
    expect(state.auth.loading).toBe(true);
    expect(state.auth.user).toBeNull();
  });

  it('useAppSelector reads state and useAppDispatch dispatches actions inside a Provider', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    render(<Probe />, { wrapper });

    expect(screen.getByRole('button')).toHaveTextContent('none');

    screen.getByRole('button').click();

    expect(await screen.findByText('uid-staff-1')).toBeInTheDocument();
    expect(store.getState().auth.user?.uid).toBe('uid-staff-1');
  });
});
