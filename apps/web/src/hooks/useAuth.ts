import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api, ApiError } from "@/lib/api";
import { useAppDispatch } from "@/store";
import {
	setUser,
	setProfile,
	setHasCompletedQuiz,
	setLoading,
	logout,
	type Profile,
} from "@/store/authSlice";

export function useAuth() {
	const dispatch = useAppDispatch();

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				dispatch(
					setUser({
						uid: firebaseUser.uid,
						email: firebaseUser.email || "",
						displayName: firebaseUser.displayName || "",
						photoURL: firebaseUser.photoURL,
					}),
				);

				try {
					const profile = await api.get<Profile>("/profile");
					dispatch(setProfile(profile));

					// Check if user has completed any quiz
					try {
						const results = await api.get<unknown[]>("/results");
						dispatch(setHasCompletedQuiz(results.length > 0));
					} catch {
						dispatch(setHasCompletedQuiz(false));
					}
				} catch (err) {
					if (err instanceof ApiError && err.status === 404) {
						dispatch(setProfile(null));
					}
				}
			} else {
				dispatch(logout());
			}
			dispatch(setLoading(false));
		});

		return unsubscribe;
	}, [dispatch]);
}
