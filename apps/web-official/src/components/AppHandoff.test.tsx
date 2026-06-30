import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppHandoff } from "./AppHandoff";

const APP_URL = "https://app.example.com";

// Helper: render AppHandoff alongside a test anchor in the same document.
function renderWithLink(href: string, attrs?: Record<string, string>) {
	const utils = render(
		<>
			<AppHandoff appUrl={APP_URL} />
			<a href={href} {...attrs}>
				Go to app
			</a>
		</>
	);
	return utils.getByRole("link") as HTMLAnchorElement;
}

describe("AppHandoff", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// -----------------------------------------------------------------------
	// Happy path — all keys present
	// -----------------------------------------------------------------------
	it("appends all query params when every localStorage key is set", () => {
		localStorage.setItem("fss-locale", "en");
		localStorage.setItem("fss-theme", "dark");
		localStorage.setItem("fss-cookie-consent", "true");
		localStorage.setItem("fss-analytics-consent", "true");
		localStorage.setItem("fss-marketing-consent", "false");

		const link = renderWithLink(`${APP_URL}/dashboard`);

		// Fire directly on the anchor — the capture-phase listener on document
		// receives event.target === link, which is what the handler uses.
		fireEvent.pointerDown(link);

		const url = new URL(link.getAttribute("href") ?? "");
		expect(url.searchParams.get("lang")).toBe("en");
		expect(url.searchParams.get("theme")).toBe("dark");
		expect(url.searchParams.get("consent")).toBe("true");
		expect(url.searchParams.get("analytics")).toBe("true");
		expect(url.searchParams.get("marketing")).toBe("false");
	});

	// -----------------------------------------------------------------------
	// Partial keys — missing ones must NOT appear
	// -----------------------------------------------------------------------
	it("does not append a param when its localStorage key is absent", () => {
		// Only set locale; leave the rest unset.
		localStorage.setItem("fss-locale", "th");

		const link = renderWithLink(`${APP_URL}/dashboard`);

		fireEvent.pointerDown(link);

		const url = new URL(link.getAttribute("href") ?? "");
		expect(url.searchParams.get("lang")).toBe("th");
		expect(url.searchParams.has("theme")).toBe(false);
		expect(url.searchParams.has("consent")).toBe(false);
		expect(url.searchParams.has("analytics")).toBe(false);
		expect(url.searchParams.has("marketing")).toBe(false);
	});

	// -----------------------------------------------------------------------
	// Different host — anchor must be left untouched
	// -----------------------------------------------------------------------
	it("does not modify an anchor pointing to a different host", () => {
		localStorage.setItem("fss-locale", "en");

		const originalHref = "https://other.example.com/page";
		const link = renderWithLink(originalHref);

		fireEvent.pointerDown(link);

		expect(link.getAttribute("href")).toBe(originalHref);
	});

	// -----------------------------------------------------------------------
	// Keyboard activation path (keydown)
	// -----------------------------------------------------------------------
	it("decorates anchor on keydown as well as pointerdown", () => {
		localStorage.setItem("fss-locale", "en");

		const link = renderWithLink(`${APP_URL}/start`);

		fireEvent.keyDown(link);

		const url = new URL(link.getAttribute("href") ?? "");
		expect(url.searchParams.get("lang")).toBe("en");
	});

	// -----------------------------------------------------------------------
	// Cleanup — event listeners are removed on unmount
	// -----------------------------------------------------------------------
	it("removes event listeners from document on unmount", () => {
		const removeSpy = vi.spyOn(document, "removeEventListener");

		const { unmount } = render(<AppHandoff appUrl={APP_URL} />);
		unmount();

		const removedTypes = removeSpy.mock.calls.map((c) => c[0]);
		expect(removedTypes).toContain("pointerdown");
		expect(removedTypes).toContain("keydown");
	});

	// -----------------------------------------------------------------------
	// Invalid appUrl — component must not throw
	// -----------------------------------------------------------------------
	it("does not throw when appUrl is invalid", () => {
		expect(() => render(<AppHandoff appUrl="#" />)).not.toThrow();
	});

	// -----------------------------------------------------------------------
	// decorate() catch branch — anchor with an unparseable href
	// -----------------------------------------------------------------------
	it("does not throw when an anchor href cannot be parsed as a URL", () => {
		const { container } = render(
			<>
				<AppHandoff appUrl={APP_URL} />
				<a href="not-a-valid-url://something">Bad link</a>
			</>
		);
		const link = container.querySelector("a") as HTMLAnchorElement;
		// The decorate() try/catch must swallow the URL parse error silently.
		expect(() => fireEvent.pointerDown(link)).not.toThrow();
	});

	// -----------------------------------------------------------------------
	// Non-anchor element — pointerdown must be ignored
	// -----------------------------------------------------------------------
	it("ignores pointerdown on a non-anchor element and leaves real link href unchanged", () => {
		const { getByText, getByRole } = render(
			<>
				<AppHandoff appUrl={APP_URL} />
				<span>Not a link</span>
				<a href={`${APP_URL}/path`}>Real link</a>
			</>
		);

		localStorage.setItem("fss-locale", "en");

		// Fire on the span — closest("a") returns null, so decorate never runs.
		fireEvent.pointerDown(getByText("Not a link"));

		const link = getByRole("link", { name: "Real link" });
		expect(link.getAttribute("href")).toBe(`${APP_URL}/path`);
	});
});
