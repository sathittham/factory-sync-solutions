import { Turnstile } from '@/components/Turnstile';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface CapturedTurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: string;
  language?: string;
}

function mockTurnstileGlobal() {
  const render = vi.fn().mockReturnValue('widget-1');
  const reset = vi.fn();
  const remove = vi.fn();
  globalThis.turnstile = { render, reset, remove };
  return { render, reset, remove };
}

describe('Turnstile', () => {
  beforeEach(() => {
    globalThis.turnstile = undefined;
  });

  afterEach(() => {
    globalThis.turnstile = undefined;
    vi.useRealTimers();
  });

  it('renders a container div', () => {
    const { container } = render(<Turnstile siteKey="site-key" onVerify={vi.fn()} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('renders the widget immediately when window.turnstile is already available', () => {
    const { render: turnstileRender } = mockTurnstileGlobal();
    render(<Turnstile siteKey="site-key-1" onVerify={vi.fn()} />);

    expect(turnstileRender).toHaveBeenCalledOnce();
    const [container, options] = turnstileRender.mock.calls[0] as [
      HTMLElement,
      CapturedTurnstileOptions,
    ];
    expect(container).toBeInstanceOf(HTMLElement);
    expect(options.sitekey).toBe('site-key-1');
    expect(options.theme).toBe('light');
  });

  it('defaults language to "en" when not Thai', () => {
    const { render: turnstileRender } = mockTurnstileGlobal();
    render(<Turnstile siteKey="site-key" onVerify={vi.fn()} language="fr" />);

    const options = turnstileRender.mock.calls[0]?.[1] as CapturedTurnstileOptions;
    expect(options.language).toBe('en');
  });

  it('passes language "th" when language prop is th', () => {
    const { render: turnstileRender } = mockTurnstileGlobal();
    render(<Turnstile siteKey="site-key" onVerify={vi.fn()} language="th" />);

    const options = turnstileRender.mock.calls[0]?.[1] as CapturedTurnstileOptions;
    expect(options.language).toBe('th');
  });

  it('invokes onVerify when the widget callback fires with a token', () => {
    const { render: turnstileRender } = mockTurnstileGlobal();
    const onVerify = vi.fn();
    render(<Turnstile siteKey="site-key" onVerify={onVerify} />);

    const options = turnstileRender.mock.calls[0]?.[1] as CapturedTurnstileOptions;
    options.callback('captcha-token');

    expect(onVerify).toHaveBeenCalledWith('captcha-token');
  });

  it('wires the expired-callback to onExpire', () => {
    const { render: turnstileRender } = mockTurnstileGlobal();
    const onExpire = vi.fn();
    render(<Turnstile siteKey="site-key" onVerify={vi.fn()} onExpire={onExpire} />);

    const options = turnstileRender.mock.calls[0]?.[1] as CapturedTurnstileOptions;
    options['expired-callback']?.();

    expect(onExpire).toHaveBeenCalledOnce();
  });

  it('wires the error-callback to onError', () => {
    const { render: turnstileRender } = mockTurnstileGlobal();
    const onError = vi.fn();
    render(<Turnstile siteKey="site-key" onVerify={vi.fn()} onError={onError} />);

    const options = turnstileRender.mock.calls[0]?.[1] as CapturedTurnstileOptions;
    options['error-callback']?.();

    expect(onError).toHaveBeenCalledOnce();
  });

  it('polls for the turnstile script and renders once it becomes available', () => {
    vi.useFakeTimers();
    render(<Turnstile siteKey="site-key" onVerify={vi.fn()} />);

    // Script hasn't loaded yet — nothing to assert on window.turnstile.render.
    const { render: turnstileRender } = mockTurnstileGlobal();
    expect(turnstileRender).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(turnstileRender).toHaveBeenCalledOnce();
  });

  it('removes the widget on unmount once it has rendered via the poll loop', () => {
    vi.useFakeTimers();
    // turnstile is undefined at mount, so the component falls into the
    // polling branch — only that branch registers a cleanup that calls
    // `remove` (the "already available at mount" branch returns early with
    // no cleanup, per the component's current implementation).
    const { unmount } = render(<Turnstile siteKey="site-key" onVerify={vi.fn()} />);
    const { remove } = mockTurnstileGlobal();

    vi.advanceTimersByTime(100);
    unmount();

    expect(remove).toHaveBeenCalledWith('widget-1');
  });
});
