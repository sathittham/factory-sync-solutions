import { describe, expect, it } from "vitest";
import { lexicalToHtml, lexicalToPlainText, parseLexical } from "./lexical";

function root(children: unknown[]) {
	return JSON.stringify({ root: { type: "root", children } });
}

describe("parseLexical", () => {
	it("returns null for empty/blank input", () => {
		expect(parseLexical(null)).toBeNull();
		expect(parseLexical("")).toBeNull();
		expect(parseLexical("   ")).toBeNull();
	});

	it("parses a JSON string and a plain object identically", () => {
		const children = [{ type: "paragraph", children: [{ type: "text", text: "hi" }] }];
		expect(parseLexical(root(children))?.children).toHaveLength(1);
		expect(parseLexical({ root: { children } })?.children).toHaveLength(1);
	});

	it("wraps a non-JSON plain string into a paragraph", () => {
		const parsed = parseLexical("just text");
		expect(lexicalToHtml(parsed)).toBe("<p>just text</p>");
	});
});

describe("lexicalToHtml", () => {
	it("renders paragraphs and headings", () => {
		const html = lexicalToHtml(
			parseLexical(
				root([
					{ type: "heading", tag: "h2", children: [{ type: "text", text: "Title" }] },
					{ type: "paragraph", children: [{ type: "text", text: "Body" }] },
				])
			)
		);
		expect(html).toBe("<h2>Title</h2><p>Body</p>");
	});

	it("applies text format flags (bold/italic/code)", () => {
		const html = lexicalToHtml(
			parseLexical(
				root([{ type: "paragraph", children: [{ type: "text", text: "x", format: 1 }] }])
			)
		);
		expect(html).toBe("<p><strong>x</strong></p>");

		const italicCode = lexicalToHtml(
			parseLexical(
				root([{ type: "paragraph", children: [{ type: "text", text: "y", format: 2 | 16 }] }])
			)
		);
		expect(italicCode).toBe("<p><em><code>y</code></em></p>");
	});

	it("renders bullet and numbered lists", () => {
		const html = lexicalToHtml(
			parseLexical(
				root([
					{
						type: "list",
						listType: "number",
						children: [{ type: "listitem", children: [{ type: "text", text: "one" }] }],
					},
				])
			)
		);
		expect(html).toBe("<ol><li>one</li></ol>");
	});

	it("escapes HTML in text content (no XSS)", () => {
		const html = lexicalToHtml(
			parseLexical(
				root([
					{ type: "paragraph", children: [{ type: "text", text: "<script>alert(1)</script>" }] },
				])
			)
		);
		expect(html).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
	});

	it("renders safe links and drops unsafe schemes", () => {
		const safe = lexicalToHtml(
			parseLexical(
				root([
					{
						type: "paragraph",
						children: [
							{ type: "link", url: "https://x.com", children: [{ type: "text", text: "ok" }] },
						],
					},
				])
			)
		);
		expect(safe).toContain('<a href="https://x.com" rel="noopener noreferrer">ok</a>');

		const unsafe = lexicalToHtml(
			parseLexical(
				root([
					{
						type: "paragraph",
						children: [
							{
								type: "link",
								url: "javascript:alert(1)",
								children: [{ type: "text", text: "bad" }],
							},
						],
					},
				])
			)
		);
		// Link stripped, inner text preserved.
		expect(unsafe).toBe("<p>bad</p>");
	});

	it("returns empty string for null root", () => {
		expect(lexicalToHtml(null)).toBe("");
	});
});

describe("lexicalToPlainText", () => {
	it("extracts collapsed plain text across blocks", () => {
		const text = lexicalToPlainText(
			parseLexical(
				root([
					{ type: "heading", tag: "h2", children: [{ type: "text", text: "Hello" }] },
					{ type: "paragraph", children: [{ type: "text", text: "world" }] },
				])
			)
		);
		expect(text).toBe("Hello world");
	});

	it("returns empty string for null root", () => {
		expect(lexicalToPlainText(null)).toBe("");
	});
});
