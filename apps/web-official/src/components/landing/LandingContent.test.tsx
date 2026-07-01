import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LandingContent } from "./LandingContent";

const APP_URL = "https://app.example.com";
const VERSION = "0.1.0-test";

// Section anchors LandingBody must render (mirrors the in-page nav targets).
const SECTION_IDS = ["hero", "dimensions", "expert", "services", "results", "process", "contact"];

// NavBar → useTheme() reads window.matchMedia (jsdom doesn't implement it)
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

describe("LandingContent", () => {
	it("renders every landing section anchor so in-page nav resolves", () => {
		const { container } = render(<LandingContent appUrl={APP_URL} version={VERSION} />);

		// Each in-page nav target must exist in the rendered DOM.
		for (const id of SECTION_IDS) {
			expect(container.querySelector(`#${id}`), `missing section #${id}`).toBeTruthy();
		}
	});

	it("wires the primary CTA to the app register URL", () => {
		const { container } = render(<LandingContent appUrl={APP_URL} version={VERSION} />);

		const registerLinks = Array.from(container.querySelectorAll("a")).filter((a) =>
			a.getAttribute("href")?.startsWith(APP_URL)
		);
		expect(registerLinks.length).toBeGreaterThan(0);
	});

	it("renders the navigation labels for the default (Thai) locale", () => {
		const { getAllByText } = render(<LandingContent appUrl={APP_URL} version={VERSION} />);
		// "หน้าแรก" (nav.home) appears in the nav bar.
		expect(getAllByText("หน้าแรก").length).toBeGreaterThan(0);
	});
});
