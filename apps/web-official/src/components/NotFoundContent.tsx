"use client";

import { PageHero } from "@/components/site/PageHero";
import { SiteShell } from "@/components/site/SiteShell";
import { buttonVariants } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// NotFoundBody — rendered inside SiteShell's LocaleProvider
function NotFoundBody() {
	const { t } = useLocale();

	return (
		<>
			<PageHero
				title={t("notFound.title")}
				subtitle={t("notFound.subtitle")}
				crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("notFound.title") }]}
			/>

			<section className="bg-white px-4 py-16 text-center sm:px-6 dark:bg-[#041225]">
				<a
					href="/"
					className={cn(
						buttonVariants({ size: "lg" }),
						"rounded-md bg-blue-600 px-8 text-base text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] hover:bg-blue-500"
					)}
				>
					{t("notFound.cta")}
				</a>
			</section>
		</>
	);
}

export interface NotFoundContentProps {
	readonly appUrl: string;
	readonly version: string;
}

export function NotFoundContent({ appUrl, version }: NotFoundContentProps) {
	return (
		<SiteShell appUrl={appUrl} version={version}>
			<NotFoundBody />
		</SiteShell>
	);
}
