// Service taxonomy — the single source of truth for the Services mega menu (Phase 1)
// and, in Phase 3, for getStaticPaths of the nested service hub/detail pages.
// See docs/product/official-site/sitemap.md §3 and the SDD §4.1.

export interface ServiceNode {
	/** Slug segment under the group, e.g. "digital-factory-layout-360". */
	readonly slug: string;
	/** i18n key for the localised label. */
	readonly labelKey: string;
}

export interface ServiceGroup {
	readonly id: string;
	/** "page" = single landing; "hub" = lists child detail pages. */
	readonly type: "page" | "hub";
	/** Slug segment under /services, e.g. "government-supported". */
	readonly slug: string;
	readonly labelKey: string;
	/** Flagship free health check — accent treatment + primary CTA. */
	readonly isFlagship?: boolean;
	readonly children?: readonly ServiceNode[];
}

export const SERVICE_GROUPS: readonly ServiceGroup[] = [
	{
		id: "free-health-check",
		type: "page",
		slug: "factory-health-check",
		labelKey: "svc.freeHealthCheck.title",
		isFlagship: true,
	},
	{
		id: "government-supported",
		type: "hub",
		slug: "government-supported",
		labelKey: "svc.govSupported.title",
		children: [
			{ slug: "digital-factory-layout-360", labelKey: "svc.digitalFactory360.title" },
			{ slug: "smart-preventive-maintenance", labelKey: "svc.smartPreventiveMaintenance.title" },
			{ slug: "shindan-lean-kaizen", labelKey: "svc.shindanLeanKaizen.title" },
			{ slug: "online-marketing-smart-ops", labelKey: "svc.onlineMarketingSmartOps.title" },
			{ slug: "in-house-training", labelKey: "svc.inHouseTraining.title" },
		],
	},
	{
		id: "engineering-consulting",
		type: "page",
		slug: "engineering-consulting",
		labelKey: "svc.engConsulting.title",
	},
	{
		id: "engineering-design",
		type: "hub",
		slug: "engineering-design",
		labelKey: "svc.engDesign.title",
		children: [
			{ slug: "factory-license", labelKey: "svc.factoryLicense.title" },
			{ slug: "machine-automation-design", labelKey: "svc.machineAutomationDesign.title" },
			{ slug: "engineering-consulting", labelKey: "svc.engConsultingProject.title" },
			{ slug: "construction-permits", labelKey: "svc.constructionPermits.title" },
			{ slug: "special-systems", labelKey: "svc.specialSystems.title" },
			{ slug: "environmental-systems", labelKey: "svc.environmentalSystems.title" },
			{ slug: "machine-registration", labelKey: "svc.machineRegistration.title" },
			{ slug: "certifications", labelKey: "svc.certifications.title" },
		],
	},
] as const;

/** Build the public route for a group landing/hub page. */
export function groupHref(group: ServiceGroup): string {
	return `/services/${group.slug}`;
}

/** Build the public route for a child detail page nested under its group. */
export function childHref(group: ServiceGroup, child: ServiceNode): string {
	return `/services/${group.slug}/${child.slug}`;
}

/** Derive the i18n subtitle key from a `*.title` label key (`svc.x.title` → `svc.x.sub`). */
export function subKey(labelKey: string): string {
	return labelKey.replace(/\.title$/, ".sub");
}

/** Look up a group by its slug segment. */
export function getGroupBySlug(slug: string): ServiceGroup | undefined {
	return SERVICE_GROUPS.find((group) => group.slug === slug);
}

/** Look up a child node within a group by its slug segment. */
export function getChildBySlug(group: ServiceGroup, childSlug: string): ServiceNode | undefined {
	return group.children?.find((child) => child.slug === childSlug);
}

/** `getStaticPaths` params for the 4 group root pages (`/services/<group>`). */
export function groupParams(): ReadonlyArray<{ group: string }> {
	return SERVICE_GROUPS.map((group) => ({ group: group.slug }));
}

/** `getStaticPaths` params for the 13 nested child pages (`/services/<group>/<slug>`). */
export function childParams(): ReadonlyArray<{ group: string; slug: string }> {
	return SERVICE_GROUPS.flatMap((group) =>
		(group.children ?? []).map((child) => ({ group: group.slug, slug: child.slug }))
	);
}
