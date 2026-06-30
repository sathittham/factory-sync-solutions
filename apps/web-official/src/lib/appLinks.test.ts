import { describe, expect, it } from "vitest";
import { getAppRegisterUrl } from "./appLinks";

describe("getAppRegisterUrl", () => {
	it("builds a production app register URL", () => {
		expect(getAppRegisterUrl("https://app.factorysyncsolutions.com")).toBe(
			"https://app.factorysyncsolutions.com/register"
		);
	});

	it("builds a staging app register URL", () => {
		expect(getAppRegisterUrl("https://app-staging.factorysyncsolutions.com/")).toBe(
			"https://app-staging.factorysyncsolutions.com/register"
		);
	});

	it("builds a local app register URL in development", () => {
		expect(
			getAppRegisterUrl("https://app-staging.factorysyncsolutions.com/", {
				isDevelopment: true,
			})
		).toBe("http://localhost:5173/register");
	});

	it("removes path, query, and hash from the base app URL", () => {
		expect(getAppRegisterUrl("https://app.example.com/signin?next=/dashboard#top")).toBe(
			"https://app.example.com/register"
		);
	});

	it("falls back to the local register route for invalid app URLs", () => {
		expect(getAppRegisterUrl("#")).toBe("/register");
	});
});
