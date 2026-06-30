"use client";

import { Button } from "@/components/ui/button";
import { updateConsentMode } from "@/lib/consent";
import { LocaleProvider, useLocale } from "@/lib/i18n";
import { useEffect, useState } from "react";

export const CONSENT_KEY = "fss-cookie-consent";
const MARKETING_KEY = "fss-marketing-consent";
const ANALYTICS_KEY = "fss-analytics-consent";

// Custom event the footer "Cookie Settings" link can dispatch to reopen the panel.
export const OPEN_SETTINGS_EVENT = "fss:open-cookie-settings";

function getStored(key: string, fallback: boolean): boolean {
	try {
		const v = localStorage.getItem(key);
		if (v === "true") return true;
		if (v === "false") return false;
	} catch {
		/* ignore */
	}
	return fallback;
}

function hasConsent(): boolean {
	try {
		return !!localStorage.getItem(CONSENT_KEY);
	} catch {
		return false;
	}
}

function saveConsent(analytics: boolean, marketing: boolean) {
	const consent = analytics || marketing ? "partial" : "essential";
	try {
		localStorage.setItem(CONSENT_KEY, analytics && marketing ? "all" : consent);
		localStorage.setItem(ANALYTICS_KEY, String(analytics));
		localStorage.setItem(MARKETING_KEY, String(marketing));
	} catch {
		/* ignore */
	}
}

// --- Toggle Switch ---

function Toggle({
	checked,
	onChange,
}: { readonly checked: boolean; readonly onChange: () => void }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={onChange}
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
				checked ? "bg-primary" : "bg-muted"
			}`}
		>
			<span
				className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
					checked ? "translate-x-6" : "translate-x-1"
				}`}
			/>
		</button>
	);
}

// --- Category Row ---

function CategoryRow({
	title,
	description,
	detailLabel,
	control,
}: {
	readonly title: string;
	readonly description: string;
	readonly detailLabel: string;
	readonly control: React.ReactNode;
}) {
	return (
		<div className="px-6 py-4">
			<div className="mb-2 flex items-center justify-between">
				<h3 className="text-sm font-semibold">{title}</h3>
				{control}
			</div>
			<p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
			<a
				href="/cookies"
				className="mt-1.5 inline-block text-xs font-medium text-primary hover:underline"
			>
				{detailLabel}
			</a>
		</div>
	);
}

// --- Banner ---

function CookieBanner({
	onSettings,
	onAcceptAll,
}: {
	readonly onSettings: () => void;
	readonly onAcceptAll: () => void;
}) {
	const { t } = useLocale();

	return (
		<div className="animate-fade-up fixed bottom-0 left-0 right-0 z-50 p-4">
			<div className="container mx-auto max-w-3xl">
				<div className="space-y-3 rounded-lg border bg-card p-4 shadow-lg sm:p-5">
					<p className="text-sm font-semibold">{t("cookie.banner.title")}</p>
					<p className="text-sm leading-relaxed text-muted-foreground">
						{t("cookie.banner.description")}{" "}
						<a href="/privacy" className="font-medium text-primary hover:underline">
							{t("footer.privacy")}
						</a>
					</p>
					<div className="flex items-center justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={onSettings}
							className="text-xs"
							data-testid="cookie-settings-btn"
						>
							{t("cookie.banner.settings")}
						</Button>
						<Button
							size="sm"
							onClick={onAcceptAll}
							className="text-xs"
							data-testid="cookie-accept-all-btn"
						>
							{t("cookie.banner.acceptAll")}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

// --- Modal shell (no shadcn Dialog on the official site) ---

function Modal({
	onClose,
	children,
}: { readonly onClose: () => void; readonly children: React.ReactNode }) {
	const { t } = useLocale();

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label={t("common.close")}
				tabIndex={-1}
				onClick={onClose}
				className="absolute inset-0 bg-black/50"
			/>
			{/* biome-ignore lint/a11y/useSemanticElements: native <dialog> is disallowed by project UI rules */}
			<div // NOSONAR S6819 — native <dialog> disallowed by project shadcn/ui rules; dialog.tsx not installed in this app
				role="dialog"
				aria-modal="true"
				className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-card text-card-foreground shadow-lg"
			>
				{children}
			</div>
		</div>
	);
}

// --- Settings Panel ---

function CookieSettings({
	analytics,
	marketing,
	onAnalyticsChange,
	onMarketingChange,
	onAcceptAll,
	onConfirm,
}: {
	readonly analytics: boolean;
	readonly marketing: boolean;
	readonly onAnalyticsChange: () => void;
	readonly onMarketingChange: () => void;
	readonly onAcceptAll: () => void;
	readonly onConfirm: () => void;
}) {
	const { t } = useLocale();

	return (
		<>
			<div className="flex items-center justify-between px-6 pb-4 pt-6">
				<h2 className="text-lg font-semibold">{t("cookie.settings.title")}</h2>
				<Button size="sm" onClick={onAcceptAll} className="text-xs">
					{t("cookie.banner.acceptAll")}
				</Button>
			</div>

			<div className="divide-y">
				<CategoryRow
					title={t("cookie.settings.essential.title")}
					description={t("cookie.settings.essential.description")}
					detailLabel={t("cookie.link")}
					control={
						<span className="text-xs font-medium text-primary">{t("cookie.settings.always")}</span>
					}
				/>
				<CategoryRow
					title={t("cookie.settings.analytics.title")}
					description={t("cookie.settings.analytics.description")}
					detailLabel={t("cookie.link")}
					control={<Toggle checked={analytics} onChange={onAnalyticsChange} />}
				/>
				<CategoryRow
					title={t("cookie.settings.marketing.title")}
					description={t("cookie.settings.marketing.description")}
					detailLabel={t("cookie.link")}
					control={<Toggle checked={marketing} onChange={onMarketingChange} />}
				/>
			</div>

			<div className="border-t px-6 py-4">
				<Button onClick={onConfirm} className="w-full" data-testid="cookie-confirm-btn">
					{t("cookie.settings.confirm")}
				</Button>
			</div>
		</>
	);
}

// --- Inner (consumes locale) ---

function CookieConsentInner() {
	const [open, setOpen] = useState(false);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [analytics, setAnalytics] = useState(() => getStored(ANALYTICS_KEY, false));
	const [marketing, setMarketing] = useState(() => getStored(MARKETING_KEY, false));

	// Decide visibility after mount to avoid SSR/localStorage mismatches.
	useEffect(() => {
		if (!hasConsent()) setOpen(true);
	}, []);

	// Allow the footer "Cookie Settings" link to reopen the panel.
	useEffect(() => {
		const handler = () => {
			setAnalytics(getStored(ANALYTICS_KEY, false));
			setMarketing(getStored(MARKETING_KEY, false));
			setSettingsOpen(true);
		};
		globalThis.addEventListener(OPEN_SETTINGS_EVENT, handler);
		return () => globalThis.removeEventListener(OPEN_SETTINGS_EVENT, handler);
	}, []);

	const handleAcceptAll = () => {
		setAnalytics(true);
		setMarketing(true);
		saveConsent(true, true);
		updateConsentMode(true, true);
		setSettingsOpen(false);
		setOpen(false);
	};

	const handleConfirm = () => {
		saveConsent(analytics, marketing);
		updateConsentMode(analytics, marketing);
		setSettingsOpen(false);
		setOpen(false);
	};

	if (settingsOpen) {
		return (
			<Modal onClose={() => setSettingsOpen(false)}>
				<CookieSettings
					analytics={analytics}
					marketing={marketing}
					onAnalyticsChange={() => setAnalytics((v) => !v)}
					onMarketingChange={() => setMarketing((v) => !v)}
					onAcceptAll={handleAcceptAll}
					onConfirm={handleConfirm}
				/>
			</Modal>
		);
	}

	if (!open) return null;

	return <CookieBanner onSettings={() => setSettingsOpen(true)} onAcceptAll={handleAcceptAll} />;
}

// --- Root (self-contained island) ---

export function CookieConsent() {
	return (
		<LocaleProvider>
			<CookieConsentInner />
		</LocaleProvider>
	);
}
