import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AboutContent } from "./AboutContent";

const APP_URL = "https://app.example.com";
const VERSION = "0.1.0-test";

// SiteShell → SiteNav → useTheme() reads window.matchMedia (jsdom doesn't implement it)
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

describe("AboutContent — overview", () => {
	it("renders links to all 3 sub-pages", () => {
		const { getByRole } = render(
			<AboutContent page="overview" appUrl={APP_URL} version={VERSION} />
		);

		expect(getByRole("link", { name: /ประวัติบริษัท/i }).getAttribute("href")).toBe("/about/company");
		expect(getByRole("link", { name: /ทีมวิศวกร/i }).getAttribute("href")).toBe("/about/team");
		expect(getByRole("link", { name: /ผลงาน/i }).getAttribute("href")).toBe("/about/case-studies");
	});
});

describe("AboutContent — company", () => {
	it("renders vision and mission sections", () => {
		const { getByText } = render(
			<AboutContent page="company" appUrl={APP_URL} version={VERSION} />
		);
		expect(getByText("วิสัยทัศน์")).toBeTruthy();
		expect(getByText("พันธกิจ")).toBeTruthy();
	});
});

describe("AboutContent — team", () => {
	it("renders engineer and consultant role cards", () => {
		const { getByText } = render(<AboutContent page="team" appUrl={APP_URL} version={VERSION} />);
		expect(getByText("วุฒิวิศวกร")).toBeTruthy();
		expect(getByText("ที่ปรึกษาอาวุโส")).toBeTruthy();
	});
});

describe("AboutContent — case-studies", () => {
	it("renders the stats and a CTA linking to appUrl", () => {
		const { getAllByRole, getByText } = render(
			<AboutContent page="case-studies" appUrl={APP_URL} version={VERSION} />
		);
		expect(getByText("200+")).toBeTruthy();

		const appLinks = getAllByRole("link").filter((a) => a.getAttribute("href") === APP_URL);
		expect(appLinks.length).toBeGreaterThan(0);
	});
});
