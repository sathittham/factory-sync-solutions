import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { type ArticleCard, type ArticleDetailData, KnowledgeContent } from "./KnowledgeContent";

const APP_URL = "https://app.example.com";
const VERSION = "0.1.0-test";

// SiteNav → useTheme() reads window.matchMedia (jsdom doesn't implement it)
beforeAll(() => {
	vi.stubGlobal(
		"matchMedia",
		vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}))
	);
});

const SAMPLE: ArticleCard[] = [
	{
		slug: "safety-basics",
		title: "Safety Basics",
		category: "factory-safety",
		excerpt: "Stay safe on the floor.",
		publishedAt: "2026-06-01T00:00:00.000Z",
	},
];

function hrefs(container: HTMLElement): (string | null)[] {
	return Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
}

describe("KnowledgeContent — hub", () => {
	it("lists articles and links to all 8 category pages", () => {
		const { container, getByText } = render(
			<KnowledgeContent mode="hub" appUrl={APP_URL} version={VERSION} articles={SAMPLE} />
		);
		expect(getByText("Safety Basics")).toBeTruthy();
		const links = hrefs(container);
		expect(links).toContain("/knowledge/safety-basics");
		expect(links).toContain("/knowledge/category/law-licensing");
		expect(links).toContain("/knowledge/category/gov-benefits");
	});

	it("shows the empty state when there are no articles", () => {
		const { getByText } = render(
			<KnowledgeContent mode="hub" appUrl={APP_URL} version={VERSION} articles={[]} />
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
			/>
		);
		expect(getByText(/ยังไม่มีบทความในหมวดนี้/)).toBeTruthy();
	});
});

describe("KnowledgeContent — article", () => {
	it("renders pre-sanitized HTML content and a back link", () => {
		const article: ArticleDetailData = {
			slug: "safety-basics",
			title: "Safety Basics",
			category: "factory-safety",
			excerpt: "Stay safe.",
			publishedAt: "2026-06-01T00:00:00.000Z",
			author: "Aksorn",
			htmlContent: "<h2>Intro</h2><p>Wear PPE.</p>",
		};
		const { container, getByText } = render(
			<KnowledgeContent mode="article" appUrl={APP_URL} version={VERSION} article={article} />
		);
		expect(getByText("Wear PPE.")).toBeTruthy();
		expect(container.querySelector(".prose-knowledge h2")?.textContent).toBe("Intro");
		expect(hrefs(container)).toContain("/knowledge");
	});
});
