// Minimal Lexical editor-state → sanitized HTML renderer for Knowledge Hub
// articles (Phase 4). web-cms stores `content` as a Lexical state (the SonicJS
// `lexical` field type); we render a known subset of node types to safe static
// HTML at build time, so the Astro site needs no @lexical runtime dependency.
//
// Anything unrecognised degrades gracefully: container nodes recurse into their
// children, leaf nodes contribute their text. Output is escaped and limited to a
// fixed tag whitelist — authored content is trusted (internal editors) but we
// still never emit raw HTML or unsafe URLs.

export interface LexicalNode {
	readonly type?: string;
	readonly children?: readonly LexicalNode[];
	readonly text?: string;
	readonly format?: number | string;
	readonly tag?: string;
	readonly listType?: string;
	readonly url?: string;
	readonly [key: string]: unknown;
}

interface LexicalRoot {
	readonly children: readonly LexicalNode[];
}

// Lexical text-format bitmask flags.
const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 1 << 1;
const FORMAT_STRIKETHROUGH = 1 << 2;
const FORMAT_UNDERLINE = 1 << 3;
const FORMAT_CODE = 1 << 4;

/**
 * Coerce raw CMS content into a Lexical root, or null when empty.
 * Accepts a Lexical state object, a JSON string of one, or — as a fallback —
 * a plain text string (wrapped into a single paragraph).
 */
export function parseLexical(content: unknown): LexicalRoot | null {
	let value = content;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed === "") return null;
		try {
			value = JSON.parse(trimmed);
		} catch {
			// Not JSON — treat the whole string as a single text paragraph.
			return { children: [{ type: "paragraph", children: [{ type: "text", text: trimmed }] }] };
		}
	}
	if (!value || typeof value !== "object") return null;
	const root = (value as { root?: unknown }).root ?? value;
	const children = (root as { children?: unknown }).children;
	if (!Array.isArray(children)) return null;
	return { children: children as LexicalNode[] };
}

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Allow only safe, non-scriptable URL schemes; otherwise drop the href. */
function safeUrl(url: string): string | null {
	const trimmed = url.trim();
	if (trimmed === "") return null;
	if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
	if (/^[/#]/.test(trimmed)) return trimmed; // relative or anchor
	return null;
}

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function formatFlags(format: number | string | undefined): number {
	return typeof format === "number" ? format : 0;
}

function renderText(node: LexicalNode): string {
	let html = escapeHtml(node.text ?? "");
	const flags = formatFlags(node.format);
	if (flags & FORMAT_CODE) html = `<code>${html}</code>`;
	if (flags & FORMAT_STRIKETHROUGH) html = `<s>${html}</s>`;
	if (flags & FORMAT_UNDERLINE) html = `<u>${html}</u>`;
	if (flags & FORMAT_ITALIC) html = `<em>${html}</em>`;
	if (flags & FORMAT_BOLD) html = `<strong>${html}</strong>`;
	return html;
}

function renderChildren(children: readonly LexicalNode[] | undefined): string {
	return (children ?? []).map(renderNode).join("");
}

function renderNode(node: LexicalNode): string {
	switch (node.type) {
		case "text":
			return renderText(node);
		case "linebreak":
			return "<br />";
		case "paragraph": {
			const inner = renderChildren(node.children);
			return inner ? `<p>${inner}</p>` : "";
		}
		case "heading": {
			const tag = typeof node.tag === "string" && HEADING_TAGS.has(node.tag) ? node.tag : "h2";
			return `<${tag}>${renderChildren(node.children)}</${tag}>`;
		}
		case "quote":
			return `<blockquote>${renderChildren(node.children)}</blockquote>`;
		case "list": {
			const tag = node.listType === "number" || node.tag === "ol" ? "ol" : "ul";
			return `<${tag}>${renderChildren(node.children)}</${tag}>`;
		}
		case "listitem":
			return `<li>${renderChildren(node.children)}</li>`;
		case "link": {
			const href = typeof node.url === "string" ? safeUrl(node.url) : null;
			const inner = renderChildren(node.children);
			if (!href) return inner;
			return `<a href="${escapeHtml(href)}" rel="noopener noreferrer">${inner}</a>`;
		}
		case "code":
			return `<pre><code>${renderChildren(node.children)}</code></pre>`;
		default:
			// Unknown node: recurse children, or fall back to its own text.
			if (node.children) return renderChildren(node.children);
			return node.text ? renderText(node) : "";
	}
}

/** Render a parsed Lexical root to sanitized HTML. Empty input → "". */
export function lexicalToHtml(root: LexicalRoot | null): string {
	if (!root) return "";
	return renderChildren(root.children);
}

/** Extract plain text (for excerpts / meta descriptions). Empty input → "". */
export function lexicalToPlainText(root: LexicalRoot | null): string {
	if (!root) return "";
	const walk = (nodes: readonly LexicalNode[]): string =>
		nodes
			.map((node) => {
				if (node.type === "text") return node.text ?? "";
				if (node.type === "linebreak") return " ";
				const inner = node.children ? walk(node.children) : (node.text ?? "");
				// Space-separate block-level nodes so words don't run together.
				return node.children ? `${inner} ` : inner;
			})
			.join("");
	return walk(root.children).replace(/\s+/g, " ").trim();
}
