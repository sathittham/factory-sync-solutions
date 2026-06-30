"use client";

import { SiteNav } from "@/components/SiteNavBar";
import { SiteFooter, useTheme } from "@/components/site/chrome";
import { buttonVariants } from "@/components/ui/button";
import { LocaleProvider, useLocale } from "@/lib/i18n";
import { getServiceBody, isPlaceholderService } from "@/lib/serviceContent";
import {
	SERVICE_GROUPS,
	type ServiceGroup,
	type ServiceNode,
	childHref,
	getChildBySlug,
	getGroupBySlug,
	groupHref,
	subKey,
} from "@/lib/services";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="shrink-0"
			aria-hidden="true"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

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

function iconFor(groupId: string) {
	const common = {
		width: 22,
		height: 22,
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: 2,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
	};
	switch (groupId) {
		case "free-health-check":
			return (
				<svg {...common} aria-hidden="true">
					<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			);
		case "government-supported":
			return (
				<svg {...common} aria-hidden="true">
					<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6" />
				</svg>
			);
		case "engineering-consulting":
			return (
				<svg {...common} aria-hidden="true">
					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
				</svg>
			);
		default:
			return (
				<svg {...common} aria-hidden="true">
					<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z" />
				</svg>
			);
	}
}

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

interface Crumb {
	readonly label: string;
	readonly href?: string;
}

function Breadcrumb({ crumbs }: { readonly crumbs: readonly Crumb[] }) {
	return (
		<nav
			className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
			aria-label="Breadcrumb"
		>
			{crumbs.map((crumb, index) => (
				<span key={crumb.label} className="flex items-center gap-2">
					{index > 0 && <span aria-hidden="true">/</span>}
					{crumb.href ? (
						<a
							href={crumb.href}
							className="transition-colors hover:text-slate-900 dark:hover:text-white"
						>
							{crumb.label}
						</a>
					) : (
						<span className="text-slate-700 dark:text-slate-200">{crumb.label}</span>
					)}
				</span>
			))}
		</nav>
	);
}

function BottomCta({ href }: { readonly href: string }) {
	const { t } = useLocale();
	return (
		<section className="bg-white px-4 py-12 sm:px-6 dark:bg-[#041225]">
			<div className="mx-auto flex max-w-[1180px] flex-col items-start gap-5 rounded-md border border-blue-200 bg-[#06285a] px-6 py-8 text-white shadow-[0_0_34px_rgba(37,99,235,0.2)] sm:flex-row sm:items-center sm:justify-between dark:border-cyan-300/20">
				<div>
					<h2 className="text-2xl font-extrabold sm:text-3xl">{t("svc.ui.bottomCtaTitle")}</h2>
					<p className="mt-1 text-sm text-cyan-100">{t("svc.ui.bottomCtaSub")}</p>
				</div>
				<a
					href={href}
					className={cn(
						buttonVariants({ size: "lg" }),
						"shrink-0 bg-blue-600 px-10 text-base text-white shadow-[0_0_24px_rgba(37,99,235,0.45)] hover:bg-blue-500"
					)}
				>
					{t("svc.ui.bottomCtaBtn")}
				</a>
			</div>
		</section>
	);
}

/** Card linking to a service page (used by hub listings + related/sibling grids). */
function ServiceLinkCard({
	href,
	title,
	sub,
	groupId,
}: {
	readonly href: string;
	readonly title: string;
	readonly sub?: string;
	readonly groupId: string;
}) {
	return (
		<a
			href={href}
			className="group flex items-start justify-between gap-3 rounded-md border border-sky-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-cyan-300/15 dark:bg-[#071b33] dark:hover:border-cyan-300/35"
		>
			<span className="flex items-start gap-3">
				<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
					{iconFor(groupId)}
				</span>
				<span>
					<span className="block text-sm font-semibold text-slate-900 dark:text-white">
						{title}
					</span>
					{sub && (
						<span className="mt-0.5 block text-sm leading-snug text-slate-500 dark:text-slate-400">
							{sub}
						</span>
					)}
				</span>
			</span>
			<span className="mt-1 text-blue-600 transition-transform group-hover:translate-x-1 dark:text-cyan-300">
				<ArrowRightIcon />
			</span>
		</a>
	);
}

// ---------------------------------------------------------------------------
// Hero (shared by hub + detail)
// ---------------------------------------------------------------------------

function ServiceHero({
	group,
	title,
	tagline,
	crumbs,
	appUrl,
}: {
	readonly group: ServiceGroup;
	readonly title: string;
	readonly tagline: string;
	readonly crumbs: readonly Crumb[];
	readonly appUrl: string;
}) {
	const { t } = useLocale();
	const primaryHref = group.isFlagship ? appUrl : "/contact";
	const primaryLabel = group.isFlagship ? t("svc.ui.ctaPrimary") : t("svc.ui.ctaContact");

	return (
		<section className="relative overflow-hidden border-b border-slate-200 bg-sky-50 dark:border-cyan-300/10 dark:bg-[#041225]">
			<div className="relative mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-16">
				<Breadcrumb crumbs={crumbs} />
				<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_0_28px_rgba(37,99,235,0.4)]">
					{iconFor(group.id)}
				</div>
				<h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl dark:text-white">
					{title}
				</h1>
				<p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
					{tagline}
				</p>
				<div className="mt-7 flex flex-wrap gap-3">
					<a
						href={primaryHref}
						className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-600 px-7 font-semibold text-white shadow-[0_0_28px_rgba(37,99,235,0.5)] transition-colors hover:bg-blue-500"
					>
						{primaryLabel}
						<ArrowRightIcon />
					</a>
					<a
						href="/contact"
						className="inline-flex h-11 items-center gap-2 rounded-md border border-blue-200 bg-white/75 px-7 font-medium text-slate-900 transition-colors hover:bg-white dark:border-cyan-300/35 dark:bg-[#06172d]/45 dark:text-white dark:hover:bg-white/10"
					>
						{t("svc.ui.ctaConsult")}
					</a>
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Bodies
// ---------------------------------------------------------------------------

function HubBody({ group }: { readonly group: ServiceGroup }) {
	const { t } = useLocale();
	const children = group.children ?? [];
	return (
		<section className="bg-white py-12 dark:bg-[#041225]">
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
					{t("svc.ui.servicesInGroup")}
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{children.map((child) => (
						<ServiceLinkCard
							key={child.slug}
							href={childHref(group, child)}
							title={t(child.labelKey)}
							sub={t(subKey(child.labelKey))}
							groupId={group.id}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

function PlaceholderBody() {
	const { t } = useLocale();
	return (
		<section className="bg-white py-12 dark:bg-[#041225]">
			<div className="mx-auto max-w-[820px] px-4 sm:px-6">
				<div className="rounded-md border border-dashed border-sky-300 bg-sky-50 p-8 text-center dark:border-cyan-300/25 dark:bg-[#06172d]">
					<h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
						{t("svc.ui.comingSoonTitle")}
					</h2>
					<p className="mx-auto max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300">
						{t("svc.ui.comingSoonBody")}
					</p>
					<a
						href="/contact"
						className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-blue-600 px-7 font-semibold text-white transition-colors hover:bg-blue-500"
					>
						{t("svc.ui.ctaContact")}
						<ArrowRightIcon />
					</a>
				</div>
			</div>
		</section>
	);
}

function DetailBody({
	groupId,
	childSlug,
}: {
	readonly groupId: string;
	readonly childSlug?: string;
}) {
	const { locale, t } = useLocale();
	const body = getServiceBody(groupId, childSlug, locale);
	if (!body) return null;

	return (
		<>
			<section className="bg-white py-12 dark:bg-[#041225]">
				<div className="mx-auto max-w-[820px] px-4 sm:px-6">
					<h2 className="mb-3 text-2xl font-extrabold text-slate-950 dark:text-white">
						{t("svc.ui.overview")}
					</h2>
					<p className="text-base leading-relaxed text-slate-600 dark:text-slate-300">
						{body.overview}
					</p>
				</div>
			</section>

			<section className="border-y border-sky-200 bg-sky-50 py-12 dark:border-cyan-300/10 dark:bg-[#06172d]">
				<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
					<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
						{body.featuresTitle}
					</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{body.features.map((feature) => (
							<div
								key={feature}
								className="flex items-start gap-3 rounded-md border border-sky-200 bg-white p-4 shadow-xs dark:border-cyan-300/15 dark:bg-[#071b33]"
							>
								<span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600 dark:bg-cyan-300/10 dark:text-cyan-300">
									<CheckIcon />
								</span>
								<p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
									{feature}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<section className="bg-white py-12 dark:bg-[#041225]">
				<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
					<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
						{body.processTitle}
					</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{body.process.map((item, index) => (
							<div
								key={item.step}
								className="rounded-md border border-sky-200 bg-white p-5 shadow-xs dark:border-cyan-300/15 dark:bg-[#071b33]"
							>
								<div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
									{String(index + 1).padStart(2, "0")}
								</div>
								<h3 className="mb-1 font-bold text-slate-900 dark:text-white">{item.step}</h3>
								<p className="text-sm leading-relaxed text-slate-500 dark:text-slate-300">
									{item.detail}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>
		</>
	);
}

/** Sibling services (same hub) for a child page, or other top-level groups for a single page. */
function RelatedBody({
	group,
	child,
}: {
	readonly group: ServiceGroup;
	readonly child?: ServiceNode;
}) {
	const { t } = useLocale();
	const inGroup = Boolean(child);
	const heading = inGroup ? t("svc.ui.otherInGroup") : t("svc.ui.relatedServices");

	const cards = inGroup
		? (group.children ?? [])
				.filter((sibling) => sibling.slug !== child?.slug)
				.map((sibling) => ({
					key: sibling.slug,
					href: childHref(group, sibling),
					title: t(sibling.labelKey),
					sub: t(subKey(sibling.labelKey)),
					groupId: group.id,
				}))
		: SERVICE_GROUPS.filter((other) => other.id !== group.id).map((other) => ({
				key: other.id,
				href: groupHref(other),
				title: t(other.labelKey),
				sub: t(subKey(other.labelKey)),
				groupId: other.id,
			}));

	if (cards.length === 0) return null;

	return (
		<section className="border-t border-sky-200 bg-sky-50 py-12 dark:border-cyan-300/10 dark:bg-[#06172d]">
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">{heading}</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{cards.map((card) => (
						<ServiceLinkCard
							key={card.key}
							href={card.href}
							title={card.title}
							sub={card.sub}
							groupId={card.groupId}
						/>
					))}
				</div>
			</div>
		</section>
	);
}

// ---------------------------------------------------------------------------
// Inner + root
// ---------------------------------------------------------------------------

function ServiceInner({
	groupSlug,
	childSlug,
	appUrl,
	version,
}: {
	readonly groupSlug: string;
	readonly childSlug?: string;
	readonly appUrl: string;
	readonly version: string;
}) {
	const { t } = useLocale();
	const { theme, resolvedTheme, setTheme } = useTheme();

	const group = getGroupBySlug(groupSlug);
	const child = group && childSlug ? getChildBySlug(group, childSlug) : undefined;

	const shell = (inner: React.ReactNode) => (
		<div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-[#041225] dark:text-slate-100">
			<SiteNav appUrl={appUrl} theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} />
			<main className="flex-1">{inner}</main>
			<SiteFooter version={version} resolvedTheme={resolvedTheme} />
		</div>
	);

	// Static paths guarantee a valid group; guard defensively for type-narrowing.
	if (!group) return shell(null);

	const isHub = group.type === "hub" && !child;
	const labelKey = child ? child.labelKey : group.labelKey;
	const title = t(labelKey);
	const tagline = t(subKey(labelKey));
	const ctaHref = group.isFlagship ? appUrl : "/contact";

	const crumbs: Crumb[] = [{ label: t("nav.home"), href: "/" }];
	if (child) {
		crumbs.push({ label: t(group.labelKey), href: groupHref(group) });
		crumbs.push({ label: title });
	} else {
		crumbs.push({ label: title });
	}

	const isPlaceholder = !isHub && isPlaceholderService(group.id, child?.slug);

	let body: React.ReactNode;
	if (isHub) {
		body = <HubBody group={group} />;
	} else if (isPlaceholder) {
		body = <PlaceholderBody />;
	} else {
		body = <DetailBody groupId={group.id} childSlug={child?.slug} />;
	}

	return shell(
		<>
			<ServiceHero group={group} title={title} tagline={tagline} crumbs={crumbs} appUrl={appUrl} />
			{body}
			{!isHub && <RelatedBody group={group} child={child} />}
			<BottomCta href={ctaHref} />
		</>
	);
}

export interface ServiceContentProps {
	readonly groupSlug: string;
	readonly childSlug?: string;
	readonly appUrl: string;
	readonly version: string;
}

export function ServiceContent({ groupSlug, childSlug, appUrl, version }: ServiceContentProps) {
	return (
		<LocaleProvider>
			<ServiceInner groupSlug={groupSlug} childSlug={childSlug} appUrl={appUrl} version={version} />
		</LocaleProvider>
	);
}
