import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getAuth: vi.fn(() => ({ mockAuth: true })),
  GoogleAuthProvider: vi.fn().mockImplementation(function GoogleAuthProvider() {
    return { mockProvider: true };
  }),
}));

vi.mock('firebase/app', () => ({
  initializeApp: mocks.initializeApp,
}));

vi.mock('firebase/auth', () => ({
  getAuth: mocks.getAuth,
  GoogleAuthProvider: mocks.GoogleAuthProvider,
}));

describe('firebase', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('initializes the Firebase app with config sourced from Vite env vars', async () => {
    const { auth, googleProvider } = await import('./firebase');

    expect(mocks.initializeApp).toHaveBeenCalledOnce();
    expect(mocks.initializeApp).toHaveBeenCalledWith({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    expect(auth).toEqual({ mockAuth: true });
    expect(googleProvider).toEqual({ mockProvider: true });
  });

  it('builds auth from the app returned by initializeApp', async () => {
    await import('./firebase');

    expect(mocks.getAuth).toHaveBeenCalledWith({ name: 'mock-app' });
  });

  it('constructs a GoogleAuthProvider instance', async () => {
    await import('./firebase');

    expect(mocks.GoogleAuthProvider).toHaveBeenCalledOnce();
  });
});
