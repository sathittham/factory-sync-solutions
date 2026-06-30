import { buttonVariants } from "@/components/ui/button";
import { type Locale, LocaleProvider, useLocale } from "@/lib/i18n";
import { type Theme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import fsDarkLogo from "@shared/brand/fs-dark.png";
import fsLightLogo from "@shared/brand/fs-light.png";
import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function LogoIcon({ theme = "dark" }: { readonly theme?: "dark" | "light" }) {
	const logo = theme === "dark" ? fsDarkLogo : fsLightLogo;
	return (
		<img
			src={logo.src}
			alt="FactorySync Solutions"
			width={32}
			height={32}
			className="h-8 w-8 object-contain"
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

function ThemeSwitcher({
	theme,
	setTheme,
	className,
}: {
	readonly theme: Theme;
	readonly setTheme: (theme: Theme) => void;
	readonly className?: string;
}) {
	const { t } = useLocale();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const current = THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[2];

	useEffect(() => {
		if (!open) return;
		const onClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onClickOutside);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClickOutside);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

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
							onClick={() => {
								setTheme(option.value);
								setOpen(false);
							}}
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

function LocaleSwitcher({ className }: { readonly className?: string }) {
	const { locale, setLocale, t } = useLocale();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const current = LOCALE_OPTIONS.find((o) => o.value === locale) ?? LOCALE_OPTIONS[0];

	useEffect(() => {
		if (!open) return;
		const onClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onClickOutside);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClickOutside);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

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
							onClick={() => {
								setLocale(option.value);
								setOpen(false);
							}}
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
// Nav links for non-landing pages (homepage anchors)
// ---------------------------------------------------------------------------

const PAGE_LINKS = [
	{ labelKey: "nav.home", href: "/" },
	{ labelKey: "nav.healthCheck", href: "/#dimensions" },
	{ labelKey: "nav.engineering", href: "/#expert" },
	{ labelKey: "nav.contact", href: "/#contact" },
] as const;

// ---------------------------------------------------------------------------
// SiteNavBarInner
// ---------------------------------------------------------------------------

function SiteNavBarInner({ appUrl }: { readonly appUrl: string }) {
	const { t } = useLocale();
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 10);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			className={cn(
				"sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 backdrop-blur-sm transition-shadow dark:border-cyan-300/10 dark:bg-[#041225]/95 dark:text-white",
				scrolled
					? "shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
					: "shadow-none"
			)}
		>
			<div className="mx-auto grid h-14 w-full max-w-[1536px] grid-cols-[auto_1fr_auto] items-center gap-x-4 px-4 sm:px-6 lg:px-8">
				{/* Logo */}
				<a
					href="/"
					className="col-start-1 flex shrink-0 items-center gap-2 justify-self-start font-bold text-slate-950 dark:text-white"
				>
					<LogoIcon theme={resolvedTheme} />
					<span className="text-lg leading-tight">
						{"FactorySync"}
						<span className="block text-sm font-extrabold text-cyan-400 -mt-1">Solutions</span>
					</span>
				</a>

				{/* Center: homepage anchor links */}
				<nav
					className="col-start-2 hidden items-center justify-center gap-1 overflow-hidden justify-self-center lg:flex"
					aria-label="Main navigation"
				>
					{PAGE_LINKS.map((link) => (
						<a
							key={link.labelKey}
							href={link.href}
							className="whitespace-nowrap px-2 py-1.5 text-xs text-slate-600 transition-colors hover:text-cyan-700 dark:text-slate-300 dark:hover:text-cyan-300 xl:px-3 xl:text-sm"
						>
							{t(link.labelKey)}
						</a>
					))}
				</nav>

				{/* Right controls */}
				<div className="col-start-3 flex shrink-0 items-center justify-end gap-2 justify-self-end">
					<LocaleSwitcher className="hidden sm:block" />
					<ThemeSwitcher theme={theme} setTheme={setTheme} className="hidden sm:block" />

					<a
						href={appUrl}
						className={cn(
							buttonVariants({ variant: "outline", size: "sm" }),
							"hidden rounded-md px-4 text-xs sm:inline-flex xl:px-5 xl:text-sm"
						)}
					>
						{t("nav.signIn")}
					</a>

					{/* Hamburger — mobile only */}
					<button
						type="button"
						onClick={() => setMobileOpen((v) => !v)}
						aria-label={t("nav.toggleMenu")}
						className="rounded-md p-1.5 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 sm:hidden"
					>
						{mobileOpen ? <CloseIcon /> : <MenuIcon />}
					</button>
				</div>
			</div>

			{/* Mobile dropdown */}
			{mobileOpen && (
				<div className="border-t border-slate-200 bg-white shadow-lg dark:border-cyan-300/10 dark:bg-[#06172d] sm:hidden">
					<nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
						{PAGE_LINKS.map((link) => (
							<a
								key={link.labelKey}
								href={link.href}
								onClick={() => setMobileOpen(false)}
								className="rounded-md px-3 py-2.5 text-base text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-300"
							>
								{t(link.labelKey)}
							</a>
						))}
						<a
							href={appUrl}
							className={cn(buttonVariants({ variant: "outline" }), "mt-2 justify-center")}
						>
							{t("nav.signIn")}
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
// Public export — wraps its own LocaleProvider so it works as a standalone island
// ---------------------------------------------------------------------------

export function SiteNavBar({ appUrl }: { readonly appUrl: string }) {
	return (
		<LocaleProvider>
			<SiteNavBarInner appUrl={appUrl} />
		</LocaleProvider>
	);
}
