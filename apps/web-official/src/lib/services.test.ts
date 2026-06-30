import { describe, expect, it } from "vitest";
import {
	SERVICE_GROUPS,
	childHref,
	childParams,
	getChildBySlug,
	getGroupBySlug,
	groupHref,
	groupParams,
	subKey,
} from "./services";

describe("service taxonomy", () => {
	it("emits 4 group root paths", () => {
		const params = groupParams();
		expect(params).toHaveLength(4);
		expect(params.map((p) => p.group)).toEqual([
			"factory-health-check",
			"government-supported",
			"engineering-consulting",
			"engineering-design",
		]);
	});

	it("emits 13 nested child paths", () => {
		const params = childParams();
		expect(params).toHaveLength(13);
		// every child belongs to a hub group
		for (const { group } of params) {
			expect(["government-supported", "engineering-design"]).toContain(group);
		}
	});

	it("totals 17 static service pages (4 roots + 13 details)", () => {
		expect(groupParams().length + childParams().length).toBe(17);
	});

	it("resolves a group + child by slug", () => {
		const group = getGroupBySlug("government-supported");
		expect(group?.id).toBe("government-supported");
		const child = group && getChildBySlug(group, "shindan-lean-kaizen");
		expect(child?.labelKey).toBe("svc.shindanLeanKaizen.title");
	});

	it("returns undefined for unknown slugs", () => {
		expect(getGroupBySlug("nope")).toBeUndefined();
		const group = getGroupBySlug("government-supported");
		expect(group && getChildBySlug(group, "nope")).toBeUndefined();
	});

	it("builds nested hrefs", () => {
		const group = getGroupBySlug("engineering-design");
		const child = group?.children?.[0];
		if (!group || !child) throw new Error("fixture missing");
		expect(groupHref(group)).toBe("/services/engineering-design");
		expect(childHref(group, child)).toBe(`/services/engineering-design/${child.slug}`);
	});

	it("derives the subtitle key from a title key", () => {
		expect(subKey("svc.freeHealthCheck.title")).toBe("svc.freeHealthCheck.sub");
	});

	it("only hub groups carry children", () => {
		for (const group of SERVICE_GROUPS) {
			if (group.type === "page") expect(group.children).toBeUndefined();
			else expect((group.children ?? []).length).toBeGreaterThan(0);
		}
	});
});
