import { auth } from '@/lib/firebase';
import { useAppDispatch } from '@/store';
import {
  type BackofficeRole,
  logout,
  setBackofficeRole,
  setLoading,
  setUser,
} from '@/store/authSlice';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

export function useAuth() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Keep guards in loading state until the token claim is resolved.
        // Without this, BackofficeGuard renders between setUser and
        // setBackofficeRole and incorrectly redirects to /unauthorized.
        dispatch(setLoading(true));
        dispatch(
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL,
          }),
        );

        try {
          // Force-refresh so claims are always fresh on initial load
          const tokenResult = await firebaseUser.getIdTokenResult(/* forceRefresh */ true);
          const role = tokenResult.claims.backofficeRole as BackofficeRole | undefined;
          dispatch(setBackofficeRole(role ?? null));
        } catch {
          dispatch(setBackofficeRole(null));
        }

        dispatch(setLoading(false));
      } else {
        dispatch(logout());
        dispatch(setLoading(false));
      }
    });

    return unsubscribe;
  }, [dispatch]);
}
