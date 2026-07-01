import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegalContent, type LegalPageType } from "./LegalContent";

// window.matchMedia is stubbed globally in src/test/setup.ts.

const APP_URL = "https://app.example.com";
const VERSION = "0.1.0-test";

const PAGES: { page: LegalPageType; title: string }[] = [
	{ page: "terms", title: "ข้อกำหนดและเงื่อนไขการใช้งาน" },
	{ page: "privacy", title: "นโยบายความเป็นส่วนตัว" },
	{ page: "cookies", title: "นโยบายคุกกี้" },
	{ page: "marketing", title: "นโยบายทางการตลาด" },
	{ page: "cookie-settings", title: "ตั้งค่าคุกกี้" },
];

describe("LegalContent", () => {
	for (const { page, title } of PAGES) {
		it(`renders the "${page}" page title and full sidebar nav`, () => {
			const { container, getAllByText } = render(
				<LegalContent page={page} appUrl={APP_URL} version={VERSION} />
			);

			// Title appears (PageHero heading + active sidebar link).
			expect(getAllByText(title).length).toBeGreaterThan(0);

			// Sidebar links to every legal page.
			const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
			for (const p of PAGES) {
				expect(hrefs).toContain(`/${p.page}`);
			}

			// Active page is marked aria-current.
			expect(container.querySelector(`a[href="/${page}"][aria-current="page"]`)).toBeTruthy();
		});
	}
});
