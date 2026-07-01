import { describe, expect, it } from "vitest";
import {
	KNOWLEDGE_CATEGORIES,
	KNOWLEDGE_CATEGORY_SLUGS,
	articleHref,
	categoryHref,
	categoryLabelKey,
	categoryParams,
	getCategoryBySlug,
	knowledgeHref,
} from "./knowledge";

describe("knowledge taxonomy", () => {
	it("defines the 8 Knowledge Hub categories from sitemap §5", () => {
		expect(KNOWLEDGE_CATEGORIES).toHaveLength(8);
		expect(KNOWLEDGE_CATEGORIES.map((c) => c.slug)).toEqual([
			"law-licensing",
			"factory-safety",
			"digital-factory",
			"machinery-automation",
			"environment",
			"lean-kaizen",
			"digital-marketing",
			"gov-benefits",
		]);
	});

	it("emits 8 category params for getStaticPaths", () => {
		expect(categoryParams()).toHaveLength(8);
	});

	it("exposes a slug set matching the categories", () => {
		expect(KNOWLEDGE_CATEGORY_SLUGS.size).toBe(8);
		expect(KNOWLEDGE_CATEGORY_SLUGS.has("factory-safety")).toBe(true);
		expect(KNOWLEDGE_CATEGORY_SLUGS.has("not-a-category")).toBe(false);
	});

	it("resolves a category by slug and falls back gracefully", () => {
		expect(getCategoryBySlug("environment")?.labelKey).toBe("knowledge.category.environment");
		expect(getCategoryBySlug("nope")).toBeUndefined();
		expect(categoryLabelKey("environment")).toBe("knowledge.category.environment");
		expect(categoryLabelKey("nope")).toBe("nope");
	});

	it("builds public hrefs", () => {
		expect(knowledgeHref()).toBe("/knowledge");
		expect(categoryHref("lean-kaizen")).toBe("/knowledge/category/lean-kaizen");
		expect(categoryHref(KNOWLEDGE_CATEGORIES[0])).toBe("/knowledge/category/law-licensing");
		expect(articleHref("my-post")).toBe("/knowledge/my-post");
	});

	it("keeps every category labelKey under the knowledge.category namespace", () => {
		for (const category of KNOWLEDGE_CATEGORIES) {
			expect(category.labelKey).toBe(`knowledge.category.${category.slug}`);
		}
	});
});
