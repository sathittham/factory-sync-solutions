import { buttonVariants } from "@/components/ui/button";
import { type Locale, LocaleProvider, useLocale } from "@/lib/i18n";
import { SERVICE_GROUPS, childHref, groupHref } from "@/lib/services";
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
// Primary nav model — routed multi-page IA (sitemap.md §4)
// ---------------------------------------------------------------------------

const ABOUT_LINKS = [
	{ labelKey: "nav.aboutCompany", href: "/about/company" },
	{ labelKey: "nav.aboutTeam", href: "/about/team" },
	{ labelKey: "nav.aboutCaseStudies", href: "/about/case-studies" },
] as const;

const linkClass =
	"whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-slate-600 transition-colors hover:text-cyan-700 dark:text-slate-300 dark:hover:text-cyan-300 xl:px-3";

const triggerClass =
	"flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-slate-600 transition-colors hover:text-cyan-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 dark:text-slate-300 dark:hover:text-cyan-300 xl:px-3";

type OpenMenu = null | "about" | "services";

// ---------------------------------------------------------------------------
// Services mega menu panel (desktop)
// ---------------------------------------------------------------------------

function ServicesMegaPanel() {
	const { t } = useLocale();
	return (
		<div className="grid grid-cols-2 gap-x-12 gap-y-9 lg:grid-cols-4">
			{SERVICE_GROUPS.map((group) => (
				<div key={group.id} className="min-w-[12rem]">
					<a href={groupHref(group)} className="group/col block">
						<span className="flex min-h-[3rem] items-start gap-2 text-base font-bold leading-snug text-slate-900 transition-colors group-hover/col:text-blue-700 dark:text-white dark:group-hover/col:text-cyan-300">
							<span>{t(group.labelKey)}</span>
							{group.isFlagship && (
								<span className="mt-0.5 shrink-0 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
									FREE
								</span>
							)}
						</span>
						<span className="mt-2.5 block border-b-2 border-blue-600 dark:border-cyan-300" />
					</a>
					{group.children ? (
						<ul className="mt-5 space-y-3.5">
							{group.children.map((child) => (
								<li key={child.slug}>
									<a
										href={childHref(group, child)}
										className="block text-sm leading-snug text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-300 dark:hover:text-cyan-300"
									>
										{t(child.labelKey)}
									</a>
								</li>
							))}
						</ul>
					) : (
						<p className="mt-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
							{t(`${group.labelKey.replace(".title", ".sub")}`)}
						</p>
					)}
				</div>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// About dropdown panel (desktop)
// ---------------------------------------------------------------------------

function AboutPanel() {
	const { t } = useLocale();
	return (
		<div className="min-w-[14rem]">
			<a
				href="/about"
				className="inline-block border-b-2 border-blue-600 pb-2.5 text-base font-bold text-slate-900 transition-colors hover:text-blue-700 dark:border-cyan-300 dark:text-white dark:hover:text-cyan-300"
			>
				{t("nav.about")}
			</a>
			<ul className="mt-5 space-y-3.5">
				{ABOUT_LINKS.map((link) => (
					<li key={link.labelKey}>
						<a
							href={link.href}
							className="block text-sm leading-snug text-slate-600 transition-colors hover:text-blue-700 dark:text-slate-300 dark:hover:text-cyan-300"
						>
							{t(link.labelKey)}
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Mobile accordion drawer
// ---------------------------------------------------------------------------

function MobileDrawer({
	appUrl,
	theme,
	setTheme,
	onClose,
}: {
	readonly appUrl: string;
	readonly theme: Theme;
	readonly setTheme: (theme: Theme) => void;
	readonly onClose: () => void;
}) {
	const { t } = useLocale();
	const [section, setSection] = useState<OpenMenu>(null);
	const toggle = (s: OpenMenu) => setSection((cur) => (cur === s ? null : s));

	return (
		<div className="border-t border-slate-200 bg-white shadow-lg dark:border-cyan-300/10 dark:bg-[#06172d] lg:hidden">
			<nav
				className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3"
				aria-label="Mobile navigation"
			>
				<a
					href="/"
					onClick={onClose}
					className="rounded-md px-3 py-2.5 text-base text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-300"
				>
					{t("nav.home")}
				</a>

				{/* About accordion */}
				<button
					type="button"
					onClick={() => toggle("about")}
					aria-expanded={section === "about"}
					className="flex items-center justify-between rounded-md px-3 py-2.5 text-base text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
				>
					{t("nav.about")}
					<ChevronDownIcon />
				</button>
				{section === "about" && (
					<div className="ml-3 flex flex-col gap-0.5 border-l border-slate-200 pl-3 dark:border-cyan-300/15">
						<a
							href="/about"
							onClick={onClose}
							className="rounded-md px-3 py-2 text-sm text-slate-600 hover:text-cyan-700 dark:text-slate-300 dark:hover:text-cyan-300"
						>
							{t("nav.viewAll")}
						</a>
						{ABOUT_LINKS.map((link) => (
							<a
								key={link.labelKey}
								href={link.href}
								onClick={onClose}
								className="rounded-md px-3 py-2 text-sm text-slate-600 hover:text-cyan-700 dark:text-slate-300 dark:hover:text-cyan-300"
							>
								{t(link.labelKey)}
							</a>
						))}
					</div>
				)}

				{/* Services accordion */}
				<button
					type="button"
					onClick={() => toggle("services")}
					aria-expanded={section === "services"}
					className="flex items-center justify-between rounded-md px-3 py-2.5 text-base text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
				>
					{t("nav.services")}
					<ChevronDownIcon />
				</button>
				{section === "services" && (
					<div className="ml-3 flex flex-col gap-1 border-l border-slate-200 pl-3 dark:border-cyan-300/15">
						{SERVICE_GROUPS.map((group) => (
							<div key={group.id}>
								<a
									href={groupHref(group)}
									onClick={onClose}
									className={cn(
										"block rounded-md px-3 py-2 text-sm font-semibold",
										group.isFlagship
											? "text-cyan-700 dark:text-cyan-300"
											: "text-slate-700 dark:text-slate-200"
									)}
								>
									{t(group.labelKey)}
								</a>
								{group.children && (
									<div className="ml-2 flex flex-col gap-0.5 border-l border-slate-200 pl-2 dark:border-cyan-300/15">
										{group.children.map((child) => (
											<a
												key={child.slug}
												href={childHref(group, child)}
												onClick={onClose}
												className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:text-cyan-700 dark:text-slate-400 dark:hover:text-cyan-300"
											>
												{t(child.labelKey)}
											</a>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				)}

				<a
					href="/knowledge"
					onClick={onClose}
					className="rounded-md px-3 py-2.5 text-base text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-300"
				>
					{t("nav.knowledge")}
				</a>
				<a
					href="/contact"
					onClick={onClose}
					className="rounded-md px-3 py-2.5 text-base text-slate-700 transition-colors hover:bg-slate-100 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-300"
				>
					{t("nav.contact")}
				</a>

				<a
					href={appUrl}
					onClick={onClose}
					className={cn(
						buttonVariants(),
						"mt-2 justify-center bg-blue-600 text-white hover:bg-blue-500"
					)}
				>
					{t("nav.freeCheckCta")}
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
	);
}

// ---------------------------------------------------------------------------
// SiteNav — accepts theme/setTheme/resolvedTheme from parent, no own provider
// ---------------------------------------------------------------------------

export interface SiteNavProps {
	readonly appUrl: string;
	readonly theme: Theme;
	readonly setTheme: (t: Theme) => void;
	readonly resolvedTheme: "dark" | "light";
}

export function SiteNav({ appUrl, theme, setTheme, resolvedTheme }: SiteNavProps) {
	const { t } = useLocale();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
	const [scrolled, setScrolled] = useState(false);
	const navRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 10);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	useEffect(() => {
		if (!openMenu) return;
		const onClickOutside = (e: MouseEvent) => {
			if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenMenu(null);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpenMenu(null);
		};
		document.addEventListener("mousedown", onClickOutside);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClickOutside);
			document.removeEventListener("keydown", onKey);
		};
	}, [openMenu]);

	const toggleMenu = (menu: OpenMenu) => setOpenMenu((cur) => (cur === menu ? null : menu));

	return (
		<header
			className={cn(
				"sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-950 backdrop-blur-sm transition-shadow dark:border-cyan-300/10 dark:bg-[#041225]/95 dark:text-white",
				scrolled
					? "shadow-[0_12px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
					: "shadow-none"
			)}
		>
			<div ref={navRef}>
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

					{/* Center: primary nav with dropdowns */}
					<nav
						className="col-start-2 hidden items-center justify-center gap-1 justify-self-center lg:flex"
						aria-label="Main navigation"
					>
						<a href="/" className={linkClass}>
							{t("nav.home")}
						</a>
						<div className="relative">
							<button
								type="button"
								className={triggerClass}
								aria-haspopup="menu"
								aria-expanded={openMenu === "about"}
								onClick={() => toggleMenu("about")}
							>
								{t("nav.about")}
								<ChevronDownIcon />
							</button>
							{openMenu === "about" && (
								<div className="absolute left-0 top-full z-50 mt-3 rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:border-cyan-300/15 dark:bg-[#06172d]">
									<AboutPanel />
								</div>
							)}
						</div>
						<div className="relative">
							<button
								type="button"
								className={triggerClass}
								aria-haspopup="menu"
								aria-expanded={openMenu === "services"}
								onClick={() => toggleMenu("services")}
							>
								{t("nav.services")}
								<ChevronDownIcon />
							</button>
							{openMenu === "services" && (
								<div className="absolute left-1/2 top-full z-50 mt-3 w-[56rem] max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.18)] dark:border-cyan-300/15 dark:bg-[#06172d]">
									<ServicesMegaPanel />
								</div>
							)}
						</div>
						<a href="/knowledge" className={linkClass}>
							{t("nav.knowledge")}
						</a>
						<a href="/contact" className={linkClass}>
							{t("nav.contact")}
						</a>
					</nav>

					{/* Right controls */}
					<div className="col-start-3 flex shrink-0 items-center justify-end gap-2 justify-self-end">
						<LocaleSwitcher className="hidden sm:block" />
						<ThemeSwitcher theme={theme} setTheme={setTheme} className="hidden sm:block" />

						<a
							href={appUrl}
							className={cn(
								buttonVariants({ size: "sm" }),
								"hidden rounded-md bg-blue-600 px-4 text-sm text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] hover:bg-blue-500 lg:inline-flex xl:px-5"
							)}
						>
							{t("nav.freeCheckCta")}
						</a>

						{/* Hamburger — below lg */}
						<button
							type="button"
							onClick={() => setMobileOpen((v) => !v)}
							aria-label={t("nav.toggleMenu")}
							className="rounded-md p-1.5 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 lg:hidden"
						>
							{mobileOpen ? <CloseIcon /> : <MenuIcon />}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile drawer */}
			{mobileOpen && (
				<MobileDrawer
					appUrl={appUrl}
					theme={theme}
					setTheme={setTheme}
					onClose={() => setMobileOpen(false)}
				/>
			)}
		</header>
	);
}

// ---------------------------------------------------------------------------
// SiteNavBar — standalone island: wraps LocaleProvider + calls useTheme itself
// ---------------------------------------------------------------------------

function SiteNavBarInner({ appUrl }: { readonly appUrl: string }) {
	const { theme, setTheme, resolvedTheme } = useTheme();
	return (
		<SiteNav appUrl={appUrl} theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} />
	);
}

export function SiteNavBar({ appUrl }: { readonly appUrl: string }) {
	return (
		<LocaleProvider>
			<SiteNavBarInner appUrl={appUrl} />
		</LocaleProvider>
	);
}
