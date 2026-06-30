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
