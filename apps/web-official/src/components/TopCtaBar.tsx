"use client";

import { LocaleProvider, useLocale } from "@/lib/i18n";
import { useState } from "react";

const DISMISSED_KEY = "fss-topbar-dismissed";

const lineIcon = (
	<svg
		width="14"
		height="14"
		viewBox="0 0 24 24"
		fill="currentColor"
		className="shrink-0"
		aria-hidden="true"
		focusable="false"
	>
		<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
	</svg>
);

function readDismissed(): boolean {
	try {
		return localStorage.getItem(DISMISSED_KEY) === "true";
	} catch {
		return false;
	}
}

function TopCtaBarInner() {
	const { t } = useLocale();
	const [dismissed, setDismissed] = useState(readDismissed);

	if (dismissed) return null;

	const handleDismiss = () => {
		setDismissed(true);
		try {
			localStorage.setItem(DISMISSED_KEY, "true");
		} catch {
			// ignore
		}
	};

	return (
		<div className="relative flex min-h-8 shrink-0 items-center justify-center bg-primary px-10 text-center text-xs text-primary-foreground md:h-8">
			<a
				href="https://lin.ee/rWwdF9q"
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-1.5 hover:underline"
			>
				{t("topbar.cta")}
				{lineIcon}
			</a>
			<button
				type="button"
				onClick={handleDismiss}
				aria-label={t("common.close")}
				className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
			>
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	);
}

export function TopCtaBar() {
	return (
		<LocaleProvider>
			<TopCtaBarInner />
		</LocaleProvider>
	);
}
