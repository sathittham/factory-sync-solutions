import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider, getInitialLocale, useLocale } from "./i18n";

// ---------------------------------------------------------------------------
// getInitialLocale
// ---------------------------------------------------------------------------
describe("getInitialLocale", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns 'th' when localStorage is empty", () => {
		expect(getInitialLocale()).toBe("th");
	});

	it("returns 'en' when fss-locale is 'en'", () => {
		localStorage.setItem("fss-locale", "en");
		expect(getInitialLocale()).toBe("en");
	});

	it("returns 'th' when fss-locale is 'th'", () => {
		localStorage.setItem("fss-locale", "th");
		expect(getInitialLocale()).toBe("th");
	});

	it("returns 'th' when stored value is not a valid locale", () => {
		localStorage.setItem("fss-locale", "fr");
		expect(getInitialLocale()).toBe("th");
	});

	it("does not throw when localStorage is unavailable", () => {
		vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("localStorage unavailable");
		});
		expect(() => getInitialLocale()).not.toThrow();
		expect(getInitialLocale()).toBe("th");
	});
});

// ---------------------------------------------------------------------------
// useLocale
// ---------------------------------------------------------------------------
describe("useLocale", () => {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<LocaleProvider>{children}</LocaleProvider>
	);

	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("throws when called outside LocaleProvider", () => {
		// renderHook without wrapper — the hook should throw
		expect(() => {
			renderHook(() => useLocale());
		}).toThrow("useLocale must be used within LocaleProvider");
	});

	it("t() returns the Thai translation for a known key in 'th' locale", () => {
		const { result } = renderHook(() => useLocale(), { wrapper });
		// Default locale is 'th'; verify a known Thai translation
		expect(result.current.t("nav.signIn")).toBe("เข้าสู่ระบบ");
	});

	it("t() returns the English translation for a known key in 'en' locale", () => {
		const { result } = renderHook(() => useLocale(), { wrapper });

		act(() => {
			result.current.setLocale("en");
		});

		expect(result.current.t("nav.signIn")).toBe("Sign In");
	});

	it("t() falls back to returning the key itself for an unknown key", () => {
		const { result } = renderHook(() => useLocale(), { wrapper });
		expect(result.current.t("nonexistent.key.xyz")).toBe("nonexistent.key.xyz");
	});

	it("t() falls back to the key in English locale too", () => {
		const { result } = renderHook(() => useLocale(), { wrapper });

		act(() => {
			result.current.setLocale("en");
		});

		expect(result.current.t("nonexistent.key.xyz")).toBe("nonexistent.key.xyz");
	});

	it("setLocale() switches locale", () => {
		const { result } = renderHook(() => useLocale(), { wrapper });

		act(() => {
			result.current.setLocale("en");
		});

		expect(result.current.locale).toBe("en");
	});

	it("setLocale() persists locale to localStorage[fss-locale]", () => {
		const { result } = renderHook(() => useLocale(), { wrapper });

		act(() => {
			result.current.setLocale("en");
		});

		expect(localStorage.getItem("fss-locale")).toBe("en");
	});

	it("setLocale() persists 'th' to localStorage when switching back", () => {
		localStorage.setItem("fss-locale", "en");
		const { result } = renderHook(() => useLocale(), { wrapper });

		act(() => {
			result.current.setLocale("th");
		});

		expect(localStorage.getItem("fss-locale")).toBe("th");
	});
});
