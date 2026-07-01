import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom does not implement window.matchMedia, but the theme system and any
// component rendered through SiteShell/SiteNav call it on mount. Provide a
// stable default stub (prefers-* → false) for every test file. Tests that need
// specific media-query behaviour (e.g. theme.test.ts) still override it locally.
Object.defineProperty(globalThis, "matchMedia", {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}),
});
