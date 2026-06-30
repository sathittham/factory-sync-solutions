"use client";

import { getAppRegisterUrl } from "@/lib/appLinks";
import { LocaleProvider } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { NavBar } from "./NavBar";
import { BottomCtaSection } from "./sections/BottomCtaSection";
import { DimensionsSection } from "./sections/DimensionsSection";
import { ExpertSection } from "./sections/ExpertSection";
import { Footer } from "./sections/Footer";
import { HeroSection } from "./sections/HeroSection";
import { ProcessSection } from "./sections/ProcessSection";
import { ResultsSection } from "./sections/ResultsSection";
import { ServicesSection } from "./sections/ServicesSection";
import { TrustBarSection } from "./sections/TrustBarSection";

function LandingInner({ appUrl, version }: { readonly appUrl: string; readonly version: string }) {
	const { theme, resolvedTheme, setTheme } = useTheme();
	const registerUrl = getAppRegisterUrl(appUrl, { isDevelopment: import.meta.env.DEV });

	return (
		<div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-[#041225] dark:text-slate-100">
			<NavBar
				appUrl={appUrl}
				registerUrl={registerUrl}
				theme={theme}
				setTheme={setTheme}
				resolvedTheme={resolvedTheme}
			/>
			<main className="flex-1">
				<HeroSection registerUrl={registerUrl} />
				<TrustBarSection />
				<DimensionsSection />
				<ExpertSection />
				<ServicesSection />
				<ProcessSection />
				<ResultsSection />
				<BottomCtaSection registerUrl={registerUrl} />
			</main>
			<Footer version={version} resolvedTheme={resolvedTheme} />
		</div>
	);
}

export interface LandingContentProps {
	readonly appUrl: string;
	readonly version: string;
}

export function LandingContent({ appUrl, version }: LandingContentProps) {
	return (
		<LocaleProvider>
			<LandingInner appUrl={appUrl} version={version} />
		</LocaleProvider>
	);
}

// Re-export Locale type so consumers don't need a separate import
export type { Locale } from "@/lib/i18n";
