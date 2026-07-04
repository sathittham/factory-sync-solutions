import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openCmsBlog } from './cmsSso';

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: mocks.getIdToken } },
}));

describe('openCmsBlog', () => {
  let windowOpenMock: ReturnType<typeof vi.fn>;
  let mockTarget: { close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTarget = { close: vi.fn() };
    windowOpenMock = vi.fn().mockReturnValue(mockTarget);
    vi.stubGlobal('open', windowOpenMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('opens a named blank tab synchronously before awaiting the token', async () => {
    mocks.getIdToken.mockResolvedValue('id-token-123');
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});

    await openCmsBlog('https://cms.example.com/sso/handover');

    expect(windowOpenMock).toHaveBeenCalledWith('about:blank', 'fs-cms-blog');
  });

  it('closes the tab and submits no form when there is no signed-in user token', async () => {
    mocks.getIdToken.mockResolvedValue(undefined);
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});

    await openCmsBlog('https://cms.example.com/sso/handover');

    expect(mockTarget.close).toHaveBeenCalledOnce();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('builds and submits a hidden form carrying the token to the handover URL', async () => {
    mocks.getIdToken.mockResolvedValue('id-token-123');
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');

    await openCmsBlog('https://cms.example.com/sso/handover');

    expect(appendChildSpy).toHaveBeenCalledOnce();
    const capturedForm = appendChildSpy.mock.calls[0][0] as HTMLFormElement;

    expect(capturedForm.method).toBe('post');
    expect(capturedForm.action).toBe('https://cms.example.com/sso/handover');
    expect(capturedForm.target).toBe('fs-cms-blog');

    const input = capturedForm.querySelector<HTMLInputElement>('input[name="token"]');
    expect(input?.type).toBe('hidden');
    expect(input?.value).toBe('id-token-123');

    expect(submitSpy).toHaveBeenCalledOnce();
    // The form is removed from the DOM immediately after submit.
    expect(document.body.querySelector('form')).toBeNull();
  });

  it('closes the tab when fetching the token throws', async () => {
    mocks.getIdToken.mockRejectedValue(new Error('token fetch failed'));
    const submitSpy = vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {});

    await openCmsBlog('https://cms.example.com/sso/handover');

    expect(mockTarget.close).toHaveBeenCalledOnce();
    expect(submitSpy).not.toHaveBeenCalled();
  });
});
