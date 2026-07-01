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
		const ctaLinks = getAllByRole("link").filter((a) => a.getAttribute("href") === APP_URL);
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

describe("SiteNavBar — settings menu (theme & locale)", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("opens the settings menu exposing locale and theme radiogroups", () => {
		const { getByRole, getAllByRole } = render(<SiteNavBar appUrl={APP_URL} />);

		fireEvent.click(getByRole("button", { name: "การตั้งค่า" }));

		expect(getByRole("radiogroup", { name: "ภาษา" })).toBeInTheDocument();
		expect(getByRole("radiogroup", { name: "ธีม" })).toBeInTheDocument();
		// Locale (2) + theme (3) options are all reachable.
		expect(getAllByRole("menuitemradio").length).toBeGreaterThanOrEqual(5);
	});

	it("selecting the dark theme option closes the settings menu", () => {
		const { getByRole, queryByRole } = render(<SiteNavBar appUrl={APP_URL} />);

		fireEvent.click(getByRole("button", { name: "การตั้งค่า" }));
		fireEvent.click(getByRole("menuitemradio", { name: "มืด" }));

		expect(queryByRole("menuitemradio", { name: "มืด" })).not.toBeInTheDocument();
	});

	it("selecting a locale closes the settings menu", () => {
		const { getByRole, queryByRole } = render(<SiteNavBar appUrl={APP_URL} />);

		fireEvent.click(getByRole("button", { name: "การตั้งค่า" }));
		fireEvent.click(getByRole("menuitemradio", { name: /English/ }));

		expect(queryByRole("menuitemradio", { name: /English/ })).not.toBeInTheDocument();
	});
});

describe("SiteNavBar — mobile drawer", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("toggles the mobile drawer and expands the About accordion", () => {
		const { getByRole, getAllByRole, queryByRole } = render(<SiteNavBar appUrl={APP_URL} />);

		// Drawer is closed initially.
		expect(queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();

		fireEvent.click(getByRole("button", { name: "เปิด/ปิดเมนู" }));
		expect(getByRole("navigation", { name: "Mobile navigation" })).toBeInTheDocument();

		// Expand the About accordion inside the drawer.
		const drawer = getByRole("navigation", { name: "Mobile navigation" });
		const aboutToggle = Array.from(drawer.querySelectorAll("button")).find((b) =>
			b.textContent?.includes("เกี่ยวกับเรา")
		);
		expect(aboutToggle).toBeTruthy();
		if (aboutToggle) fireEvent.click(aboutToggle);

		// A nested About link is now visible.
		expect(getAllByRole("link").some((a) => a.getAttribute("href") === "/about/company")).toBe(
			true
		);
	});
});
