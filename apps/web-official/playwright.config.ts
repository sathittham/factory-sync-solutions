import { defineConfig, devices } from "@playwright/test";

// When PLAYWRIGHT_BASE_URL is set (e.g. a deployed staging URL), tests run against
// that origin and no local dev server is started. Otherwise a local Astro dev
// server is spun up for developer/PR runs.
const remoteBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = remoteBaseURL ?? "http://localhost:4321";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	// GitHub annotations in CI + an HTML report to upload as an artifact.
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",
	use: {
		baseURL,
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
		{
			name: "mobile-chrome",
			use: { ...devices["Pixel 5"] },
		},
	],
	// Only manage a local server when not targeting a deployed URL.
	webServer: remoteBaseURL
		? undefined
		: {
				command: "npm run dev",
				url: "http://localhost:4321",
				reuseExistingServer: !process.env.CI,
				timeout: 60_000,
			},
});
