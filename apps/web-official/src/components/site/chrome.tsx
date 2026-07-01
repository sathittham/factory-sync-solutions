"use client";

import { useLocale } from "@/lib/i18n";
import type { ResolvedTheme, Theme } from "@/lib/theme";
import fsDarkLogo from "@shared/brand/fs-dark.png";
import fsLightLogo from "@shared/brand/fs-light.png";
import { Fragment } from "react";

export type { Theme, ResolvedTheme };
export { useTheme } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

export function LogoIcon({ theme = "dark" }: { readonly theme?: "dark" | "light" }) {
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
// SiteFooter — shared footer used across the site
// ---------------------------------------------------------------------------

const FOOTER_SEP = <span className="text-slate-300 dark:text-slate-600">|</span>;

export function SiteFooter({
	version,
	resolvedTheme,
}: {
	readonly version: string;
	readonly resolvedTheme: ResolvedTheme;
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
							{t("footer.companyName")}
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
