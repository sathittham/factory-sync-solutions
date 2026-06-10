import { trackEvent } from '@/lib/analytics';
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
import { getRedirectResult, onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

export function useAuth() {
	const dispatch = useAppDispatch();

	useEffect(() => {
		// Resolve pending redirect sign-in (fires once on page load after redirect)
		getRedirectResult(auth)
			.then((result) => {
				if (result) {
					trackEvent('sign_in_success', { method: 'google' });
				}
			})
			.catch(() => {
				trackEvent('sign_in_error', { method: 'google' });
			});

		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
					const profile = await api.get<Profile>('/profile');
					dispatch(setProfile(profile));

					try {
						const results = await api.get<unknown[]>('/results');
						dispatch(setHasCompletedQuiz(results.length > 0));
					} catch {
						dispatch(setHasCompletedQuiz(false));
					}
					dispatch(setLoading(false));
				} catch (err) {
					if (err instanceof ApiError && err.status === 404) {
						// Authenticated but no profile yet → needs to register
						dispatch(setProfile(null));
					} else if (err instanceof ApiError && err.status === 401) {
						// Token rejected by API → treat as logged out
						dispatch(logout());
					}
					// Always unblock the UI — an infinite spinner is worse than any redirect
					dispatch(setLoading(false));
				}
			} else {
				dispatch(logout());
				dispatch(setLoading(false));
			}
		});

		return unsubscribe;
	}, [dispatch]);
}
