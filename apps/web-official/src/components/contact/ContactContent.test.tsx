import { render } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ContactContent } from "./ContactContent";

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

describe("ContactContent", () => {
	it("renders the LINE CTA link", () => {
		const { getByRole } = render(<ContactContent appUrl={APP_URL} version={VERSION} />);
		const lineLink = getByRole("link", { name: /LINE/i });
		expect(lineLink.getAttribute("href")).toBe("https://lin.ee/rWwdF9q");
	});

	it("renders the app CTA link to appUrl", () => {
		const { getAllByRole } = render(<ContactContent appUrl={APP_URL} version={VERSION} />);
		const appLinks = getAllByRole("link").filter((a) => a.getAttribute("href") === APP_URL);
		expect(appLinks.length).toBeGreaterThan(0);
	});

	it("renders the email contact link", () => {
		const { getByRole } = render(<ContactContent appUrl={APP_URL} version={VERSION} />);
		const emailLink = getByRole("link", { name: /info@factorysyncsolutions\.com/i });
		expect(emailLink.getAttribute("href")).toBe("mailto:info@factorysyncsolutions.com");
	});
});
