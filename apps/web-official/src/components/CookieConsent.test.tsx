import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_KEY, CookieConsent, OPEN_SETTINGS_EVENT } from "./CookieConsent";

const ANALYTICS_KEY = "fss-analytics-consent";
const MARKETING_KEY = "fss-marketing-consent";

// Mock updateConsentMode to avoid real gtag calls.
vi.mock("@/lib/consent", () => ({
	updateConsentMode: vi.fn(),
}));

// After mocking, import so we can assert on the mock.
import { updateConsentMode } from "@/lib/consent";

describe("CookieConsent", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// -----------------------------------------------------------------------
	// 1. Banner visible on first visit
	// -----------------------------------------------------------------------
	it("banner is visible when no consent is stored in localStorage", async () => {
		render(<CookieConsent />);

		// After the useEffect runs (post-mount), the banner should appear.
		await waitFor(() => {
			expect(screen.getByTestId("cookie-accept-all-btn")).toBeInTheDocument();
		});
	});

	// -----------------------------------------------------------------------
	// 2. Banner hidden when consent already stored
	// -----------------------------------------------------------------------
	it("banner is not rendered when fss-cookie-consent is already stored", async () => {
		localStorage.setItem(CONSENT_KEY, "all");

		render(<CookieConsent />);

		// Wait a tick for the useEffect to evaluate — banner should never appear.
		await act(async () => {});

		expect(screen.queryByTestId("cookie-accept-all-btn")).not.toBeInTheDocument();
		expect(screen.queryByTestId("cookie-settings-btn")).not.toBeInTheDocument();
	});

	// -----------------------------------------------------------------------
	// 3. "Accept All" sets all three localStorage keys
	// -----------------------------------------------------------------------
	it("clicking Accept All writes all=all, analytics=true, marketing=true to localStorage", async () => {
		render(<CookieConsent />);

		await waitFor(() => {
			expect(screen.getByTestId("cookie-accept-all-btn")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId("cookie-accept-all-btn"));

		expect(localStorage.getItem(CONSENT_KEY)).toBe("all");
		expect(localStorage.getItem(ANALYTICS_KEY)).toBe("true");
		expect(localStorage.getItem(MARKETING_KEY)).toBe("true");
	});

	// -----------------------------------------------------------------------
	// 4. "Accept All" calls updateConsentMode(true, true)
	// -----------------------------------------------------------------------
	it("clicking Accept All calls updateConsentMode with (true, true)", async () => {
		render(<CookieConsent />);

		await waitFor(() => {
			expect(screen.getByTestId("cookie-accept-all-btn")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId("cookie-accept-all-btn"));

		expect(updateConsentMode).toHaveBeenCalledWith(true, true);
	});

	// -----------------------------------------------------------------------
	// 5. "Accept All" closes the banner
	// -----------------------------------------------------------------------
	it("clicking Accept All removes the banner from the document", async () => {
		render(<CookieConsent />);

		await waitFor(() => {
			expect(screen.getByTestId("cookie-accept-all-btn")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId("cookie-accept-all-btn"));

		expect(screen.queryByTestId("cookie-accept-all-btn")).not.toBeInTheDocument();
		expect(screen.queryByTestId("cookie-settings-btn")).not.toBeInTheDocument();
	});

	// -----------------------------------------------------------------------
	// 6. "Cookie Settings" button opens the settings modal
	// -----------------------------------------------------------------------
	it("clicking Cookie Settings reveals the settings panel with confirm button", async () => {
		render(<CookieConsent />);

		await waitFor(() => {
			expect(screen.getByTestId("cookie-settings-btn")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId("cookie-settings-btn"));

		expect(screen.getByTestId("cookie-confirm-btn")).toBeInTheDocument();
		// The dialog role should be present
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	// -----------------------------------------------------------------------
	// 7. Settings: confirming with both toggles off saves essential-only
	// -----------------------------------------------------------------------
	it("confirming settings with both analytics and marketing off saves essential consent", async () => {
		render(<CookieConsent />);

		await waitFor(() => {
			expect(screen.getByTestId("cookie-settings-btn")).toBeInTheDocument();
		});

		// Open settings — both toggles default to false (no prior consent)
		fireEvent.click(screen.getByTestId("cookie-settings-btn"));

		// Confirm without toggling anything
		fireEvent.click(screen.getByTestId("cookie-confirm-btn"));

		expect(localStorage.getItem(CONSENT_KEY)).toBe("essential");
		expect(localStorage.getItem(ANALYTICS_KEY)).toBe("false");
		expect(localStorage.getItem(MARKETING_KEY)).toBe("false");
	});

	// -----------------------------------------------------------------------
	// 8. Settings: confirming with analytics on saves partial consent
	// -----------------------------------------------------------------------
	it("confirming settings with analytics on saves partial consent and analytics=true", async () => {
		render(<CookieConsent />);

		await waitFor(() => {
			expect(screen.getByTestId("cookie-settings-btn")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId("cookie-settings-btn"));

		// The analytics toggle is a role="switch"; click it to enable analytics.
		const switches = screen.getAllByRole("switch");
		// Switches order: analytics, marketing (essential has no toggle)
		const analyticsSwitch = switches[0];
		fireEvent.click(analyticsSwitch);

		fireEvent.click(screen.getByTestId("cookie-confirm-btn"));

		expect(localStorage.getItem(CONSENT_KEY)).toBe("partial");
		expect(localStorage.getItem(ANALYTICS_KEY)).toBe("true");
	});

	// -----------------------------------------------------------------------
	// 9. Custom event reopens settings after initial accept
	// -----------------------------------------------------------------------
	it("dispatching fss:open-cookie-settings event reopens the settings panel", async () => {
		render(<CookieConsent />);

		// Wait for banner, then accept all to close it
		await waitFor(() => {
			expect(screen.getByTestId("cookie-accept-all-btn")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId("cookie-accept-all-btn"));

		// Banner should be gone
		expect(screen.queryByTestId("cookie-accept-all-btn")).not.toBeInTheDocument();

		// Dispatch the custom event to reopen settings
		act(() => {
			globalThis.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
		});

		// Settings panel should now be visible
		expect(screen.getByTestId("cookie-confirm-btn")).toBeInTheDocument();
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	// -----------------------------------------------------------------------
	// 10. Escape key closes the settings modal
	// -----------------------------------------------------------------------
	it("pressing Escape while settings is open closes the settings panel", async () => {
		render(<CookieConsent />);

		await waitFor(() => {
			expect(screen.getByTestId("cookie-settings-btn")).toBeInTheDocument();
		});

		// Open settings
		fireEvent.click(screen.getByTestId("cookie-settings-btn"));
		expect(screen.getByTestId("cookie-confirm-btn")).toBeInTheDocument();

		// Press Escape
		fireEvent.keyDown(document, { key: "Escape" });

		expect(screen.queryByTestId("cookie-confirm-btn")).not.toBeInTheDocument();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});
