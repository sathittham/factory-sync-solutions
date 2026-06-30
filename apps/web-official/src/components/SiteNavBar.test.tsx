import { fireEvent, render } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteNavBar } from "./SiteNavBar";

const APP_URL = "https://app.example.com";

// useTheme() reads window.matchMedia, which jsdom does not implement.
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

describe("SiteNavBar — mega menu", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("renders the routed primary nav and free-check CTA → app URL", () => {
		const { getAllByRole } = render(<SiteNavBar appUrl={APP_URL} />);
		const ctaLinks = getAllByRole("link").filter(
			(a) => a.getAttribute("href") === APP_URL
		);
		expect(ctaLinks.length).toBeGreaterThan(0);
	});

	it("opens the Services mega menu and links to nested service routes", () => {
		const { getByRole } = render(<SiteNavBar appUrl={APP_URL} />);
		fireEvent.click(getByRole("button", { name: "บริการของเรา" }));

		const child = getByRole("link", { name: "Digital Factory Layout 360" });
		expect(child.getAttribute("href")).toBe(
			"/services/government-supported/digital-factory-layout-360"
		);

		// Flagship group links to its dedicated page.
		const flagship = getByRole("link", { name: /ตรวจสุขภาพโรงงานเบื้องต้น/ });
		expect(flagship.getAttribute("href")).toBe("/services/factory-health-check");
	});

	it("opens the About dropdown with section sub-links", () => {
		const { getByRole } = render(<SiteNavBar appUrl={APP_URL} />);
		fireEvent.click(getByRole("button", { name: "เกี่ยวกับเรา" }));

		expect(getByRole("link", { name: "ประวัติบริษัท / วิสัยทัศน์" }).getAttribute("href")).toBe(
			"/about/company"
		);
	});

	it("closes an open menu on Escape", () => {
		const { getByRole, queryByRole } = render(<SiteNavBar appUrl={APP_URL} />);
		fireEvent.click(getByRole("button", { name: "บริการของเรา" }));
		expect(queryByRole("link", { name: "Digital Factory Layout 360" })).toBeInTheDocument();

		fireEvent.keyDown(document, { key: "Escape" });
		expect(queryByRole("link", { name: "Digital Factory Layout 360" })).not.toBeInTheDocument();
	});
});
