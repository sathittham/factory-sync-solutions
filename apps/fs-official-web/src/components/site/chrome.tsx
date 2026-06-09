"use client";

import { type Locale, useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import fsDarkLogo from "@shared/brand/fs-dark.png";
import fsLightLogo from "@shared/brand/fs-light.png";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Theme — shared between the landing page and legal pages
// ---------------------------------------------------------------------------

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

function getSystemTheme(): ResolvedTheme {
	try {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
	} catch {
		return "light";
	}
}

function getInitialTheme(): Theme {
	try {
		const stored = localStorage.getItem("fss-theme");
		if (stored === "dark" || stored === "light" || stored === "system") return stored;
	} catch {
		// ignore SSR / private-mode errors
	}
	return "system";
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(getInitialTheme);
	const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
		getInitialTheme() === "system" ? getSystemTheme() : (getInitialTheme() as ResolvedTheme)
	);

	const setTheme = useCallback((t: Theme) => {
		setThemeState(t);
		try {
			localStorage.setItem("fss-theme", t);
		} catch {}
	}, []);

	useEffect(() => {
		const applyTheme = () => {
			const next = theme === "system" ? getSystemTheme() : theme;
			setResolvedTheme(next);
			document.documentElement.classList.toggle("dark", next === "dark");
		};

		applyTheme();

		if (theme !== "system") return;

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		media.addEventListener("change", applyTheme);
		return () => media.removeEventListener("change", applyTheme);
	}, [theme]);

	return { theme, resolvedTheme, setTheme };
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

export function LogoIcon({ theme = "dark" }: { theme?: "dark" | "light" }) {
	const logo = theme === "dark" ? fsDarkLogo : fsLightLogo;

	return (
		<img
			src={logo.src}
			alt=""
			aria-hidden="true"
			className="h-11 w-11 shrink-0 rounded-md object-cover"
			loading="eager"
		/>
	);
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function SunIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="4" />
			<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
		</svg>
	);
}

function MoonIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
		</svg>
	);
}

function SystemIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="3" y="4" width="18" height="12" rx="2" />
			<path d="M8 20h8M12 16v4" />
		</svg>
	);
}

function ChevronDownIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	);
}

function GlobeIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<path d="M2 12h20" />
			<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
		</svg>
	);
}

// ---------------------------------------------------------------------------
// ThemeSwitcher
// ---------------------------------------------------------------------------

const THEME_OPTIONS: Array<{ value: Theme; labelKey: string; icon: React.ReactNode }> = [
	{ value: "light", labelKey: "theme.light", icon: <SunIcon /> },
	{ value: "dark", labelKey: "theme.dark", icon: <MoonIcon /> },
	{ value: "system", labelKey: "theme.system", icon: <SystemIcon /> },
];

export function ThemeSwitcher({
	theme,
	setTheme,
	className,
}: {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	className?: string;
}) {
	const { t } = useLocale();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	const current = THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[2];

	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
		};
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKey);
		};
	}, [open]);

	const handleSelect = (value: Theme) => {
		setTheme(value);
		setOpen(false);
	};

	return (
		<div ref={ref} className={cn("relative", className)}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-label={t("theme.label")}
				aria-haspopup="menu"
				aria-expanded={open}
				title={t(current.labelKey)}
				className="flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-slate-700 outline-hidden transition-colors hover:border-slate-400 hover:text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-cyan-300/25 dark:bg-[#071b33] dark:text-white dark:hover:border-cyan-300/50 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/25"
			>
				{current.icon}
				<ChevronDownIcon />
			</button>
			{open && (
				<div
					role="menu"
					className="absolute right-0 z-50 mt-2 min-w-34 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-cyan-300/20 dark:bg-[#071b33]"
				>
					{THEME_OPTIONS.map((option) => (
						<button
							key={option.value}
							type="button"
							role="menuitemradio"
							aria-checked={theme === option.value}
							onClick={() => handleSelect(option.value)}
							className={cn(
								"flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10",
								theme === option.value && "text-blue-600 dark:text-cyan-300"
							)}
						>
							<span className="flex h-4 w-4 shrink-0 items-center justify-center">
								{option.icon}
							</span>
							{t(option.labelKey)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// LocaleSwitcher
// ---------------------------------------------------------------------------

const LOCALE_OPTIONS: Array<{ value: Locale; code: string; label: string }> = [
	{ value: "th", code: "TH", label: "ไทย" },
	{ value: "en", code: "EN", label: "English" },
];

export function LocaleSwitcher({ className }: { className?: string }) {
	const { locale, setLocale, t } = useLocale();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	const current = LOCALE_OPTIONS.find((option) => option.value === locale) ?? LOCALE_OPTIONS[0];

	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
		};
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleKey);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleKey);
		};
	}, [open]);

	const handleSelect = (value: Locale) => {
		setLocale(value);
		setOpen(false);
	};

	return (
		<div ref={ref} className={cn("relative", className)}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-label={t("locale.label")}
				aria-haspopup="menu"
				aria-expanded={open}
				className="flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-hidden transition-colors hover:border-slate-400 hover:text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-cyan-300/25 dark:bg-[#071b33] dark:text-white dark:hover:border-cyan-300/50 dark:focus:border-cyan-300 dark:focus:ring-cyan-300/25"
			>
				<GlobeIcon />
				{current.code}
				<ChevronDownIcon />
			</button>
			{open && (
				<div
					role="menu"
					className="absolute right-0 z-50 mt-2 min-w-34 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-cyan-300/20 dark:bg-[#071b33]"
				>
					{LOCALE_OPTIONS.map((option) => (
						<button
							key={option.value}
							type="button"
							role="menuitemradio"
							aria-checked={locale === option.value}
							onClick={() => handleSelect(option.value)}
							className={cn(
								"flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10",
								locale === option.value && "text-blue-600 dark:text-cyan-300"
							)}
						>
							<span className="flex h-4 w-7 shrink-0 items-center justify-center text-xs font-bold">
								{option.code}
							</span>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// SiteFooter — shared footer used across the site
// ---------------------------------------------------------------------------

const FOOTER_SEP = <span className="text-slate-300 dark:text-slate-600">|</span>;

export function SiteFooter({
	version,
	resolvedTheme,
}: {
	version: string;
	resolvedTheme: ResolvedTheme;
}) {
	const { t } = useLocale();
	const year = new Date().getFullYear();

	const legalLinks = [
		{ href: "/privacy", label: t("footer.privacy") },
		{ href: "/terms", label: t("footer.terms") },
		{ href: "/cookies", label: t("footer.cookiePolicy") },
		{ href: "/marketing", label: t("footer.marketing") },
		{ href: "/cookie-settings", label: t("footer.cookies") },
	];

	return (
		<footer className="border-t border-slate-200 bg-white py-6 text-slate-500 dark:border-cyan-300/15 dark:bg-[#041225] dark:text-slate-400">
			<div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-3">
					<LogoIcon theme={resolvedTheme} />
					<div>
						<p className="text-sm font-semibold text-slate-900 dark:text-white">
							FactorySync Solutions Co., Ltd.
						</p>
						<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("footer.desc")}</p>
					</div>
				</div>

				<div className="flex flex-col gap-2 text-xs md:items-end">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:justify-end">
						{legalLinks.map((link, index) => (
							<Fragment key={link.href}>
								<a
									href={link.href}
									className="transition-colors hover:text-blue-700 dark:hover:text-cyan-300"
								>
									{link.label}
								</a>
								{index < legalLinks.length - 1 && FOOTER_SEP}
							</Fragment>
						))}
					</div>
					<p className="text-slate-400 dark:text-slate-500">
						© {year} {t("footer.copyright")}
						<span className="ml-2 font-mono text-[10px] opacity-60">{version}</span>
					</p>
				</div>
			</div>
		</footer>
	);
}
