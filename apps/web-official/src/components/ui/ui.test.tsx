import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

describe("Card", () => {
	it("renders all sub-components and forwards className", () => {
		const { getByText, container } = render(
			<Card className="custom-card">
				<CardHeader>
					<CardTitle>Title</CardTitle>
					<CardDescription>Description</CardDescription>
				</CardHeader>
				<CardContent>Body</CardContent>
				<CardFooter>Footer</CardFooter>
			</Card>
		);

		expect(getByText("Title")).toBeInTheDocument();
		expect(getByText("Description")).toBeInTheDocument();
		expect(getByText("Body")).toBeInTheDocument();
		expect(getByText("Footer")).toBeInTheDocument();
		expect(container.querySelector(".custom-card")).toBeTruthy();
	});
});

describe("Input", () => {
	it("renders with a placeholder and forwards props", () => {
		const { getByPlaceholderText } = render(
			<Input placeholder="Email" type="email" defaultValue="a@b.co" />
		);
		const input = getByPlaceholderText("Email") as HTMLInputElement;
		expect(input.type).toBe("email");
		expect(input.value).toBe("a@b.co");
	});
});

describe("Select", () => {
	it("renders a closed trigger with the placeholder", () => {
		const { getByText } = render(
			<Select>
				<SelectTrigger>
					<SelectValue placeholder="Choose one" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="a">Option A</SelectItem>
					<SelectItem value="b">Option B</SelectItem>
				</SelectContent>
			</Select>
		);
		expect(getByText("Choose one")).toBeInTheDocument();
	});
});
