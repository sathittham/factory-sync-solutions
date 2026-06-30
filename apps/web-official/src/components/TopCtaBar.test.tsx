import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TopCtaBar } from "./TopCtaBar";

describe("TopCtaBar", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("calls the visitor to action via the LINE official account in a new tab", () => {
		const { getByRole } = render(<TopCtaBar />);
		const link = getByRole("link") as HTMLAnchorElement;
		expect(link.getAttribute("href")).toBe("https://lin.ee/rWwdF9q");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("renders both the short and full label spans for responsive display (default TH)", () => {
		const { getByText } = render(<TopCtaBar />);
		expect(getByText("ตรวจโรงงานฟรี")).toBeInTheDocument();
		expect(getByText("ขอประเมิน / นัดตรวจสุขภาพโรงงานฟรี")).toBeInTheDocument();
	});
});
