import { describe, expect, it } from "vitest";
import { formatArticleDate } from "./date";

describe("formatArticleDate", () => {
	it("returns empty string for missing or invalid input", () => {
		expect(formatArticleDate(null, "en")).toBe("");
		expect(formatArticleDate(undefined, "en")).toBe("");
		expect(formatArticleDate("not-a-date", "en")).toBe("");
	});

	it("formats an ISO date in English (Gregorian)", () => {
		// en-GB: day month year
		expect(formatArticleDate("2026-06-01T00:00:00.000Z", "en")).toBe("1 June 2026");
	});

	it("formats an ISO date in Thai using the Buddhist Era", () => {
		// พ.ศ. = ค.ศ. + 543 → 2026 renders as 2569.
		const formatted = formatArticleDate("2026-06-01T00:00:00.000Z", "th");
		expect(formatted).toContain("2569");
	});
});
