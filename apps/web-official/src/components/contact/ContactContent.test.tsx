import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactContent } from "./ContactContent";

// window.matchMedia is stubbed globally in src/test/setup.ts.

const APP_URL = "https://app.example.com";
const VERSION = "0.1.0-test";

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
