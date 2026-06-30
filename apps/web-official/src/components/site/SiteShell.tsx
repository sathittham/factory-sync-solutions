"use client";

import { SiteNav } from "@/components/SiteNavBar";
import { LocaleProvider } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { SiteFooter } from "./chrome";

// ---------------------------------------------------------------------------
// SiteShellInner — consumes useTheme(), renders chrome + children
// ---------------------------------------------------------------------------

function SiteShellInner({
	appUrl,
	version,
	children,
}: {
	readonly appUrl: string;
	readonly version: string;
	readonly children: React.ReactNode;
}) {
	const { theme, setTheme, resolvedTheme } = useTheme();

	return (
		<div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-[#041225] dark:text-slate-100">
			<SiteNav appUrl={appUrl} theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} />
			<main className="flex-1">{children}</main>
			<SiteFooter version={version} resolvedTheme={resolvedTheme} />
		</div>
	);
}

// ---------------------------------------------------------------------------
// SiteShell — public export; wraps LocaleProvider so children use useLocale()
// ---------------------------------------------------------------------------

export interface SiteShellProps {
	readonly appUrl: string;
	readonly version: string;
	readonly children: React.ReactNode;
}

export function SiteShell({ appUrl, version, children }: SiteShellProps) {
	return (
		<LocaleProvider>
			<SiteShellInner appUrl={appUrl} version={version}>
				{children}
			</SiteShellInner>
		</LocaleProvider>
	);
}
