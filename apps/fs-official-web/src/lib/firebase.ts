import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";

const firebaseConfig = {
	apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
	authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

// Guard against SSR — firebase/auth is browser-only; client:only islands still
// have their modules evaluated in Node during Vite's SSR pass.
const app =
	globalThis.window !== undefined && firebaseConfig.apiKey
		? initializeApp(firebaseConfig)
		: null;

// biome-ignore lint/suspicious/noExplicitAny: null placeholder for SSR; always a real Auth in browser
export const auth: ReturnType<typeof getAuth> = app ? getAuth(app) : (null as any);
export const googleProvider = new GoogleAuthProvider();
