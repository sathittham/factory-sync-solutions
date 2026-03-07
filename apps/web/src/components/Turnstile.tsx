import { useEffect, useRef, useCallback } from "react";

declare global {
	interface Window {
		turnstile?: {
			render: (container: HTMLElement, options: TurnstileOptions) => string;
			reset: (widgetId: string) => void;
			remove: (widgetId: string) => void;
		};
	}
}

interface TurnstileOptions {
	sitekey: string;
	callback: (token: string) => void;
	"expired-callback"?: () => void;
	"error-callback"?: () => void;
	theme?: "light" | "dark" | "auto";
	language?: string;
}

interface TurnstileProps {
	readonly siteKey: string;
	readonly onVerify: (token: string) => void;
	readonly onExpire?: () => void;
	readonly language?: string;
}

export function Turnstile({ siteKey, onVerify, onExpire, language }: TurnstileProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);

	const renderWidget = useCallback(() => {
		if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;

		widgetIdRef.current = window.turnstile.render(containerRef.current, {
			sitekey: siteKey,
			callback: onVerify,
			"expired-callback": onExpire,
			"error-callback": onExpire,
			theme: "light",
			language: language === "th" ? "th" : "en",
		});
	}, [siteKey, onVerify, onExpire, language]);

	useEffect(() => {
		// If turnstile script is already loaded, render immediately
		if (window.turnstile) {
			renderWidget();
			return;
		}

		// Otherwise wait for it to load
		const interval = setInterval(() => {
			if (window.turnstile) {
				clearInterval(interval);
				renderWidget();
			}
		}, 100);

		return () => {
			clearInterval(interval);
			if (widgetIdRef.current && window.turnstile) {
				window.turnstile.remove(widgetIdRef.current);
				widgetIdRef.current = null;
			}
		};
	}, [renderWidget]);

	return <div ref={containerRef} />;
}
