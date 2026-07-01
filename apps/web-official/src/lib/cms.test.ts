import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetCmsCache, getArticles, getCmsBaseUrl } from "./cms";

function mockFetchOnce(payload: unknown, ok = true, status = 200) {
	const fetchMock = vi.fn().mockResolvedValue({
		ok,
		status,
		json: async () => payload,
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

afterEach(() => {
	__resetCmsCache();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("getCmsBaseUrl", () => {
	it("trims whitespace and trailing slashes", () => {
		vi.stubEnv("PUBLIC_CMS_URL", "  https://cms.test/  ");
		expect(getCmsBaseUrl()).toBe("https://cms.test");
	});

	it("returns empty string when unset", () => {
		vi.stubEnv("PUBLIC_CMS_URL", "");
		expect(getCmsBaseUrl()).toBe("");
	});
});

describe("getArticles — graceful fallback (build must never fail)", () => {
	it("returns [] and does not fetch when PUBLIC_CMS_URL is unset", async () => {
		vi.stubEnv("PUBLIC_CMS_URL", "");
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		await expect(getArticles()).resolves.toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns [] when the CMS fetch rejects (unreachable)", async () => {
		vi.stubEnv("PUBLIC_CMS_URL", "https://cms.test");
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
		await expect(getArticles()).resolves.toEqual([]);
	});

	it("returns [] on a non-200 response", async () => {
		vi.stubEnv("PUBLIC_CMS_URL", "https://cms.test");
		mockFetchOnce({}, false, 503);
		await expect(getArticles()).resolves.toEqual([]);
	});
});

describe("getArticles — normalization", () => {
	it("keeps published posts, drops drafts, and sanitizes unknown categories", async () => {
		vi.stubEnv("PUBLIC_CMS_URL", "https://cms.test");
		mockFetchOnce({
			data: [
				{
					id: "1",
					slug: "safety-basics",
					title: "Safety Basics",
					category: "factory-safety",
					excerpt: "Stay safe",
					content: JSON.stringify({
						root: { children: [{ type: "paragraph", children: [{ type: "text", text: "Body" }] }] },
					}),
					author: "Aksorn",
					status: "published",
					publishedAt: "2026-06-01T00:00:00.000Z",
				},
				{
					id: "2",
					slug: "draft-post",
					title: "Draft",
					category: "factory-safety",
					content: "x",
					status: "draft",
				},
				{
					id: "3",
					slug: "weird-category",
					title: "Weird",
					category: "not-real",
					content: "x",
					status: "published",
				},
			],
			pagination: { page: 1, pages: 1 },
		});

		const articles = await getArticles();
		// Dated article sorts ahead of the undated one (newest first).
		expect(articles.map((a) => a.slug)).toEqual(["safety-basics", "weird-category"]);
		const published = articles.find((a) => a.slug === "safety-basics");
		expect(published?.category).toBe("factory-safety");
		expect(published?.excerpt).toBe("Stay safe");
		expect(published?.publishedAt).toBe("2026-06-01T00:00:00.000Z");
		// Unknown category is blanked, not dropped.
		expect(articles.find((a) => a.slug === "weird-category")?.category).toBe("");
	});

	it("reads fields nested under a `data` envelope", async () => {
		vi.stubEnv("PUBLIC_CMS_URL", "https://cms.test");
		mockFetchOnce({
			data: [
				{
					id: "10",
					status: "published",
					data: { slug: "nested", title: "Nested", category: "environment", content: "hello" },
				},
			],
			pagination: { pages: 1 },
		});
		const articles = await getArticles();
		expect(articles).toHaveLength(1);
		expect(articles[0]).toMatchObject({ slug: "nested", title: "Nested", category: "environment" });
	});

	it("derives an excerpt from Lexical content when none is provided", async () => {
		vi.stubEnv("PUBLIC_CMS_URL", "https://cms.test");
		mockFetchOnce({
			data: [
				{
					slug: "no-excerpt",
					title: "No Excerpt",
					category: "lean-kaizen",
					status: "published",
					content: JSON.stringify({
						root: {
							children: [
								{ type: "paragraph", children: [{ type: "text", text: "Derived summary text." }] },
							],
						},
					}),
				},
			],
			pagination: { pages: 1 },
		});
		const [article] = await getArticles();
		expect(article.excerpt).toBe("Derived summary text.");
	});
});
