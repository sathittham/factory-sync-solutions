import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInitialTheme, useTheme } from "./theme";

// jsdom does not implement window.matchMedia — provide a minimal stub.
function stubMatchMedia(prefersDark: boolean) {
	vi.stubGlobal(
		"matchMedia",
		(query: string) =>
			({
				matches: prefersDark ? query.includes("dark") : false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}) as unknown as MediaQueryList
	);
}

// ---------------------------------------------------------------------------
// getInitialTheme
// ---------------------------------------------------------------------------
describe("getInitialTheme", () => {
	beforeEach(() => {
		localStorage.clear();
		stubMatchMedia(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("returns 'system' when localStorage is empty", () => {
		expect(getInitialTheme()).toBe("system");
	});

	it("returns 'dark' when stored value is 'dark'", () => {
		localStorage.setItem("fss-theme", "dark");
		expect(getInitialTheme()).toBe("dark");
	});

	it("returns 'light' when stored value is 'light'", () => {
		localStorage.setItem("fss-theme", "light");
		expect(getInitialTheme()).toBe("light");
	});

	it("returns 'system' when stored value is invalid", () => {
		localStorage.setItem("fss-theme", "purple");
		expect(getInitialTheme()).toBe("system");
	});
});

// ---------------------------------------------------------------------------
// useTheme
// ---------------------------------------------------------------------------
describe("useTheme", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("dark");
		stubMatchMedia(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		document.documentElement.classList.remove("dark");
	});

	it("setTheme('dark') writes 'dark' to localStorage[fss-theme]", () => {
		const { result } = renderHook(() => useTheme());

		act(() => {
			result.current.setTheme("dark");
		});

		expect(localStorage.getItem("fss-theme")).toBe("dark");
	});

	it("setTheme('light') writes 'light' to localStorage[fss-theme]", () => {
		const { result } = renderHook(() => useTheme());

		act(() => {
			result.current.setTheme("light");
		});

		expect(localStorage.getItem("fss-theme")).toBe("light");
	});

	it("when theme is 'dark', document.documentElement has 'dark' class", () => {
		const { result } = renderHook(() => useTheme());

		act(() => {
			result.current.setTheme("dark");
		});

		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("when theme is 'light', 'dark' class is removed from document.documentElement", () => {
		// Start with dark class present so we can verify removal
		document.documentElement.classList.add("dark");
		const { result } = renderHook(() => useTheme());

		act(() => {
			result.current.setTheme("light");
		});

		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("when system preference is dark and theme is 'system', resolvedTheme is 'dark'", () => {
		stubMatchMedia(true);
		const { result } = renderHook(() => useTheme());

		act(() => {
			result.current.setTheme("system");
		});

		expect(result.current.resolvedTheme).toBe("dark");
	});

	it("when system preference is light and theme is 'system', resolvedTheme is 'light'", () => {
		stubMatchMedia(false);
		const { result } = renderHook(() => useTheme());

		act(() => {
			result.current.setTheme("system");
		});

		expect(result.current.resolvedTheme).toBe("light");
	});

	// -----------------------------------------------------------------------
	// matchMedia "change" event updates resolvedTheme
	// -----------------------------------------------------------------------
	it("updates resolvedTheme when system preference changes from light to dark", async () => {
		// Build a triggerable matchMedia stub that supports addEventListener so
		// the useEffect change listener can be registered and fired.
		const listeners: Array<(e: { matches: boolean }) => void> = [];
		const mql = {
			matches: false, // starts as light
			media: "(prefers-color-scheme: dark)",
			onchange: null,
			addEventListener: vi.fn((_type: string, cb: (e: { matches: boolean }) => void) => {
				listeners.push(cb);
			}),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
		};
		vi.stubGlobal("matchMedia", () => mql);

		const { result } = renderHook(() => useTheme());

		// Default state: system theme resolves to light.
		expect(result.current.resolvedTheme).toBe("light");

		// Simulate the OS switching to dark mode.
		act(() => {
			mql.matches = true;
			for (const cb of listeners) cb({ matches: true });
		});

		expect(result.current.resolvedTheme).toBe("dark");
	});
});

// ---------------------------------------------------------------------------
// getInitialTheme — localStorage unavailable
// ---------------------------------------------------------------------------
describe("getInitialTheme (storage unavailable)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 'system' when localStorage is unavailable", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("localStorage blocked");
		});
		expect(getInitialTheme()).toBe("system");
	});
});
