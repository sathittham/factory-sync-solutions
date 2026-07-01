import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NotFoundContent } from "./NotFoundContent";

// window.matchMedia is stubbed globally in src/test/setup.ts.

const APP_URL = "https://app.example.com";
const VERSION = "0.1.0-test";

describe("NotFoundContent", () => {
	it("renders the not-found message and a link home (default Thai)", () => {
		const { container, getAllByText } = render(
			<NotFoundContent appUrl={APP_URL} version={VERSION} />
		);

		// Localized title appears (PageHero heading + breadcrumb).
		expect(getAllByText("ไม่พบหน้าที่คุณค้นหา").length).toBeGreaterThan(0);

		// A CTA links back to the homepage.
		const homeLinks = Array.from(container.querySelectorAll("a")).filter(
			(a) => a.getAttribute("href") === "/"
		);
		expect(homeLinks.length).toBeGreaterThan(0);
	});
});
