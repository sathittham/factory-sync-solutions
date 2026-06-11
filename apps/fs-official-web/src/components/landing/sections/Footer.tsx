"use client";

import { useLocale } from "@/lib/i18n";
import type { ResolvedTheme } from "@/lib/theme";
import fsDarkLogo from "@shared/brand/fs-dark.png";
import fsLightLogo from "@shared/brand/fs-light.png";
import { Fragment } from "react";

// ---------------------------------------------------------------------------
// LogoIcon (local copy — Footer needs it independently of NavBar)
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

const SEP = <span className="text-slate-300 dark:text-slate-600">|</span>;

export function Footer({
	version,
	resolvedTheme,
}: { version: string; resolvedTheme: ResolvedTheme }) {
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
							{t("footer.companyName")}
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
