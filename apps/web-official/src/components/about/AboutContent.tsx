"use client";

import { SiteShell } from "@/components/site/SiteShell";
import { useLocale } from "@/lib/i18n";

export type AboutPage = "overview" | "company" | "team" | "case-studies";

// ---------------------------------------------------------------------------
// Shared sub-page icons
// ---------------------------------------------------------------------------

function ArrowRightIcon() {
	return (
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
	);
}

function BuildingIcon() {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="3" y="3" width="18" height="18" rx="2" />
			<path d="M9 9h1M14 9h1M9 14h1M14 14h1M9 19h6" />
		</svg>
	);
}

function UsersIcon() {
	return (
		<svg
			width="24"
			height="24"
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
	);
}

function TrophyIcon() {
	return (
		<svg
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
			<path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
			<path d="M4 22h16" />
			<path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
			<path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
			<path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
		</svg>
	);
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

function Breadcrumb({ label }: { readonly label: string }) {
	const { t } = useLocale();
	return (
		<nav
			className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
			aria-label="Breadcrumb"
		>
			<a href="/" className="transition-colors hover:text-slate-900 dark:hover:text-white">
				{t("nav.home")}
			</a>
			<span aria-hidden="true">/</span>
			<a href="/about" className="transition-colors hover:text-slate-900 dark:hover:text-white">
				{t("nav.about")}
			</a>
			{label && (
				<>
					<span aria-hidden="true">/</span>
					<span className="text-slate-700 dark:text-slate-200">{label}</span>
				</>
			)}
		</nav>
	);
}

// ---------------------------------------------------------------------------
// OverviewBody
// ---------------------------------------------------------------------------

function OverviewBody() {
	const { t } = useLocale();

	const subPages = [
		{ href: "/about/company", labelKey: "about.company.link", icon: <BuildingIcon /> },
		{ href: "/about/team", labelKey: "about.team.link", icon: <UsersIcon /> },
		{ href: "/about/case-studies", labelKey: "about.caseStudies.link", icon: <TrophyIcon /> },
	];

	return (
		<>
			<section className="border-b border-slate-200 bg-sky-50 px-4 py-14 sm:px-6 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto max-w-3xl text-center">
					<h1 className="text-3xl font-extrabold text-slate-950 sm:text-4xl dark:text-white">
						{t("about.overview.title")}
					</h1>
					<p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
						{t("about.overview.subtitle")}
					</p>
				</div>
			</section>

			<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
				<div className="mx-auto max-w-3xl">
					<p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
						{t("about.overview.intro")}
					</p>

					<div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
						{subPages.map((page) => (
							<a
								key={page.href}
								href={page.href}
								className="group flex flex-col gap-4 rounded-xl border border-sky-200 bg-white p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-cyan-300/15 dark:bg-[#06172d] dark:hover:border-cyan-300/40"
							>
								<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-cyan-300/10 dark:text-cyan-300">
									{page.icon}
								</div>
								<span className="font-semibold text-slate-900 dark:text-white">
									{t(page.labelKey)}
								</span>
								<span className="mt-auto flex items-center gap-1 text-sm font-medium text-blue-600 transition-transform group-hover:translate-x-1 dark:text-cyan-300">
									{t("nav.viewAll")}
									<ArrowRightIcon />
								</span>
							</a>
						))}
					</div>
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// CompanyBody
// ---------------------------------------------------------------------------

function CompanyBody() {
	const { t } = useLocale();

	const values = [
		"about.company.values.integrity",
		"about.company.values.excellence",
		"about.company.values.impact",
		"about.company.values.accessibility",
	] as const;

	return (
		<>
			<section className="border-b border-slate-200 bg-sky-50 px-4 py-14 sm:px-6 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto max-w-3xl">
					<Breadcrumb label={t("about.company.link")} />
					<h1 className="text-3xl font-extrabold text-slate-950 sm:text-4xl dark:text-white">
						{t("about.company.title")}
					</h1>
					<p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
						{t("about.company.subtitle")}
					</p>
				</div>
			</section>

			<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
				<div className="mx-auto max-w-3xl space-y-10">
					<div>
						<h2 className="text-xl font-bold text-slate-950 dark:text-white">
							{t("about.company.historyTitle")}
						</h2>
						<p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
							{t("about.company.historyBody")}
						</p>
					</div>

					<div>
						<h2 className="text-xl font-bold text-slate-950 dark:text-white">
							{t("about.company.visionTitle")}
						</h2>
						<p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
							{t("about.company.visionBody")}
						</p>
					</div>

					<div>
						<h2 className="text-xl font-bold text-slate-950 dark:text-white">
							{t("about.company.missionTitle")}
						</h2>
						<p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">
							{t("about.company.missionBody")}
						</p>
					</div>

					<div>
						<h2 className="text-xl font-bold text-slate-950 dark:text-white">
							{t("about.company.valuesTitle")}
						</h2>
						<ul className="mt-3 space-y-2">
							{values.map((key) => (
								<li
									key={key}
									className="flex items-center gap-3 text-base text-slate-700 dark:text-slate-300"
								>
									<span className="flex h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600 dark:bg-cyan-300" />
									{t(key)}
								</li>
							))}
						</ul>
					</div>
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// TeamBody
// ---------------------------------------------------------------------------

function TeamBody() {
	const { t } = useLocale();

	const roles = [
		{
			titleKey: "about.team.engineerTitle",
			descKey: "about.team.engineerDesc",
			badge: t("landing.trust.eng"),
			accent: "bg-blue-600",
		},
		{
			titleKey: "about.team.consultantTitle",
			descKey: "about.team.consultantDesc",
			badge: t("landing.trust.consult"),
			accent: "bg-cyan-600",
		},
		{
			titleKey: "about.team.trainerTitle",
			descKey: "about.team.trainerDesc",
			badge: null,
			accent: "bg-slate-600",
		},
	];

	return (
		<>
			<section className="border-b border-slate-200 bg-sky-50 px-4 py-14 sm:px-6 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto max-w-3xl">
					<Breadcrumb label={t("about.team.link")} />
					<h1 className="text-3xl font-extrabold text-slate-950 sm:text-4xl dark:text-white">
						{t("about.team.title")}
					</h1>
					<p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
						{t("about.team.subtitle")}
					</p>
				</div>
			</section>

			<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
				<div className="mx-auto max-w-3xl">
					{/* Trust stats */}
					<div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
						{(
							[
								["landing.trust.exp", "landing.trust.expSub"],
								["landing.trust.consult", "landing.trust.consultSub"],
								["landing.trust.eng", "landing.trust.engSub"],
								["landing.trust.std", "landing.trust.stdSub"],
							] as const
						).map(([main, sub]) => (
							<div
								key={main}
								className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-center dark:border-cyan-300/15 dark:bg-[#06172d]"
							>
								<p className="text-sm font-bold text-slate-900 dark:text-white">{t(main)}</p>
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(sub)}</p>
							</div>
						))}
					</div>

					{/* Role cards */}
					<div className="space-y-5">
						{roles.map((role) => (
							<div
								key={role.titleKey}
								className="rounded-xl border border-sky-200 bg-white p-6 shadow-xs dark:border-cyan-300/15 dark:bg-[#06172d]"
							>
								<div className="flex items-start gap-4">
									<span
										className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${role.accent} text-xs font-bold text-white`}
									>
										{t(role.titleKey).slice(0, 2)}
									</span>
									<div>
										<h2 className="text-lg font-bold text-slate-900 dark:text-white">
											{t(role.titleKey)}
										</h2>
										{role.badge && (
											<p className="mt-0.5 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
												{role.badge}
											</p>
										)}
										<p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-slate-300">
											{t(role.descKey)}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// CaseStudiesBody
// ---------------------------------------------------------------------------

const INDUSTRIES = [
	"industry.manufacturing",
	"industry.food",
	"industry.automotive",
	"industry.electronics",
	"industry.chemical",
	"industry.construction",
	"industry.logistics",
	"industry.metal",
] as const;

function CaseStudiesBody({ appUrl }: { readonly appUrl: string }) {
	const { t } = useLocale();

	const stats = [
		{ valueKey: "about.caseStudies.stat1.value", labelKey: "about.caseStudies.stat1.label" },
		{ valueKey: "about.caseStudies.stat2.value", labelKey: "about.caseStudies.stat2.label" },
		{ valueKey: "about.caseStudies.stat3.value", labelKey: "about.caseStudies.stat3.label" },
		{ valueKey: "about.caseStudies.stat4.value", labelKey: "about.caseStudies.stat4.label" },
	] as const;

	return (
		<>
			<section className="border-b border-slate-200 bg-sky-50 px-4 py-14 sm:px-6 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto max-w-3xl">
					<Breadcrumb label={t("about.caseStudies.link")} />
					<h1 className="text-3xl font-extrabold text-slate-950 sm:text-4xl dark:text-white">
						{t("about.caseStudies.title")}
					</h1>
					<p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
						{t("about.caseStudies.subtitle")}
					</p>
				</div>
			</section>

			<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
				<div className="mx-auto max-w-3xl space-y-10">
					{/* Stats */}
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						{stats.map((stat) => (
							<div
								key={stat.valueKey}
								className="flex flex-col items-center rounded-xl border border-sky-200 bg-sky-50 py-6 dark:border-cyan-300/15 dark:bg-[#06172d]"
							>
								<span className="text-3xl font-extrabold text-blue-600 dark:text-cyan-300">
									{t(stat.valueKey)}
								</span>
								<span className="mt-1 text-center text-sm text-slate-600 dark:text-slate-400">
									{t(stat.labelKey)}
								</span>
							</div>
						))}
					</div>

					{/* Industries */}
					<div>
						<h2 className="mb-4 text-xl font-bold text-slate-950 dark:text-white">
							{t("about.caseStudies.industriesTitle")}
						</h2>
						<div className="flex flex-wrap gap-2">
							{INDUSTRIES.map((key) => (
								<span
									key={key}
									className="rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-sm font-medium text-slate-700 dark:border-cyan-300/20 dark:bg-[#06172d] dark:text-slate-300"
								>
									{t(key)}
								</span>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="border-t border-sky-200 bg-sky-50 px-4 py-12 sm:px-6 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto flex max-w-3xl flex-col items-start gap-5 rounded-xl border border-blue-200 bg-[#06285a] px-6 py-8 text-white shadow-[0_0_34px_rgba(37,99,235,0.2)] sm:flex-row sm:items-center sm:justify-between dark:border-cyan-300/20">
					<div>
						<h2 className="text-xl font-extrabold sm:text-2xl">
							{t("about.caseStudies.ctaTitle")}
						</h2>
						<p className="mt-1 text-sm text-cyan-100">{t("about.caseStudies.ctaBody")}</p>
					</div>
					<a
						href={appUrl}
						className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-500 px-7 py-3 text-base font-semibold text-white shadow-[0_0_24px_rgba(37,99,235,0.45)] transition-colors hover:bg-blue-400"
					>
						{t("about.caseStudies.ctaButton")}
						<ArrowRightIcon />
					</a>
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// AboutBody — dispatches to the correct sub-page body
// ---------------------------------------------------------------------------

function AboutBody({
	page,
	appUrl,
}: {
	readonly page: AboutPage;
	readonly appUrl: string;
}) {
	if (page === "company") return <CompanyBody />;
	if (page === "team") return <TeamBody />;
	if (page === "case-studies") return <CaseStudiesBody appUrl={appUrl} />;
	return <OverviewBody />;
}

// ---------------------------------------------------------------------------
// AboutContent — public island export
// ---------------------------------------------------------------------------

export interface AboutContentProps {
	readonly page: AboutPage;
	readonly appUrl: string;
	readonly version: string;
}

export function AboutContent({ page, appUrl, version }: AboutContentProps) {
	return (
		<SiteShell appUrl={appUrl} version={version}>
			<AboutBody page={page} appUrl={appUrl} />
		</SiteShell>
	);
}
