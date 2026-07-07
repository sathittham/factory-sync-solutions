import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  initializeApp: vi.fn(),
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
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
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('initializes the Firebase app from env-derived config', async () => {
    const fakeApp = { name: 'fake-app' };
    const fakeAuth = { currentUser: null };
    mocks.initializeApp.mockReturnValue(fakeApp);
    mocks.getAuth.mockReturnValue(fakeAuth);

    const mod = await import('./firebase');

    expect(mocks.initializeApp).toHaveBeenCalledOnce();
    const [config] = mocks.initializeApp.mock.calls[0] as [Record<string, unknown>];
    expect(config).toHaveProperty('apiKey');
    expect(config).toHaveProperty('projectId');
    expect(mocks.getAuth).toHaveBeenCalledWith(fakeApp);
    expect(mod.auth).toBe(fakeAuth);
  });

  it('exports a GoogleAuthProvider instance', async () => {
    mocks.initializeApp.mockReturnValue({ name: 'fake-app' });
    mocks.getAuth.mockReturnValue({ currentUser: null });

    const mod = await import('./firebase');

    expect(mocks.GoogleAuthProvider).toHaveBeenCalledOnce();
    expect(mod.googleProvider).toBeInstanceOf(mocks.GoogleAuthProvider);
  });
});
