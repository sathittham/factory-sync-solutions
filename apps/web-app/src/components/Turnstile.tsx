import { useCallback, useEffect, useRef } from 'react';

declare global {
  var turnstile:
    | {
        render: (container: HTMLElement, options: TurnstileOptions) => string;
        reset: (widgetId: string) => void;
        remove: (widgetId: string) => void;
      }
    | undefined;
}

interface TurnstileOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
}

interface TurnstileProps {
  readonly siteKey: string;
  readonly onVerify: (token: string) => void;
  readonly onExpire?: () => void;
  readonly onError?: () => void;
  readonly language?: string;
}

export function Turnstile({ siteKey, onVerify, onExpire, onError, language }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !globalThis.turnstile || widgetIdRef.current) return;

    widgetIdRef.current = globalThis.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onError,
      theme: 'light',
      language: language === 'th' ? 'th' : 'en',
    });
  }, [siteKey, onVerify, onExpire, onError, language]);

  useEffect(() => {
    if (globalThis.turnstile) {
      renderWidget();
      return;
    }

    const interval = setInterval(() => {
      if (globalThis.turnstile) {
        clearInterval(interval);
        renderWidget();
      }
    }, 100);

    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && globalThis.turnstile) {
        globalThis.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  return <div ref={containerRef} />;
}
