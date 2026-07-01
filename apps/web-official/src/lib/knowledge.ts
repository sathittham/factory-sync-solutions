// Knowledge Hub taxonomy — the single source of truth for the 8 article
// categories (Phase 4). Slugs MUST stay in sync with the web-cms `blog_post`
// collection's `category` enum (apps/web-cms/src/collections/blog-posts.collection.ts)
// and sitemap.md §5. Labels come from i18n (`knowledge.category.<slug>`).

export interface KnowledgeCategory {
	/** URL slug under /knowledge/category, e.g. "law-licensing". */
	readonly slug: string;
	/** i18n key for the localised label. */
	readonly labelKey: string;
}

export const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[] = [
	{ slug: "law-licensing", labelKey: "knowledge.category.law-licensing" },
	{ slug: "factory-safety", labelKey: "knowledge.category.factory-safety" },
	{ slug: "digital-factory", labelKey: "knowledge.category.digital-factory" },
	{ slug: "machinery-automation", labelKey: "knowledge.category.machinery-automation" },
	{ slug: "environment", labelKey: "knowledge.category.environment" },
	{ slug: "lean-kaizen", labelKey: "knowledge.category.lean-kaizen" },
	{ slug: "digital-marketing", labelKey: "knowledge.category.digital-marketing" },
	{ slug: "gov-benefits", labelKey: "knowledge.category.gov-benefits" },
] as const;

/** Set of valid category slugs — for O(1) membership checks on CMS data. */
export const KNOWLEDGE_CATEGORY_SLUGS: ReadonlySet<string> = new Set(
	KNOWLEDGE_CATEGORIES.map((category) => category.slug)
);

/** Public route for the Knowledge Hub listing. */
export function knowledgeHref(): string {
	return "/knowledge";
}

/** Public route for a category listing page. */
export function categoryHref(category: KnowledgeCategory | string): string {
	const slug = typeof category === "string" ? category : category.slug;
	return `/knowledge/category/${slug}`;
}

/** Public route for an article detail page. */
export function articleHref(slug: string): string {
	return `/knowledge/${slug}`;
}

/** Look up a category by its slug segment. */
export function getCategoryBySlug(slug: string): KnowledgeCategory | undefined {
	return KNOWLEDGE_CATEGORIES.find((category) => category.slug === slug);
}

/** `getStaticPaths` params for the 8 category pages (`/knowledge/category/<category>`). */
export function categoryParams(): ReadonlyArray<{ category: string }> {
	return KNOWLEDGE_CATEGORIES.map((category) => ({ category: category.slug }));
}

/** Derive the i18n label key for a category slug (falls back to the slug itself). */
export function categoryLabelKey(slug: string): string {
	return getCategoryBySlug(slug)?.labelKey ?? slug;
}
