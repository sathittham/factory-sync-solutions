import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ServiceContent } from "./ServiceContent";

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

describe("ServiceContent — hub root", () => {
	it("lists every child as a nested link", () => {
		const { container, getByText } = render(
			<ServiceContent groupSlug="government-supported" appUrl={APP_URL} version={VERSION} />
		);
		expect(getByText("บริการในกลุ่มนี้")).toBeTruthy();

		const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
		expect(hrefs).toContain("/services/government-supported/digital-factory-layout-360");
		expect(hrefs).toContain("/services/government-supported/shindan-lean-kaizen");
		expect(hrefs).toContain("/services/government-supported/in-house-training");
	});
});

describe("ServiceContent — flagship detail", () => {
	it("renders real overview copy and a CTA deep-linking into the app", () => {
		const { container, getByText } = render(
			<ServiceContent groupSlug="factory-health-check" appUrl={APP_URL} version={VERSION} />
		);
		expect(getByText("ภาพรวมบริการ")).toBeTruthy();
		// not the placeholder
		expect(() => getByText("รายละเอียดบริการเร็วๆ นี้")).toThrow();

		const appLinks = Array.from(container.querySelectorAll("a")).filter(
			(a) => a.getAttribute("href") === APP_URL
		);
		expect(appLinks.length).toBeGreaterThan(0);
	});
});

describe("ServiceContent — draft detail", () => {
	it("renders draft copy with a draft banner for a mockup nested service", () => {
		const { container, getByText, queryByText } = render(
			<ServiceContent
				groupSlug="government-supported"
				childSlug="in-house-training"
				appUrl={APP_URL}
				version={VERSION}
			/>
		);
		// draft pages render the full detail body (overview), not the coming-soon notice
		expect(getByText("ภาพรวมบริการ")).toBeTruthy();
		expect(queryByText("รายละเอียดบริการเร็วๆ นี้")).toBeNull();
		// and a clearly-marked draft banner
		expect(getByText(/ตัวอย่างเนื้อหา \(ฉบับร่าง\)/)).toBeTruthy();

		// non-flagship pages route the CTA to contact
		const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
		expect(hrefs).toContain("/contact");

		// breadcrumb links back to the parent hub
		expect(hrefs).toContain("/services/government-supported");
	});
});
