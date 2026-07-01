"use client";

import { type Crumb, PageHero } from "@/components/site/PageHero";
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

function CheckBadgeIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="3"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

function ShieldCheckIcon() {
	return (
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
			<path d="m9 12 2 2 4-4" />
		</svg>
	);
}

function SparklesIcon() {
	return (
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M9.94 3.34a.5.5 0 0 1 .94 0l1.42 3.84a.5.5 0 0 0 .3.3l3.84 1.42a.5.5 0 0 1 0 .94l-3.84 1.42a.5.5 0 0 0-.3.3l-1.42 3.84a.5.5 0 0 1-.94 0l-1.42-3.84a.5.5 0 0 0-.3-.3L4.38 9.78a.5.5 0 0 1 0-.94l3.84-1.42a.5.5 0 0 0 .3-.3z" />
			<path d="M18 15.5 18.7 17.3 20.5 18 18.7 18.7 18 20.5 17.3 18.7 15.5 18 17.3 17.3z" />
		</svg>
	);
}

function AcademicCapIcon() {
	return (
		<svg
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M22 10 12 5 2 10l10 5 10-5Z" />
			<path d="M6 12v5c0 1 2.5 2.5 6 2.5s6-1.5 6-2.5v-5" />
		</svg>
	);
}

// ---------------------------------------------------------------------------
// Avatar — mockup monogram avatar (CSP-safe; swap for real photos when ready)
// ---------------------------------------------------------------------------

function Avatar({
	initials,
	gradient,
	licensed,
	licensedLabel,
}: {
	readonly initials: string;
	readonly gradient: string;
	readonly licensed: boolean;
	readonly licensedLabel: string;
}) {
	return (
		<div className="relative">
			<div
				className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-lg font-bold tracking-wide text-white shadow-md ring-4 ring-white dark:ring-[#06172d]`}
				aria-hidden="true"
			>
				{initials}
			</div>
			{licensed && (
				<span
					className="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-[#06172d]"
					title={licensedLabel}
				>
					<CheckBadgeIcon />
					<span className="sr-only">{licensedLabel}</span>
				</span>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------

/** Crumbs for an About sub-page: home / about / <label>. */
function aboutCrumbs(t: (key: string) => string, label: string): Crumb[] {
	return [
		{ label: t("nav.home"), href: "/" },
		{ label: t("nav.about"), href: "/about" },
		{ label },
	];
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
			<PageHero
				title={t("about.overview.title")}
				subtitle={t("about.overview.subtitle")}
				crumbs={[{ label: t("nav.home"), href: "/" }, { label: t("nav.about") }]}
			/>

			<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
				<div className="mx-auto max-w-[1180px]">
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

function CompanyBody({ appUrl }: { readonly appUrl: string }) {
	const { t } = useLocale();

	const values = [
		"about.company.values.integrity",
		"about.company.values.excellence",
		"about.company.values.impact",
		"about.company.values.accessibility",
	] as const;

	return (
		<>
			<PageHero
				title={t("about.company.title")}
				subtitle={t("about.company.subtitle")}
				crumbs={aboutCrumbs(t, t("about.company.link"))}
			/>

			<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
				<div className="mx-auto max-w-[1180px] space-y-10">
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

			{/* CTA */}
			<section className="border-t border-sky-200 bg-sky-50 px-4 py-12 sm:px-6 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto flex max-w-[1180px] flex-col items-start gap-5 rounded-xl border border-blue-200 bg-[#06285a] px-6 py-8 text-white shadow-[0_0_34px_rgba(37,99,235,0.2)] sm:flex-row sm:items-center sm:justify-between dark:border-cyan-300/20">
					<div>
						<h2 className="text-xl font-extrabold sm:text-2xl">{t("about.company.ctaTitle")}</h2>
						<p className="mt-1 text-sm text-cyan-100">{t("about.company.ctaBody")}</p>
					</div>
					<a
						href={appUrl}
						className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-500 px-7 py-3 text-base font-semibold text-white shadow-[0_0_24px_rgba(37,99,235,0.45)] transition-colors hover:bg-blue-400"
					>
						{t("about.company.ctaButton")}
						<ArrowRightIcon />
					</a>
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// TeamBody
// ---------------------------------------------------------------------------

const TEAM_MEMBERS = [
	{
		key: "m1",
		initials: "SW",
		gradient: "from-blue-500 to-cyan-400",
		licensed: true,
	},
	{
		key: "m2",
		initials: "PS",
		gradient: "from-cyan-500 to-teal-400",
		licensed: false,
	},
	{
		key: "m3",
		initials: "AB",
		gradient: "from-indigo-500 to-blue-400",
		licensed: true,
	},
	{
		key: "m4",
		initials: "KT",
		gradient: "from-sky-500 to-cyan-400",
		licensed: false,
	},
	{
		key: "m5",
		initials: "WR",
		gradient: "from-blue-600 to-indigo-400",
		licensed: false,
	},
	{
		key: "m6",
		initials: "SM",
		gradient: "from-teal-500 to-cyan-400",
		licensed: true,
	},
] as const;

function TeamBody({ appUrl }: { readonly appUrl: string }) {
	const { t } = useLocale();

	const expertise = [
		{
			titleKey: "about.team.engineerTitle",
			descKey: "about.team.engineerDesc",
			badge: t("landing.trust.eng"),
			icon: <ShieldCheckIcon />,
		},
		{
			titleKey: "about.team.consultantTitle",
			descKey: "about.team.consultantDesc",
			badge: t("landing.trust.consult"),
			icon: <SparklesIcon />,
		},
		{
			titleKey: "about.team.trainerTitle",
			descKey: "about.team.trainerDesc",
			badge: null,
			icon: <AcademicCapIcon />,
		},
	];

	const licensedLabel = t("about.team.licensedLabel");

	return (
		<>
			<PageHero
				title={t("about.team.title")}
				subtitle={t("about.team.subtitle")}
				crumbs={aboutCrumbs(t, t("about.team.link"))}
			/>

			<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
				<div className="mx-auto max-w-[1180px] space-y-14">
					{/* Trust points */}
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
								className="rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-cyan-300/15 dark:bg-[#06172d]"
							>
								<span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:bg-cyan-300/10 dark:text-cyan-300">
									<CheckBadgeIcon />
								</span>
								<p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">
									{t(main)}
								</p>
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t(sub)}</p>
							</div>
						))}
					</div>

					{/* Meet the specialists */}
					<div>
						<div className="mb-6 text-center">
							<h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
								{t("about.team.membersTitle")}
							</h2>
							<p className="mt-2 text-base text-slate-600 dark:text-slate-300">
								{t("about.team.membersSubtitle")}
							</p>
						</div>
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
							{TEAM_MEMBERS.map((member) => (
								<div
									key={member.key}
									className="flex flex-col items-center rounded-2xl border border-sky-200 bg-white p-5 text-center shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-cyan-300/15 dark:bg-[#06172d] dark:hover:border-cyan-300/40"
								>
									<Avatar
										initials={member.initials}
										gradient={member.gradient}
										licensed={member.licensed}
										licensedLabel={licensedLabel}
									/>
									<h3 className="mt-4 font-bold text-slate-900 dark:text-white">
										{t(`about.team.${member.key}.name`)}
									</h3>
									<p className="mt-0.5 text-sm font-medium text-blue-600 dark:text-cyan-300">
										{t(`about.team.${member.key}.role`)}
									</p>
									<span className="mt-3 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-cyan-300/20 dark:bg-[#041225] dark:text-slate-300">
										{t(`about.team.${member.key}.tag`)}
									</span>
								</div>
							))}
						</div>
					</div>

					{/* Areas of expertise */}
					<div>
						<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
							{t("about.team.expertiseTitle")}
						</h2>
						<div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
							{expertise.map((area) => (
								<div
									key={area.titleKey}
									className="flex flex-col rounded-xl border border-sky-200 bg-white p-6 shadow-xs dark:border-cyan-300/15 dark:bg-[#06172d]"
								>
									<span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-cyan-300/10 dark:text-cyan-300">
										{area.icon}
									</span>
									<h3 className="text-lg font-bold text-slate-900 dark:text-white">
										{t(area.titleKey)}
									</h3>
									{area.badge && (
										<p className="mt-0.5 text-sm font-semibold text-cyan-700 dark:text-cyan-300">
											{area.badge}
										</p>
									)}
									<p className="mt-2 text-base leading-relaxed text-slate-600 dark:text-slate-300">
										{t(area.descKey)}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="border-t border-sky-200 bg-sky-50 px-4 py-12 sm:px-6 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto flex max-w-[1180px] flex-col items-start gap-5 rounded-xl border border-blue-200 bg-[#06285a] px-6 py-8 text-white shadow-[0_0_34px_rgba(37,99,235,0.2)] sm:flex-row sm:items-center sm:justify-between dark:border-cyan-300/20">
					<div>
						<h2 className="text-xl font-extrabold sm:text-2xl">{t("about.team.ctaTitle")}</h2>
						<p className="mt-1 text-sm text-cyan-100">{t("about.team.ctaBody")}</p>
					</div>
					<a
						href={appUrl}
						className="inline-flex shrink-0 items-center gap-2 rounded-md bg-blue-500 px-7 py-3 text-base font-semibold text-white shadow-[0_0_24px_rgba(37,99,235,0.45)] transition-colors hover:bg-blue-400"
					>
						{t("about.team.ctaButton")}
						<ArrowRightIcon />
					</a>
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
			<PageHero
				title={t("about.caseStudies.title")}
				subtitle={t("about.caseStudies.subtitle")}
				crumbs={aboutCrumbs(t, t("about.caseStudies.link"))}
			/>

			<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
				<div className="mx-auto max-w-[1180px] space-y-10">
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
				<div className="mx-auto flex max-w-[1180px] flex-col items-start gap-5 rounded-xl border border-blue-200 bg-[#06285a] px-6 py-8 text-white shadow-[0_0_34px_rgba(37,99,235,0.2)] sm:flex-row sm:items-center sm:justify-between dark:border-cyan-300/20">
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
	if (page === "company") return <CompanyBody appUrl={appUrl} />;
	if (page === "team") return <TeamBody appUrl={appUrl} />;
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
