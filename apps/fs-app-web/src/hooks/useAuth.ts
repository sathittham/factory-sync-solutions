import { api, ApiError } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { useAppDispatch } from '@/store';
import {
	logout,
	setHasCompletedQuiz,
	setLoading,
	setProfile,
	setUser,
	type Profile,
} from '@/store/authSlice';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

export function useAuth() {
	const dispatch = useAppDispatch();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			console.debug('[useAuth] onAuthStateChanged fired — user:', firebaseUser?.uid ?? null);

			if (firebaseUser) {
				dispatch(
					setUser({
						uid: firebaseUser.uid,
						email: firebaseUser.email || '',
						displayName: firebaseUser.displayName || '',
						photoURL: firebaseUser.photoURL,
					}),
				);

				try {
					// Force-refresh so getIdToken returns a valid token after popup
					const token = await firebaseUser.getIdToken(/* forceRefresh */ false);
					console.debug('[useAuth] token obtained (first 20 chars):', token.slice(0, 20));
					console.debug('[useAuth] auth.currentUser at fetch time:', auth.currentUser?.uid ?? null);

					const profile = await api.get<Profile>('/profile');
					console.debug('[useAuth] profile fetched:', profile);
					dispatch(setProfile(profile));

					try {
						const results = await api.get<unknown[]>('/results');
						dispatch(setHasCompletedQuiz(results.length > 0));
					} catch {
						dispatch(setHasCompletedQuiz(false));
					}
					dispatch(setLoading(false));
				} catch (err) {
					console.warn('[useAuth] profile fetch error:', err);
					if (err instanceof ApiError && err.status === 404) {
						console.debug('[useAuth] no profile → RegisterGuard will redirect to official-web /register');
						dispatch(setProfile(null));
					} else if (err instanceof ApiError && err.status === 401) {
						console.warn('[useAuth] 401 on profile — token rejected, signing out Firebase session');
						await auth.signOut();
						dispatch(logout());
					} else {
						console.error('[useAuth] unexpected error on profile fetch:', err);
					}
					dispatch(setLoading(false));
				}
			} else {
				console.debug('[useAuth] no user → logout');
				dispatch(logout());
				dispatch(setLoading(false));
			}
		});

		return unsubscribe;
	}, [dispatch]);
}
