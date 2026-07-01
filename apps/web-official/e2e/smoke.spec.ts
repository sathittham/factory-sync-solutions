import { expect, test } from "@playwright/test";

// Site-wide smoke: every route family must build, serve 200, and render the
// shared chrome (header + footer). A broken build of any page fails the deploy
// gate instead of shipping green.

// Static routes — always present in the build.
const STATIC_ROUTES = [
	{ path: "/", name: "landing" },
	{ path: "/about", name: "about hub" },
	{ path: "/about/company", name: "about — company" },
	{ path: "/about/team", name: "about — team" },
	{ path: "/about/case-studies", name: "about — case studies" },
	{ path: "/contact", name: "contact" },
	{ path: "/knowledge", name: "knowledge hub" },
	{ path: "/terms", name: "legal — terms" },
	{ path: "/privacy", name: "legal — privacy" },
	{ path: "/cookies", name: "legal — cookies" },
	{ path: "/marketing", name: "legal — marketing" },
	{ path: "/cookie-settings", name: "legal — cookie settings" },
];

// Config-driven service routes (slugs from src/lib/services.ts — stable).
const SERVICE_ROUTES = [
	{ path: "/services/factory-health-check", name: "services — flagship" },
	{ path: "/services/government-supported", name: "services — group hub" },
	{
		path: "/services/government-supported/digital-factory-layout-360",
		name: "services — child detail",
	},
	{ path: "/services/engineering-design/factory-license", name: "services — child detail (2)" },
];

test.describe("Smoke — routes serve 200 with header + footer", () => {
	for (const { path, name } of [...STATIC_ROUTES, ...SERVICE_ROUTES]) {
		test(`${name} (${path})`, async ({ page }) => {
			const res = await page.goto(path);
			expect(res?.status(), `${path} should return 200`).toBe(200);
			await expect(page.locator("header").first()).toBeVisible();
			await expect(page.locator("footer").first()).toBeVisible();
		});
	}
});

// Knowledge dynamic routes are CMS-seeded, so we derive real URLs from the hub
// rather than hardcoding slugs that differ per environment. Skips gracefully
// when no content is seeded (e.g. a local build with no CMS data).
test.describe("Smoke — knowledge dynamic routes", () => {
	test("an article, a category, and a tag page each load with chrome", async ({ page }) => {
		await page.goto("/knowledge");

		const hrefs = (
			await page
				.locator("a[href^='/knowledge/']")
				.evaluateAll((els) => els.map((el) => el.getAttribute("href")))
		).filter((h): h is string => Boolean(h));

		const article = hrefs.find(
			(h) =>
				h !== "/knowledge/" &&
				!h.startsWith("/knowledge/category/") &&
				!h.startsWith("/knowledge/tag/")
		);
		const category = hrefs.find((h) => h.startsWith("/knowledge/category/"));
		const tag = hrefs.find((h) => h.startsWith("/knowledge/tag/"));

		test.skip(!article && !category && !tag, "no knowledge content seeded in this environment");

		for (const url of [article, category, tag]) {
			if (!url) continue;
			const res = await page.goto(url);
			expect(res?.status(), `${url} should return 200`).toBe(200);
			await expect(page.locator("header").first()).toBeVisible();
			await expect(page.locator("footer").first()).toBeVisible();
		}
	});
});
