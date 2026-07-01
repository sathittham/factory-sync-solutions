"use client";

import { SiteShell } from "@/components/site/SiteShell";
import { getAppRegisterUrl } from "@/lib/appLinks";
import { BottomCtaSection } from "./sections/BottomCtaSection";
import { DimensionsSection } from "./sections/DimensionsSection";
import { ExpertSection } from "./sections/ExpertSection";
import { HeroSection } from "./sections/HeroSection";
import { ProcessSection } from "./sections/ProcessSection";
import { ResultsSection } from "./sections/ResultsSection";
import { ServicesSection } from "./sections/ServicesSection";
import { TrustBarSection } from "./sections/TrustBarSection";

// LandingBody — rendered inside SiteShell's LocaleProvider
function LandingBody({ appUrl }: { readonly appUrl: string }) {
	const registerUrl = getAppRegisterUrl(appUrl, { isDevelopment: import.meta.env.DEV });

	return (
		<>
			<HeroSection registerUrl={registerUrl} />
			<TrustBarSection />
			<DimensionsSection />
			<ExpertSection />
			<ServicesSection />
			<ProcessSection />
			<ResultsSection />
			<BottomCtaSection registerUrl={registerUrl} />
		</>
	);
}

export interface LandingContentProps {
	readonly appUrl: string;
	readonly version: string;
}

export function LandingContent({ appUrl, version }: LandingContentProps) {
	return (
		<SiteShell appUrl={appUrl} version={version}>
			<LandingBody appUrl={appUrl} />
		</SiteShell>
	);
}

// Re-export Locale type so consumers don't need a separate import
export type { Locale } from "@/lib/i18n";
