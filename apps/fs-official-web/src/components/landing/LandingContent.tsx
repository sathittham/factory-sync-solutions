"use client";

import { FadeIn, StaggerChildren, StaggerItem } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import heroBackground from "@/fs-bg.png";
import { type Locale, LocaleProvider, useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import fsDarkLogo from "../../../fs-dark.png";
import fsLightLogo from "../../../fs-light.png";

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

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

function useTheme() {
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
// SVG icons
// ---------------------------------------------------------------------------

function LogoIcon({ theme = "dark" }: { theme?: "dark" | "light" }) {
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

function MenuIcon() {
	return (
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<line x1="3" y1="6" x2="21" y2="6" />
			<line x1="3" y1="12" x2="21" y2="12" />
			<line x1="3" y1="18" x2="21" y2="18" />
		</svg>
	);
}

function CloseIcon() {
	return (
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</svg>
	);
}

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

const THEME_OPTIONS: Array<{ value: Theme; labelKey: string; icon: React.ReactNode }> = [
	{ value: "light", labelKey: "theme.light", icon: <SunIcon /> },
	{ value: "dark", labelKey: "theme.dark", icon: <MoonIcon /> },
	{ value: "system", labelKey: "theme.system", icon: <SystemIcon /> },
];

function ThemeSwitcher({
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

const LOCALE_OPTIONS: Array<{ value: Locale; code: string; label: string }> = [
	{ value: "th", code: "TH", label: "ไทย" },
	{ value: "en", code: "EN", label: "English" },
];

function LocaleSwitcher({ className }: { className?: string }) {
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

function CheckIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="shrink-0"
			aria-hidden="true"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

function LineIcon({ size = 20 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.105.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
		</svg>
	);
}

function EmailIcon({ size = 20 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="2" y="4" width="20" height="16" rx="2" />
			<path d="M2 7l10 7 10-7" />
		</svg>
	);
}

function PhoneIcon({ size = 20 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.23h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
		</svg>
	);
}

function ClockIcon({ size = 20 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
	);
}

function ArrowLeftIcon() {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<polyline points="15 18 9 12 15 6" />
		</svg>
	);
}

function ArrowRightIcon() {
	return (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<polyline points="9 18 15 12 9 6" />
		</svg>
	);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HERO_IMG = heroBackground.src;

const NAV_LINKS = [
	{ key: "nav.home", href: "#hero" },
	{ key: "nav.healthCheck", href: "#dimensions" },
	{ key: "nav.engineering", href: "#expert" },
	{ key: "nav.peace", href: "#services" },
	{ key: "nav.cases", href: "#results" },
	{ key: "nav.blog", href: "#process" },
	{ key: "nav.about", href: "#about" },
	{ key: "nav.contact", href: "#contact" },
];

interface DimensionCard {
	number: string;
	labelKey: string;
	icon: React.ReactNode;
}

const DIMENSIONS: DimensionCard[] = [
	{
		number: "01",
		labelKey: "landing.dim.basic",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
			</svg>
		),
	},
	{
		number: "02",
		labelKey: "landing.dim.improvement",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
			</svg>
		),
	},
	{
		number: "03",
		labelKey: "landing.dim.coordination",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
				<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			</svg>
		),
	},
	{
		number: "04",
		labelKey: "landing.dim.maintenance",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
			</svg>
		),
	},
	{
		number: "05",
		labelKey: "landing.dim.quality",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
				<polyline points="22 4 12 14.01 9 11.01" />
			</svg>
		),
	},
	{
		number: "06",
		labelKey: "landing.dim.production",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
				<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
			</svg>
		),
	},
	{
		number: "07",
		labelKey: "landing.dim.material",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<rect x="1" y="3" width="15" height="13" rx="1" />
				<path d="M16 8h4l3 3v5h-7V8z" />
				<circle cx="5.5" cy="18.5" r="2.5" />
				<circle cx="18.5" cy="18.5" r="2.5" />
			</svg>
		),
	},
	{
		number: "08",
		labelKey: "landing.dim.cost",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<line x1="12" y1="1" x2="12" y2="23" />
				<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
			</svg>
		),
	},
];

interface Service {
	img: string;
	titleKey: string;
	descKey: string;
	icon: React.ReactNode;
}

const SERVICES: Service[] = [
	{
		img: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600&q=80&auto=format&fit=crop",
		titleKey: "service.healthCheck.title",
		descKey: "service.healthCheck.desc",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
				<polyline points="22 4 12 14.01 9 11.01" />
			</svg>
		),
	},
	{
		img: "https://images.unsplash.com/photo-1565043666747-69f6646db940?w=600&q=80&auto=format&fit=crop",
		titleKey: "service.production.title",
		descKey: "service.production.desc",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<rect x="2" y="7" width="20" height="14" rx="2" />
				<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
			</svg>
		),
	},
	{
		img: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&q=80&auto=format&fit=crop",
		titleKey: "service.consulting.title",
		descKey: "service.consulting.desc",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
			</svg>
		),
	},
	{
		img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80&auto=format&fit=crop",
		titleKey: "service.digital.title",
		descKey: "service.digital.desc",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<rect x="2" y="3" width="20" height="14" rx="2" />
				<polyline points="8 21 12 17 16 21" />
			</svg>
		),
	},
];

// Services content is hardcoded (TH/EN) because they are structural compound items
// kept close to the component rather than i18n keys for legibility of long descriptions
const SERVICES_CONTENT = {
	th: [
		{
			title: "ตรวจสุขภาพโรงงาน",
			desc: "ประเมินความพร้อม 8 มิติ โดยทีมวิศวกรผู้เชี่ยวชาญ พร้อมรายงานและแผนปรับปรุง",
			link: "ดูรายละเอียด →",
		},
		{
			title: "ตรวจประเมินระบบการผลิต",
			desc: "ตรวจสอบระบบการผลิต เครื่องจักร และกระบวนการ เพื่อเพิ่มประสิทธิภาพ",
			link: "ดูรายละเอียด →",
		},
		{
			title: "ที่ปรึกษาปรับปรุงประสิทธิภาพ",
			desc: "วิเคราะห์ปัญหา กำหนดแนวทาง และดำเนินการปรับปรุง ให้ผลลัพธ์ที่วัดได้",
			link: "ดูรายละเอียด →",
		},
		{
			title: "Digital Factory & Smart Dashboard",
			desc: "ระบบติดตาม KPI แบบออนไลน์ เชื่อมต่อข้อมูล วิเคราะห์ด้วย AI",
			link: "ดูรายละเอียด →",
		},
	],
	en: [
		{
			title: "Factory Health Check",
			desc: "8-dimension readiness assessment by specialist engineers, with report and improvement plan.",
			link: "View Details →",
		},
		{
			title: "Production System Assessment",
			desc: "Inspect production systems, machinery, and processes to improve efficiency.",
			link: "View Details →",
		},
		{
			title: "Efficiency Improvement Consulting",
			desc: "Analyze problems, define approaches, and drive measurable improvements.",
			link: "View Details →",
		},
		{
			title: "Digital Factory & Smart Dashboard",
			desc: "Online KPI tracking system, data integration, and AI-powered analytics.",
			link: "View Details →",
		},
	],
};

const PROCESS_STEPS = {
	th: [
		{
			number: "01",
			label: "ลงทะเบียน",
			detail: "กรอกข้อมูลโรงงานเพื่อเริ่มประเมิน",
		},
		{
			number: "02",
			label: "ทำแบบประเมิน",
			detail: "ตอบ 43 ข้อ ใช้เวลาประมาณ 15 นาที",
		},
		{
			number: "03",
			label: "วิเคราะห์โดย AI + ผู้เชี่ยวชาญ",
			detail: "AI วิเคราะห์ข้อมูล ตรวจสอบโดยวุฒิวิศวกร",
		},
		{
			number: "04",
			label: "รับรายงานและแผนปรับปรุง",
			detail: "รายงานเชิงลึก พร้อมแผนที่ปฏิบัติได้จริง",
		},
	],
	en: [
		{
			number: "01",
			label: "Register",
			detail: "Fill in factory details to begin the assessment",
		},
		{
			number: "02",
			label: "Take Assessment",
			detail: "Answer 43 questions in approximately 15 minutes",
		},
		{
			number: "03",
			label: "AI + Expert Analysis",
			detail: "AI analyses data, reviewed by a licensed engineer",
		},
		{
			number: "04",
			label: "Receive Report & Action Plan",
			detail: "In-depth report with a practical improvement roadmap",
		},
	],
};

const RESULTS_CARDS = {
	th: [
		{
			badge: "A",
			industry: "AUTOPARTS",
			metric: "-28%",
			metricColor: "text-red-400",
			desc: "ลดของเสีย",
			timeframe: "ภายใน 6 เดือน",
		},
		{
			badge: "B",
			industry: "BEVERAGE",
			metric: "+22%",
			metricColor: "text-green-400",
			desc: "เพิ่มผลภาพ",
			timeframe: "ภายใน 5 เดือน",
		},
		{
			badge: "E",
			industry: "ELECTRONICS",
			metric: "-35%",
			metricColor: "text-red-400",
			desc: "ลดเวลาหยุดเครื่อง",
			timeframe: "ภายใน 4 เดือน",
		},
		{
			badge: "P",
			industry: "PACKAGING",
			metric: "+18%",
			metricColor: "text-green-400",
			desc: "ปรับปรุงการส่งมอบ",
			timeframe: "ภายใน 3 เดือน",
		},
	],
	en: [
		{
			badge: "A",
			industry: "AUTOPARTS",
			metric: "-28%",
			metricColor: "text-red-400",
			desc: "Defect reduction",
			timeframe: "within 6 months",
		},
		{
			badge: "B",
			industry: "BEVERAGE",
			metric: "+22%",
			metricColor: "text-green-400",
			desc: "Productivity gain",
			timeframe: "within 5 months",
		},
		{
			badge: "E",
			industry: "ELECTRONICS",
			metric: "-35%",
			metricColor: "text-red-400",
			desc: "Downtime reduction",
			timeframe: "within 4 months",
		},
		{
			badge: "P",
			industry: "PACKAGING",
			metric: "+18%",
			metricColor: "text-green-400",
			desc: "Delivery improvement",
			timeframe: "within 3 months",
		},
	],
};

const EXPERT_BULLETS = {
	th: [
		"Factory Health Check – ตรวจสุขภาพโรงงาน ครบ 8 มิติ",
		"Engineering Review – ตรวจประเมินระบบและกระบวนการโดยวิศวกร",
		"Improvement Roadmap – แผนปรับปรุงเชิงลึก เป็นแผนที่ทำได้จริง",
		"Digital Factory & Dashboard – แดชบอร์ดข้อมูลออนไลน์ ติดตาม KPI",
		"AI / IoT Integration – เชื่อมต่อข้อมูล วิเคราะห์ด้วย AI และ IoT",
	],
	en: [
		"Factory Health Check – Full 8-dimension factory health assessment",
		"Engineering Review – System and process assessment by engineers",
		"Improvement Roadmap – Deep improvement plan with actionable steps",
		"Digital Factory & Dashboard – Online KPI dashboard and data tracking",
		"AI / IoT Integration – Data connectivity, AI and IoT analytics",
	],
};

const TRUST_ICONS = [
	// trophy with laurel wreath
	<svg
		key="trophy"
		width="30"
		height="30"
		viewBox="0 0 24 24"
		fill="currentColor"
		className="text-blue-500 dark:text-cyan-300"
		aria-hidden="true"
	>
		{/* trophy */}
		<path d="M17 4V2.8c0-.44-.36-.8-.8-.8H7.8c-.44 0-.8.36-.8.8V4H3.8c-.44 0-.8.36-.8.8V7a4 4 0 0 0 4 4h.36A5 5 0 0 0 11 13.9V16H8.6a.8.8 0 0 0 0 1.6h6.8a.8.8 0 0 0 0-1.6H13v-2.1A5 5 0 0 0 16.64 11H17a4 4 0 0 0 4-4V4.8c0-.44-.36-.8-.8-.8H17zM7 9.2A2.2 2.2 0 0 1 4.8 7v-1.2H7V9.2zm12-2.2A2.2 2.2 0 0 1 16.8 9.2V5.8H19V7z" />
		{/* base */}
		<path d="M9 18.4h6c.44 0 .8.36.8.8V21a.8.8 0 0 1-.8.8H9a.8.8 0 0 1-.8-.8v-1.8c0-.44.36-.8.8-.8z" />
		{/* laurel left */}
		<path
			d="M4.1 13.3c-.7 1.2-.9 2.7-.5 4.1 1-.4 1.8-1.2 2.2-2.2-.8-.1-1.5-.7-1.7-1.5.7.3 1.5.1 2-.4-.7-.3-1.2-1-1.2-1.8.6.4 1.4.4 2 0-.6-.4-1-1.1-.9-1.9-1 .5-1.7 1.5-1.9 2.6"
			opacity=".85"
		/>
		{/* laurel right */}
		<path
			d="M19.9 13.3c.7 1.2.9 2.7.5 4.1-1-.4-1.8-1.2-2.2-2.2.8-.1 1.5-.7 1.7-1.5-.7.3-1.5.1-2-.4.7-.3 1.2-1 1.2-1.8-.6.4-1.4.4-2 0 .6-.4 1-1.1.9-1.9 1 .5 1.7 1.5 1.9 2.6"
			opacity=".85"
		/>
	</svg>,
	// factory (filled, windows cut out)
	<svg
		key="factory"
		width="30"
		height="30"
		viewBox="0 0 24 24"
		fill="currentColor"
		fillRule="evenodd"
		clipRule="evenodd"
		className="text-blue-500 dark:text-cyan-300"
		aria-hidden="true"
	>
		{/* chimney */}
		<path d="M4 4h2v6H4z" />
		{/* body + roof with window cutouts */}
		<path d="M2 21V9l6 3.6V9l6 3.6V9l8 4.4V21H2zM6 18.6h2.2v-3H6v3zm5 0h2.2v-3H11v3zm5 0h2.2v-3H16v3z" />
	</svg>,
	// star medal
	<svg
		key="star"
		width="30"
		height="30"
		viewBox="0 0 24 24"
		fill="currentColor"
		fillRule="evenodd"
		clipRule="evenodd"
		className="text-blue-500 dark:text-cyan-300"
		aria-hidden="true"
	>
		{/* outer medal circle with star hole */}
		<path d="M12 1.5A9.5 9.5 0 1 0 12 20.5 9.5 9.5 0 0 0 12 1.5zm0 4.3 1.9 3.85 4.25.62-3.07 3 .72 4.23L12 15.5l-3.8 2-.73-4.23-3.07-3 4.25-.62L12 5.8z" />
		{/* ribbon tails */}
		<path
			d="M8.4 18.6 6.5 22.5l-1.3-2.1-2.5.2 1.6-3.3a9.6 9.6 0 0 0 4.1 1.3zm7.2 0a9.6 9.6 0 0 0 4.1-1.3l1.6 3.3-2.5-.2-1.3 2.1-1.9-3.9z"
			opacity=".85"
		/>
	</svg>,
	// shield with check
	<svg
		key="shield"
		width="30"
		height="30"
		viewBox="0 0 24 24"
		fill="currentColor"
		fillRule="evenodd"
		clipRule="evenodd"
		className="text-blue-500 dark:text-cyan-300"
		aria-hidden="true"
	>
		<path d="M12 1.7 20 4.8v6.2c0 5.1-3.4 8.9-8 10.5-4.6-1.6-8-5.4-8-10.5V4.8l8-3.1zm4.2 6.6-1.5-1.4-4.4 4.5-1.9-1.9-1.5 1.5 3.4 3.4 5.9-6.1z" />
	</svg>,
];

// ---------------------------------------------------------------------------
// Radar Chart (pure SVG, no external library)
// ---------------------------------------------------------------------------

function RadarChart() {
	const { locale } = useLocale();
	const cx = 110;
	const cy = 110;
	const maxR = 80;
	const rings = [0.25, 0.5, 0.75, 1.0];
	const angles = [-90, -45, 0, 45, 90, 135, 180, 225].map((deg) => (deg * Math.PI) / 180);
	const factoryValues = [0.85, 0.7, 0.6, 0.75, 0.9, 0.65, 0.8, 0.7];
	const benchmarkValues = [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7];
	const axisLabels =
		locale === "th"
			? ["ง.เบื้องต้น", "ปรับปรุง", "ประสานงาน", "บำรุงรักษา", "คุณภาพ", "การผลิต", "วัสดุ", "ต้นทุน"]
			: [
					"Basic",
					"Improve",
					"Coordination",
					"Maintenance",
					"Quality",
					"Production",
					"Materials",
					"Cost",
				];

	function toXY(angle: number, r: number) {
		return {
			x: cx + r * Math.cos(angle),
			y: cy + r * Math.sin(angle),
		};
	}

	function polygonPoints(values: number[]) {
		return values
			.map((v, i) => {
				const pt = toXY(angles[i], v * maxR);
				return `${pt.x},${pt.y}`;
			})
			.join(" ");
	}

	return (
		<svg
			viewBox="0 0 220 220"
			width="180"
			height="180"
			aria-label="Radar chart showing factory assessment scores"
			role="img"
		>
			{/* Rings */}
			{rings.map((r) => (
				<polygon
					key={r}
					points={angles
						.map((a) => {
							const pt = toXY(a, r * maxR);
							return `${pt.x},${pt.y}`;
						})
						.join(" ")}
					fill="none"
					stroke="rgba(148,163,184,0.25)"
					strokeWidth="1"
				/>
			))}

			{/* Axes */}
			{angles.map((a) => {
				const outer = toXY(a, maxR);
				return (
					<line
						key={a}
						x1={cx}
						y1={cy}
						x2={outer.x}
						y2={outer.y}
						stroke="rgba(148,163,184,0.3)"
						strokeWidth="1"
					/>
				);
			})}

			{/* Benchmark polygon */}
			<polygon
				points={polygonPoints(benchmarkValues)}
				fill="rgba(147,197,253,0.08)"
				stroke="rgba(147,197,253,0.5)"
				strokeWidth="1.5"
				strokeDasharray="4 3"
			/>

			{/* Factory polygon */}
			<polygon
				points={polygonPoints(factoryValues)}
				fill="rgba(96,165,250,0.25)"
				stroke="#60a5fa"
				strokeWidth="2"
			/>

			{/* Axis labels */}
			{angles.map((a, i) => {
				const labelR = maxR + 16;
				const pt = toXY(a, labelR);
				const label = axisLabels[i];
				return (
					<text
						key={label}
						x={pt.x}
						y={pt.y}
						textAnchor="middle"
						dominantBaseline="middle"
						fontSize="7"
						fill="rgba(148,163,184,0.9)"
					>
						{label}
					</text>
				);
			})}

			{/* Center dot */}
			<circle cx={cx} cy={cy} r="3" fill="#60a5fa" />
		</svg>
	);
}

// ---------------------------------------------------------------------------
// Gold seal SVG
// ---------------------------------------------------------------------------

function GoldSeal() {
	const { t } = useLocale();

	return (
		<svg
			width="48"
			height="48"
			viewBox="0 0 64 64"
			aria-label="Certified engineer seal"
			role="img"
			className="h-12 w-12 shrink-0"
		>
			<circle cx="32" cy="32" r="28" fill="#b45309" opacity="0.9" />
			<circle cx="32" cy="32" r="24" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
			<circle cx="32" cy="32" r="20" fill="#92400e" opacity="0.7" />
			<text x="32" y="29" textAnchor="middle" fontSize="7" fill="#fde68a" fontWeight="bold">
				{t("landing.seal.line1")}
			</text>
			<text x="32" y="38" textAnchor="middle" fontSize="7" fill="#fde68a" fontWeight="bold">
				{t("landing.seal.line2")}
			</text>
			{[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
				const rad = (deg * Math.PI) / 180;
				const x1 = (32 + 26 * Math.cos(rad)).toFixed(3);
				const y1 = (32 + 26 * Math.sin(rad)).toFixed(3);
				const x2 = (32 + 30 * Math.cos(rad)).toFixed(3);
				const y2 = (32 + 30 * Math.sin(rad)).toFixed(3);
				return (
					<line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth="1.5" />
				);
			})}
		</svg>
	);
}

// ---------------------------------------------------------------------------
// NavBar
// ---------------------------------------------------------------------------

function NavBar({
	appUrl,
	theme,
	setTheme,
	resolvedTheme,
}: {
	appUrl: string;
	theme: Theme;
	setTheme: (theme: Theme) => void;
	resolvedTheme: ResolvedTheme;
}) {
	const { locale, t } = useLocale();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 10);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const handleToggleMobile = () => setMobileOpen((v) => !v);
	const handleCloseMobile = () => setMobileOpen(false);

	return (
		<header
			className={cn(
				"sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 backdrop-blur-sm transition-shadow dark:border-cyan-300/10 dark:bg-[#041225]/95 dark:text-white",
				scrolled
					? "shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
					: "shadow-none"
			)}
		>
			<div className="mx-auto flex h-14 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-6">
				{/* Logo */}
				<a
					href="/"
					className="flex items-center gap-2 font-bold text-slate-950 shrink-0 dark:text-white"
				>
					<LogoIcon theme={resolvedTheme} />
					<span className="hidden text-lg leading-tight sm:inline">
						FactorySync
						<span className="block text-sm font-extrabold text-cyan-400 -mt-1">Solutions</span>
					</span>
					<span className="font-bold text-slate-950 sm:hidden dark:text-white">FS</span>
				</a>

				{/* Center nav links — hidden on mobile */}
				<nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
					{NAV_LINKS.map((link, index) => (
						<a
							key={link.key}
							href={link.href}
							className={cn(
								"whitespace-nowrap px-2 py-1.5 text-xs transition-colors hover:text-cyan-700 dark:hover:text-cyan-300 xl:px-3 xl:text-sm",
								index >= 6 && "hidden xl:inline-flex",
								link.href === "#hero"
									? "text-cyan-700 dark:text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]"
									: "text-slate-600 dark:text-slate-300"
							)}
						>
							{t(link.key)}
						</a>
					))}
				</nav>

				{/* Right controls */}
				<div className="flex items-center gap-2 shrink-0">
					<LocaleSwitcher />
					<ThemeSwitcher theme={theme} setTheme={setTheme} />

					{/* CTA */}
					<a
						href={appUrl}
						className={cn(
							buttonVariants({ size: "sm" }),
							"hidden rounded-md bg-blue-600 px-4 text-xs text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] hover:bg-blue-500 sm:inline-flex xl:px-7 xl:text-sm"
						)}
					>
						{locale === "th" ? "เริ่มประเมินฟรี" : t("landing.ctaBottom")}
					</a>

					{/* Hamburger */}
					<button
						type="button"
						onClick={handleToggleMobile}
						aria-label="Toggle menu"
						className="rounded-md p-1.5 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 md:hidden"
					>
						{mobileOpen ? <CloseIcon /> : <MenuIcon />}
					</button>
				</div>
			</div>

			{/* Mobile dropdown */}
			{mobileOpen && (
				<div className="border-t border-slate-200 bg-white shadow-lg dark:border-cyan-300/10 dark:bg-[#06172d] md:hidden">
					<nav className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1">
						{NAV_LINKS.map((link) => (
							<a
								key={link.key}
								href={link.href}
								onClick={handleCloseMobile}
								className="rounded-md px-3 py-2.5 text-base text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-300"
							>
								{t(link.key)}
							</a>
						))}
						<a
							href={appUrl}
							onClick={handleCloseMobile}
							className={cn(
								buttonVariants(),
								"mt-2 justify-center bg-blue-600 text-white hover:bg-blue-500"
							)}
						>
							{t("landing.cta").replace("!", "")}
						</a>
						<div className="mt-3 flex items-center justify-between gap-3">
							<span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
								{t("locale.label")}
							</span>
							<LocaleSwitcher />
						</div>
						<div className="mt-3 flex items-center justify-between gap-3">
							<span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
								{t("theme.label")}
							</span>
							<ThemeSwitcher theme={theme} setTheme={setTheme} />
						</div>
					</nav>
				</div>
			)}
		</header>
	);
}

// ---------------------------------------------------------------------------
// HeroSection
// ---------------------------------------------------------------------------

const HERO_STATS = [
	{
		value: "43",
		labelKey: "landing.stat.questions",
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				aria-hidden="true"
			>
				<rect x="9" y="2" width="6" height="4" rx="1" />
				<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
			</svg>
		),
	},
	{
		value: "8",
		labelKey: "landing.stat.dims",
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="3" />
				<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
			</svg>
		),
	},
	{
		value: "15",
		labelKey: "landing.stat.time",
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<polyline points="12 6 12 12 16 14" />
			</svg>
		),
	},
	{
		value: null,
		labelKey: "landing.stat.report",
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				aria-hidden="true"
			>
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="16" y1="13" x2="8" y2="13" />
				<line x1="16" y1="17" x2="8" y2="17" />
			</svg>
		),
	},
];

function HeroSection({ appUrl }: { appUrl: string }) {
	const { t, locale } = useLocale();

	return (
		<section id="hero" className="relative overflow-hidden bg-sky-50 dark:bg-[#041225]">
			<div className="absolute inset-0">
				<img
					src={HERO_IMG}
					alt=""
					className="h-full w-full object-cover opacity-75 dark:opacity-70"
					loading="eager"
				/>
				<div className="absolute inset-0 bg-[linear-gradient(90deg,#f8fafc_0%,rgba(248,250,252,0.88)_30%,rgba(240,249,255,0.4)_60%,rgba(240,249,255,0.08)_100%)] dark:bg-[linear-gradient(90deg,#041225_0%,rgba(4,18,37,0.9)_34%,rgba(4,18,37,0.48)_72%,rgba(4,18,37,0.3)_100%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_26%,rgba(14,165,233,0.18),transparent_34%),linear-gradient(180deg,rgba(248,250,252,0)_70%,#f0f9ff_100%)] dark:bg-[radial-gradient(circle_at_68%_26%,rgba(14,165,233,0.34),transparent_34%),linear-gradient(180deg,rgba(4,18,37,0)_70%,#06172d_100%)]" />
				<div className="absolute inset-0 factory-scanlines opacity-25 dark:opacity-40" />
			</div>
			<div className="relative mx-auto flex min-h-[500px] max-w-[1180px] flex-col md:min-h-[430px] md:flex-row">
				{/* ── LEFT: text ─────────────────────────────────── */}
				<div className="flex max-w-[650px] flex-1 flex-col justify-center px-6 py-12 text-slate-950 sm:px-10 md:max-w-[640px] md:px-4 md:py-14 lg:max-w-[720px] dark:text-white">
					<FadeIn delay={0}>
						<h1 className="mb-4 text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-[40px] md:text-[38px] xl:text-[48px]">
							<span className="block">{t("landing.hero.title1")}</span>
							<span className="block mt-1">
								{locale === "th" ? (
									<>
										ด้วย{" "}
										<span className="text-cyan-600 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:text-cyan-300 dark:drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]">
											AI
										</span>{" "}
										และ
										<span className="text-cyan-600 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:text-cyan-300 dark:drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]">
											วุฒิวิศวกร
										</span>
									</>
								) : (
									<>
										with{" "}
										<span className="text-cyan-600 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:text-cyan-300 dark:drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]">
											AI
										</span>{" "}
										&{" "}
										<span className="text-cyan-600 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:text-cyan-300 dark:drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]">
											Certified Engineers
										</span>
									</>
								)}
							</span>
						</h1>
					</FadeIn>

					<FadeIn delay={0.08}>
						<p className="mb-6 max-w-[500px] text-base leading-relaxed text-slate-700 sm:text-lg md:max-w-[460px] dark:text-slate-200">
							{t("landing.hero.desc")}
						</p>
					</FadeIn>

					<FadeIn delay={0.16}>
						<div className="mb-6 flex flex-wrap gap-3">
							<a
								href={appUrl}
								className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-600 px-7 font-semibold text-white shadow-[0_0_28px_rgba(37,99,235,0.5)] transition-colors hover:bg-blue-500"
							>
								{t("landing.cta")}
								<svg
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2.5"
									strokeLinecap="round"
									aria-hidden="true"
								>
									<path d="M5 12h14M12 5l7 7-7 7" />
								</svg>
							</a>
							<a
								href="#contact"
								className="inline-flex h-11 items-center gap-2 rounded-md border border-blue-200 bg-white/75 px-7 font-medium text-slate-900 transition-colors hover:bg-white dark:border-cyan-300/35 dark:bg-[#06172d]/45 dark:text-white dark:hover:bg-white/10"
							>
								<svg
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									aria-hidden="true"
								>
									<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
									<circle cx="12" cy="7" r="4" />
								</svg>
								{t("landing.hero.cta2")}
							</a>
						</div>
					</FadeIn>

					<FadeIn delay={0.24}>
						<div className="grid max-w-[660px] grid-cols-2 gap-3 sm:grid-cols-4 md:max-w-[590px]">
							{HERO_STATS.map((stat) => (
								<div
									key={stat.labelKey}
									className="rounded-md border border-blue-200 bg-white/75 p-3 text-center shadow-xs dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
								>
									<div className="mb-2 flex justify-center text-cyan-700 dark:text-cyan-300">
										{stat.icon}
									</div>
									{stat.value && (
										<div className="mb-0.5 text-2xl font-bold text-slate-950 sm:text-[28px] dark:text-white">
											{stat.value}
										</div>
									)}
									<div className="text-xs leading-snug text-slate-600 sm:text-sm dark:text-slate-300">
										{t(stat.labelKey)}
									</div>
								</div>
							))}
						</div>
					</FadeIn>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// TrustBarSection
// ---------------------------------------------------------------------------

function TrustBarSection() {
	const { t } = useLocale();

	const items = [
		{
			icon: TRUST_ICONS[0],
			titleKey: "landing.trust.exp",
			subKey: "landing.trust.expSub",
		},
		{
			icon: TRUST_ICONS[1],
			titleKey: "landing.trust.consult",
			subKey: "landing.trust.consultSub",
		},
		{
			icon: TRUST_ICONS[2],
			titleKey: "landing.trust.eng",
			subKey: "landing.trust.engSub",
		},
		{
			icon: TRUST_ICONS[3],
			titleKey: "landing.trust.std",
			subKey: "landing.trust.stdSub",
		},
	];

	return (
		<section className="border-y border-sky-200 bg-white py-5 text-slate-950 dark:border-cyan-300/20 dark:bg-[#06172d] dark:text-white">
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<div className="grid grid-cols-1 divide-y divide-sky-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 md:grid-cols-4 dark:divide-cyan-300/15">
					{items.map((item) => (
						<div
							key={item.titleKey}
							className="flex items-center gap-4 px-5 py-4 first:pl-0 last:pr-0"
						>
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 dark:border-cyan-300/30 dark:bg-cyan-300/10">
								{item.icon}
							</div>
							<div>
								<p className="text-sm font-bold leading-snug text-slate-950 dark:text-white">
									{t(item.titleKey)}
								</p>
								<p className="mt-1 text-xs leading-snug text-cyan-700 dark:text-cyan-300">
									{t(item.subKey)}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// DimensionsSection
// ---------------------------------------------------------------------------

function DimensionsSection() {
	const { t, locale } = useLocale();

	return (
		<section
			id="dimensions"
			className="border-b border-sky-200 bg-sky-50 py-6 text-slate-950 dark:border-cyan-300/15 dark:bg-[#06172d] dark:text-white"
		>
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<div className="flex flex-col items-start gap-6 md:flex-row">
					{/* Left — dimension cards */}
					<div className="flex-1 min-w-0">
						<FadeIn>
							<div className="mb-5">
								<h2 className="mb-3 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl dark:text-white">
									{locale === "th" ? (
										<>
											<span className="text-cyan-700 dark:text-cyan-300">8 มิติ</span>
											การตรวจสุขภาพโรงงาน
										</>
									) : (
										<>
											<span className="text-cyan-700 dark:text-cyan-300">8 Dimensions</span> of
											Factory Health Check
										</>
									)}
								</h2>
								<p className="max-w-lg leading-relaxed text-slate-600 dark:text-slate-300">
									{t("landing.dims.subtitle")}
								</p>
							</div>
						</FadeIn>

						<StaggerChildren className="grid grid-cols-2 gap-3 md:grid-cols-4">
							{DIMENSIONS.map((dim) => (
								<StaggerItem key={dim.number}>
									<div className="flex min-h-[86px] flex-col gap-2 rounded-md border border-sky-200 bg-white p-3 shadow-xs transition-all hover:border-sky-300 hover:shadow-md dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:shadow-none dark:hover:border-cyan-300/60 dark:hover:bg-cyan-300/15 dark:hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]">
										<div className="flex items-start justify-between">
											<div className="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold text-cyan-700 dark:text-cyan-300">
												{dim.number}
											</div>
											<span className="text-cyan-700 dark:text-cyan-300">{dim.icon}</span>
										</div>
										<p className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">
											{t(dim.labelKey)}
										</p>
									</div>
								</StaggerItem>
							))}
						</StaggerChildren>
					</div>

					{/* Right — Radar chart card */}
					<div className="w-full shrink-0 md:w-[350px]">
						<FadeIn delay={0.15}>
							<div className="rounded-md border border-sky-200 bg-white p-4 text-slate-950 shadow-xs dark:border-cyan-300/35 dark:bg-[#041225] dark:text-white dark:shadow-[0_0_35px_rgba(14,165,233,0.16)]">
								<div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
									<span>{t("landing.radar.overview")}</span>
									<span>{t("landing.radar.totalScore")}</span>
								</div>
								<div className="flex items-center justify-center mb-2">
									<RadarChart />
								</div>
								<div className="mb-3 text-center">
									<span className="text-4xl font-bold text-cyan-700 dark:text-cyan-300">
										{t("landing.radar.score")}
									</span>
								</div>
								<div className="mb-4 flex items-center justify-center gap-4 text-sm">
									<span className="flex items-center gap-1.5">
										<span className="inline-block w-3 h-3 rounded-full bg-blue-400" />
										{t("landing.radar.you")}
									</span>
									<span className="flex items-center gap-1.5">
										<span
											className="inline-block w-3 h-3 rounded-full border border-blue-300"
											style={{ borderStyle: "dashed" }}
										/>
										{t("landing.radar.avg")}
									</span>
								</div>
								<a
									href="#process"
									className={cn(
										buttonVariants(),
										"w-full justify-center bg-blue-600 text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] hover:bg-blue-500"
									)}
								>
									{t("landing.radar.seeReport")}
								</a>
							</div>
						</FadeIn>
					</div>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// ExpertSection
// ---------------------------------------------------------------------------

function ExpertSection() {
	const { t, locale } = useLocale();
	const bullets = EXPERT_BULLETS[locale];

	return (
		<section id="expert" className="bg-sky-50 text-slate-950 dark:bg-[#06172d] dark:text-white">
			<div className="mx-auto max-w-[1180px] border-t border-sky-200 px-4 py-8 sm:px-6 dark:border-cyan-300/15">
				<div className="grid gap-7 md:grid-cols-[0.9fr_0.75fr_1fr] md:items-center">
					{/* Left — certificate card */}
					<FadeIn>
						<div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-amber-200/70 bg-linear-to-br from-amber-50 via-yellow-50 to-orange-50 p-5 shadow-2xl">
							{/* decorative corner ornaments */}
							<div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-md" />
							<div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-md" />
							<div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-md" />
							<div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-md" />

							<div className="text-center">
								<p className="text-xs font-bold tracking-[0.25em] text-amber-700 uppercase mb-2">
									{t("landing.certificate.title")}
								</p>
								<div className="w-16 h-0.5 bg-amber-400/60 mx-auto mb-4" />
								<p className="text-xs text-slate-500 mb-1">{t("landing.certificate.person")}</p>
								<h3 className="text-xl font-extrabold text-slate-800 mb-1">
									{t("landing.certificate.level")}
								</h3>
								<p className="text-sm font-semibold text-slate-600 mb-1">
									{t("landing.certificate.discipline")}
								</p>
								<p className="text-xs text-slate-400">{t("landing.certificate.branch")}</p>
							</div>

							<GoldSeal />

							<div className="text-center">
								<p className="text-xs font-semibold text-amber-800">
									{t("landing.certificate.authority")}
								</p>
								<p className="text-xs text-slate-400 mt-0.5">Council of Engineers Thailand</p>
							</div>
						</div>
					</FadeIn>

					{/* Center — content */}
					<FadeIn delay={0.1}>
						<span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
							{t("landing.expert.label")}
						</span>
						<h2 className="mb-4 text-3xl font-extrabold leading-tight text-slate-950 md:text-[32px] dark:text-white">
							{locale === "th" ? (
								<>
									เชี่ยวชาญงานวิศวกรรม
									<span className="block text-cyan-700 dark:text-cyan-300">ระดับวุฒิวิศวกร</span>
								</>
							) : (
								<>
									Engineering Expertise
									<span className="block text-cyan-700 dark:text-cyan-300">
										Certified Engineer Level
									</span>
								</>
							)}
						</h2>
						<p className="leading-relaxed text-slate-600 dark:text-slate-300">
							{t("landing.expert.desc")}
						</p>
					</FadeIn>

					<FadeIn delay={0.16}>
						<ul className="flex flex-col gap-3">
							{bullets.map((bullet) => {
								const [title, detail] = bullet.split(" – ");
								return (
									<li
										key={bullet}
										className="flex items-start gap-3 border-b border-sky-200 pb-3 last:border-b-0 dark:border-cyan-300/10"
									>
										<span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-700 dark:text-cyan-300">
											<CheckIcon />
										</span>
										<span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
											<strong className="block text-slate-950 dark:text-white">{title}</strong>
											{detail}
										</span>
									</li>
								);
							})}
						</ul>
					</FadeIn>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// ServicesSection
// ---------------------------------------------------------------------------

const SERVICE_SLUGS = [
	"factory-health-check",
	"production-assessment",
	"efficiency-consulting",
	"digital-factory",
];

function ServicesSection() {
	const { t, locale } = useLocale();
	const cards = SERVICES_CONTENT[locale];

	return (
		<section id="services" className="bg-white py-12 dark:bg-[#041225]">
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<FadeIn>
					<div className="mb-8 text-center">
						<h2 className="relative mb-2 inline-block text-3xl font-extrabold text-slate-900 dark:text-white">
							{t("landing.services.title")}
							<span className="absolute -bottom-1.5 left-0 right-0 h-1 rounded-full bg-blue-600" />
						</h2>
					</div>
				</FadeIn>

				<StaggerChildren className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
					{SERVICES.map((svc, i) => (
						<StaggerItem key={svc.titleKey}>
							<div className="group flex h-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-xs transition-all hover:-translate-y-1 hover:shadow-lg dark:border-cyan-300/15 dark:bg-[#071b33] dark:shadow-none dark:hover:border-cyan-300/35">
								<div className="relative h-36">
									<img
										src={svc.img}
										alt=""
										className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
										loading="lazy"
									/>
									<div className="absolute inset-0 bg-linear-to-t from-slate-900/60 via-transparent to-transparent" />
									<div className="absolute -bottom-5 left-5 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-blue-700 text-white shadow-lg dark:border-[#071b33]">
										{svc.icon}
									</div>
								</div>
								<div className="flex flex-1 flex-col gap-2 p-5 pt-8">
									<h3 className="font-extrabold leading-snug text-slate-900 dark:text-white">
										{cards[i].title}
									</h3>
									<p className="text-slate-500 text-sm leading-relaxed flex-1 dark:text-slate-300">
										{cards[i].desc}
									</p>
									<a
										href={`/services/${SERVICE_SLUGS[i]}`}
										className="inline-flex items-center gap-1 text-blue-600 text-sm font-semibold hover:text-blue-800 transition-colors mt-2 dark:text-cyan-300 dark:hover:text-cyan-200"
									>
										{cards[i].link}
									</a>
								</div>
							</div>
						</StaggerItem>
					))}
				</StaggerChildren>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// ProcessSection
// ---------------------------------------------------------------------------

function ProcessSection() {
	const { t, locale } = useLocale();
	const steps = PROCESS_STEPS[locale];

	return (
		<section
			id="process"
			className="border-y border-slate-200 bg-slate-50 py-12 dark:border-cyan-300/15 dark:bg-[#06172d]"
		>
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<FadeIn>
					<h2 className="mb-10 text-3xl font-extrabold text-slate-900 dark:text-white">
						{t("landing.process.title")}
					</h2>
				</FadeIn>

				<div className="grid gap-8 md:grid-cols-[1fr_330px] md:items-center">
					{/* Left — steps */}
					<div className="min-w-0">
						<div className="grid gap-5 md:grid-cols-4">
							{steps.map((step, i) => (
								<FadeIn key={step.number} delay={i * 0.08}>
									<div className="relative">
										{i < steps.length - 1 && (
											<div
												className="absolute left-10 top-5 hidden w-[calc(100%+1.25rem)] border-t-2 border-dashed border-blue-300 md:block"
												aria-hidden="true"
											/>
										)}
										<div className="relative z-10 mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-sm font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.28)]">
											{i + 1}
										</div>
										<h3 className="mb-1 font-extrabold text-slate-900 dark:text-white">
											{step.label}
										</h3>
										<p className="text-sm leading-relaxed text-slate-500 dark:text-slate-300">
											{step.detail}
										</p>
									</div>
								</FadeIn>
							))}
						</div>
					</div>

					{/* Right — report thumbnail */}
					<FadeIn delay={0.2}>
						<div className="grid grid-cols-[110px_1fr] overflow-hidden rounded-md border border-slate-200 bg-white shadow-xs dark:border-cyan-300/15 dark:bg-[#071b33] dark:shadow-none">
							<img
								src="https://images.unsplash.com/photo-1553484771-371a605b060b?w=400&q=80"
								alt="Sample report"
								className="h-full min-h-40 w-full object-cover"
								loading="lazy"
							/>
							<div className="bg-white p-5 dark:bg-[#071b33]">
								<p className="mb-3 text-sm font-bold leading-relaxed text-blue-900 dark:text-cyan-100">
									{locale === "th" ? "รายงานเชิงลึก พร้อมแผนปรับปรุง" : "In-Depth Report + Action Plan"}
								</p>
								<a
									href="#contact"
									className={cn(
										buttonVariants(),
										"w-full justify-center bg-blue-600 text-white hover:bg-blue-500"
									)}
								>
									{t("landing.process.seeReport")}
								</a>
							</div>
						</div>
					</FadeIn>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// ResultsSection (carousel)
// ---------------------------------------------------------------------------

function ResultsSection() {
	const { t, locale } = useLocale();
	const cards = RESULTS_CARDS[locale];

	return (
		<section id="results" className="bg-white py-12 dark:bg-[#041225]">
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<FadeIn>
					<div className="mb-8 text-center">
						<h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
							{t("landing.results.title")}
						</h2>
					</div>
				</FadeIn>

				{/* All 4 cards — carousel on mobile via overflow-x-auto, grid on desktop */}
				<div className="grid grid-cols-2 gap-5 md:grid-cols-4">
					{cards.map((card) => (
						<div
							key={card.badge + card.industry}
							className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-cyan-300/15 dark:bg-[#071b33] dark:shadow-none"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg font-extrabold text-white dark:bg-cyan-300/15">
									{card.badge}
								</div>
								<span className="text-xs font-bold text-slate-400 tracking-widest uppercase">
									{card.industry}
								</span>
							</div>
							<div>
								<div className={cn("text-3xl font-extrabold", card.metricColor)}>{card.metric}</div>
								<p className="text-slate-700 font-semibold mt-1 dark:text-slate-200">{card.desc}</p>
							</div>
							<p className="text-slate-400 text-sm border-t border-slate-100 pt-3">
								{card.timeframe}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// BottomCtaSection
// ---------------------------------------------------------------------------

function BottomCtaSection({ appUrl }: { appUrl: string }) {
	const { t } = useLocale();

	const contactItems = [
		{
			icon: <LineIcon size={22} />,
			iconColor: "text-[#06C755]",
			primary: t("landing.contact.lineHandle"),
			secondary: t("landing.contact.lineNote"),
			href: "https://lin.ee/rWwdF9q",
		},
		{
			icon: <EmailIcon size={22} />,
			iconColor: "text-blue-400",
			primary: "info@factorysyncsolutions.com",
			secondary: t("landing.contact.emailNote"),
			href: "mailto:info@factorysyncsolutions.com",
		},
		{
			icon: <PhoneIcon size={22} />,
			iconColor: "text-blue-400",
			primary: t("landing.contact.phone"),
			secondary: t("landing.contact.phoneNote"),
			href: "tel:021234567",
		},
		{
			icon: <ClockIcon size={22} />,
			iconColor: "text-blue-400",
			primary: t("landing.contact.hours"),
			secondary: "",
			href: null,
		},
	];

	return (
		<section id="contact" className="bg-white px-2 pb-0 text-white dark:bg-[#041225]">
			<div className="mx-auto max-w-[1180px] rounded-md border border-blue-200 bg-[#06285a] px-4 py-5 shadow-[0_0_34px_rgba(37,99,235,0.2)] sm:px-6 dark:border-cyan-300/20">
				<FadeIn>
					<div className="grid gap-5 md:grid-cols-[1fr_1.35fr] md:items-center">
						<div>
							<h2 className="text-2xl font-extrabold sm:text-3xl">
								{t("landing.bottomCta.title")}
							</h2>
							<p className="mt-1 text-sm text-cyan-100">{t("landing.bottomCta.subtitle")}</p>
							<a
								href={appUrl}
								className={cn(
									buttonVariants({ size: "lg" }),
									"mt-4 bg-blue-600 px-10 text-base text-white shadow-[0_0_24px_rgba(37,99,235,0.45)] hover:bg-blue-500"
								)}
							>
								{t("landing.ctaBottom")}
							</a>
						</div>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							{contactItems.slice(0, 3).map((item) => {
								const sharedClass =
									"flex min-w-0 items-center gap-3 rounded-md border border-white/15 bg-white/5 p-3 transition-colors hover:bg-white/10";

								return (
									<a
										key={item.primary}
										href={item.href as string}
										target={item.href?.startsWith("http") ? "_blank" : undefined}
										rel={item.href?.startsWith("http") ? "noopener noreferrer" : undefined}
										className={sharedClass}
									>
										<span className={cn("shrink-0", item.iconColor)}>{item.icon}</span>
										<span className="min-w-0">
											<span className="block text-[13px] font-bold leading-tight text-white [overflow-wrap:anywhere]">
												{item.primary}
											</span>
											{item.secondary && (
												<span className="mt-0.5 block text-xs leading-tight text-white/60">
													{item.secondary}
												</span>
											)}
										</span>
									</a>
								);
							})}
						</div>
					</div>
				</FadeIn>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

const SEP = <span className="text-slate-300 dark:text-slate-600">|</span>;

function Footer({ version, resolvedTheme }: { version: string; resolvedTheme: ResolvedTheme }) {
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
				{/* Brand */}
				<div className="flex items-center gap-3">
					<LogoIcon theme={resolvedTheme} />
					<div>
						<p className="text-sm font-semibold text-slate-900 dark:text-white">
							FactorySync Solutions Co., Ltd.
						</p>
						<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("footer.desc")}</p>
					</div>
				</div>

				{/* Legal links + copyright */}
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
								{index < legalLinks.length - 1 && SEP}
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

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

function LandingInner({ appUrl, version }: { appUrl: string; version: string }) {
	const { theme, resolvedTheme, setTheme } = useTheme();

	return (
		<div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-[#041225] dark:text-slate-100">
			<NavBar appUrl={appUrl} theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} />
			<main className="flex-1">
				<HeroSection appUrl={appUrl} />
				<TrustBarSection />
				<DimensionsSection />
				<ExpertSection />
				<ServicesSection />
				<ProcessSection />
				<ResultsSection />
				<BottomCtaSection appUrl={appUrl} />
			</main>
			<Footer version={version} resolvedTheme={resolvedTheme} />
		</div>
	);
}

export interface LandingContentProps {
	appUrl: string;
	version: string;
}

export function LandingContent({ appUrl, version }: LandingContentProps) {
	return (
		<LocaleProvider>
			<LandingInner appUrl={appUrl} version={version} />
		</LocaleProvider>
	);
}
