import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	type ArticleCard,
	type ArticleDetailData,
	KnowledgeContent,
	type KnowledgeFacets,
} from "./KnowledgeContent";

// window.matchMedia is stubbed globally in src/test/setup.ts.

const APP_URL = "https://app.example.com";
const VERSION = "0.1.0-test";

const SAMPLE: ArticleCard[] = [
	{
		slug: "safety-basics",
		title: "Safety Basics",
		category: "factory-safety",
		excerpt: "Stay safe on the floor.",
		featuredImage: "https://img.example.com/safety.jpg",
		tags: ["PPE", "Checklist"],
		isPinned: false,
		readingMinutes: 3,
		publishedAt: "2026-06-01T00:00:00.000Z",
	},
];

const FACETS: KnowledgeFacets = {
	total: 1,
	categoryCounts: { "factory-safety": 1, "law-licensing": 2, "gov-benefits": 1 },
	tags: [
		{ tag: "PPE", count: 3 },
		{ tag: "SME", count: 1 },
	],
};

function hrefs(container: HTMLElement): (string | null)[] {
	return Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
}

describe("KnowledgeContent — hub", () => {
	it("lists articles and links to the categories that have posts", () => {
		const { container, getByText } = render(
			<KnowledgeContent
				mode="hub"
				appUrl={APP_URL}
				version={VERSION}
				articles={SAMPLE}
				facets={FACETS}
			/>
		);
		expect(getByText("Safety Basics")).toBeTruthy();
		const links = hrefs(container);
		expect(links).toContain("/knowledge/safety-basics");
		expect(links).toContain("/knowledge/category/law-licensing");
		expect(links).toContain("/knowledge/category/gov-benefits");
	});

	it("renders the sidebar category counts and popular tags", () => {
		const { getByText, getAllByText } = render(
			<KnowledgeContent
				mode="hub"
				appUrl={APP_URL}
				version={VERSION}
				articles={SAMPLE}
				facets={FACETS}
			/>
		);
		// Category count badges render (total + per-category all show "1" here).
		expect(getAllByText("1").length).toBeGreaterThanOrEqual(2);
		// Sidebar "law-licensing" has a count of 2.
		expect(getByText("2")).toBeTruthy();
		// Tag cloud renders the most frequent tags (with a "#").
		expect(getAllByText("#PPE").length).toBeGreaterThan(0);
		expect(getByText("#SME")).toBeTruthy();
	});

	it("promotes a pinned article into the featured hero with a badge and cover image", () => {
		const pinned: ArticleCard = { ...SAMPLE[0], slug: "pinned-post", isPinned: true };
		const { getByText, container } = render(
			<KnowledgeContent
				mode="hub"
				appUrl={APP_URL}
				version={VERSION}
				articles={[pinned, ...SAMPLE]}
				facets={FACETS}
			/>
		);
		// Default locale is Thai → pinned badge label.
		expect(getByText("ปักหมุด")).toBeTruthy();
		const imgs = Array.from(container.querySelectorAll("img")).map((i) => i.getAttribute("src"));
		expect(imgs).toContain("https://img.example.com/safety.jpg");
	});

	it("shows the empty state when there are no articles", () => {
		const { getByText } = render(
			<KnowledgeContent
				mode="hub"
				appUrl={APP_URL}
				version={VERSION}
				articles={[]}
				facets={{ total: 0, categoryCounts: {}, tags: [] }}
			/>
		);
		// Default locale is Thai.
		expect(getByText(/ยังไม่มีบทความเผยแพร่/)).toBeTruthy();
	});
});

describe("KnowledgeContent — category", () => {
	it("marks the active category and renders its articles", () => {
		const { container, getByText } = render(
			<KnowledgeContent
				mode="category"
				appUrl={APP_URL}
				version={VERSION}
				categorySlug="factory-safety"
				articles={SAMPLE}
				facets={FACETS}
			/>
		);
		expect(getByText("Safety Basics")).toBeTruthy();
		const active = container.querySelector('[aria-current="page"]');
		expect(active?.getAttribute("href")).toBe("/knowledge/category/factory-safety");
	});

	it("shows the category empty state with no articles", () => {
		const { getByText } = render(
			<KnowledgeContent
				mode="category"
				appUrl={APP_URL}
				version={VERSION}
				categorySlug="environment"
				articles={[]}
				facets={FACETS}
			/>
		);
		expect(getByText(/ยังไม่มีบทความในหมวดนี้/)).toBeTruthy();
	});
});

describe("KnowledgeContent — article", () => {
	it("renders pre-sanitized HTML content, cover image, and a back link", () => {
		const article: ArticleDetailData = {
			slug: "safety-basics",
			title: "Safety Basics",
			category: "factory-safety",
			excerpt: "Stay safe.",
			featuredImage: "https://img.example.com/safety.jpg",
			tags: ["PPE"],
			isPinned: false,
			readingMinutes: 4,
			publishedAt: "2026-06-01T00:00:00.000Z",
			author: "Aksorn",
			htmlContent: "<h2>Intro</h2><p>Wear PPE.</p>",
		};
		const { container, getByText, getByAltText } = render(
			<KnowledgeContent mode="article" appUrl={APP_URL} version={VERSION} article={article} />
		);
		expect(getByText("Wear PPE.")).toBeTruthy();
		expect(container.querySelector(".prose-knowledge h2")?.textContent).toBe("Intro");
		expect(getByAltText("Safety Basics")).toBeTruthy();
		// Reading time renders (Thai default → "นาที").
		expect(getByText(/นาที/)).toBeTruthy();
		expect(hrefs(container)).toContain("/knowledge");
	});
});
