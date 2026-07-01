// Build-time article source for the Knowledge Hub (Phase 4).
//
// web-official is a fully static SSG site (Cloudflare Pages). Articles are
// authored in web-cms (SonicJS) and pulled at *build* time from its public REST
// API (`GET /api/blog-posts`, `public: ['read']` on the collection — SonicJS
// exposes each collection's list at `/api/<collection-slug>`).
//
// Resilience is a hard requirement: the build MUST succeed even when the CMS is
// unreachable, unset, or empty (see feature-spec / status.md Phase 4 tests). Any
// failure degrades to an empty article list — pages still render their empty
// state, and no article/category detail paths are emitted for missing data.

import { KNOWLEDGE_CATEGORY_SLUGS } from "./knowledge";
import { lexicalToPlainText, parseLexical } from "./lexical";

export interface Article {
	readonly id: string;
	readonly slug: string;
	readonly title: string;
	/** A valid Knowledge Hub category slug, or "" when uncategorised/unknown. */
	readonly category: string;
	/** Plain-text summary for listing cards + meta description. */
	readonly excerpt: string;
	/** Cover image URL (listing card / hero / article header), or "" when none. */
	readonly featuredImage: string;
	/** Normalised, de-duplicated tag list (may be empty). */
	readonly tags: readonly string[];
	/** Whether the article is pinned as the featured hero. */
	readonly isPinned: boolean;
	/** Estimated reading time in whole minutes (≥1), from the content length. */
	readonly readingMinutes: number;
	/** Raw Lexical editor state (string or parsed object) for detail rendering. */
	readonly content: unknown;
	readonly author: string;
	/** ISO-8601 published timestamp, or null when unpublished/undated. */
	readonly publishedAt: string | null;
}

/** Aggregated counts for the Knowledge Hub sidebar (categories + tag cloud). */
export interface KnowledgeFacets {
	readonly total: number;
	/** Article count per category slug (only categories with ≥1 article). */
	readonly categoryCounts: Readonly<Record<string, number>>;
	/** Tags sorted by frequency (desc), then alphabetically. */
	readonly tags: ReadonlyArray<{ readonly tag: string; readonly count: number }>;
}

const COLLECTION_PATH = "/api/blog-posts";
const PAGE_SIZE = 100;
const MAX_PAGES = 50; // hard stop so a misbehaving API can't loop the build forever
const FETCH_TIMEOUT_MS = 10_000;

/** Normalised CMS base URL (no trailing slash), or "" when unconfigured. */
export function getCmsBaseUrl(): string {
	const raw = import.meta.env.PUBLIC_CMS_URL ?? "";
	return raw.trim().replace(/\/+$/, "");
}

/** Read a field from a CMS record, whether flattened or nested under `data`. */
function pick(record: Record<string, unknown>, key: string): unknown {
	if (record[key] !== undefined) return record[key];
	const data = record.data;
	if (data && typeof data === "object") {
		return (data as Record<string, unknown>)[key];
	}
	return undefined;
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

/** Coerce a CMS value to boolean (accepts booleans, 0/1, "true"/"1"). */
function asBool(value: unknown): boolean {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value === 1;
	if (typeof value === "string") return value === "true" || value === "1";
	return false;
}

/** Parse tags from a comma-separated string or an array; trimmed + de-duplicated. */
function asTags(value: unknown): string[] {
	const raw = Array.isArray(value)
		? value.map((item) => asString(item))
		: asString(value).split(",");
	const seen = new Set<string>();
	const out: string[] = [];
	for (const item of raw) {
		const tag = item.trim();
		if (tag && !seen.has(tag.toLowerCase())) {
			seen.add(tag.toLowerCase());
			out.push(tag);
		}
	}
	return out;
}

/** Coerce a CMS timestamp (ISO string or epoch s/ms) to an ISO string or null. */
function toIso(value: unknown): string | null {
	if (typeof value === "string" && value.trim() !== "") {
		const ms = Date.parse(value);
		return Number.isNaN(ms) ? null : new Date(ms).toISOString();
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		// Heuristic: values below 1e12 are seconds, not milliseconds.
		const ms = value < 1e12 ? value * 1000 : value;
		return new Date(ms).toISOString();
	}
	return null;
}

/** Whether a record represents publicly visible, published content. */
function isPublished(record: Record<string, unknown>): boolean {
	const status = pick(record, "status");
	if (typeof status === "string") return status === "published";
	const flag = record.is_published ?? record.isPublished;
	if (typeof flag === "boolean") return flag;
	if (typeof flag === "number") return flag === 1;
	// No status signalled — assume the public API already filtered to published.
	return true;
}

/**
 * Rough reading time in whole minutes. Counts non-space characters (works for
 * Thai, which is unspaced) at ~400 chars/min; always ≥1.
 */
function estimateReadingMinutes(text: string): number {
	const chars = text.replace(/\s+/g, "").length;
	return Math.max(1, Math.round(chars / 400));
}

function normalizeArticle(record: Record<string, unknown>): Article | null {
	const slug = asString(pick(record, "slug"));
	const title = asString(pick(record, "title"));
	if (!slug || !title) return null;

	const rawCategory = asString(pick(record, "category"));
	const category = KNOWLEDGE_CATEGORY_SLUGS.has(rawCategory) ? rawCategory : "";

	const content = pick(record, "content") ?? null;
	const plainText = lexicalToPlainText(parseLexical(content));
	const explicitExcerpt = asString(pick(record, "excerpt")).trim();
	const excerpt = explicitExcerpt || plainText.slice(0, 200);

	return {
		id: asString(pick(record, "id")) || slug,
		slug,
		title,
		category,
		excerpt,
		featuredImage: asString(pick(record, "featuredImage") ?? pick(record, "featured_image")),
		tags: asTags(pick(record, "tags")),
		isPinned: asBool(pick(record, "isPinned") ?? pick(record, "is_pinned")),
		readingMinutes: estimateReadingMinutes(plainText || excerpt),
		content,
		author: asString(pick(record, "author")),
		publishedAt: toIso(pick(record, "publishedAt") ?? pick(record, "published_at")),
	};
}

interface ListEnvelope {
	readonly data?: unknown;
	readonly pagination?: { readonly pages?: number; readonly nextCursor?: string | null };
}

async function fetchPage(base: string, page: number): Promise<ListEnvelope | null> {
	const url = `${base}${COLLECTION_PATH}?limit=${PAGE_SIZE}&page=${page}`;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			headers: { accept: "application/json" },
			signal: controller.signal,
		});
		if (!res.ok) {
			console.warn(`[cms] ${url} → HTTP ${res.status}; skipping`);
			return null;
		}
		return (await res.json()) as ListEnvelope;
	} catch (error) {
		console.warn(`[cms] fetch failed for ${url}: ${(error as Error).message}`);
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/** Turn one envelope's rows into published, normalised articles. */
function collectArticles(data: unknown): Article[] {
	const rows = Array.isArray(data) ? data : [];
	const out: Article[] = [];
	for (const row of rows) {
		if (!row || typeof row !== "object") continue;
		const record = row as Record<string, unknown>;
		if (!isPublished(record)) continue;
		const article = normalizeArticle(record);
		if (article) out.push(article);
	}
	return out;
}

async function fetchAllArticles(): Promise<Article[]> {
	const base = getCmsBaseUrl();
	if (!base) {
		console.warn("[cms] PUBLIC_CMS_URL is unset — Knowledge Hub builds with no articles.");
		return [];
	}

	const articles: Article[] = [];
	let page = 1;
	let totalPages = 1;
	do {
		const envelope = await fetchPage(base, page);
		if (!envelope) break;
		articles.push(...collectArticles(envelope.data));
		if (page === 1 && envelope.pagination?.pages === undefined) {
			console.warn("[cms] response has no pagination.pages — fetching first page only.");
		}
		totalPages = Math.min(envelope.pagination?.pages ?? 1, MAX_PAGES);
		page += 1;
	} while (page <= totalPages);

	// Newest first; undated articles sink to the bottom.
	articles.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
	return articles;
}

// Fetch once per build, then serve every page module from the cached promise.
let cache: Promise<Article[]> | null = null;

/**
 * All published articles (build-cached). Returns [] on any failure.
 *
 * In dev (`astro dev`) the cache is bypassed so edits/reseeds in web-cms show up
 * on the next page load without restarting the server. In a production build the
 * promise is cached so the CMS is hit once, not once per generated page.
 */
export function getArticles(): Promise<Article[]> {
	if (import.meta.env.DEV) return fetchAllArticles();
	cache ??= fetchAllArticles();
	return cache;
}

/** Published articles in a given category, newest first. */
export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
	const all = await getArticles();
	return all.filter((article) => article.category === categorySlug);
}

/** A single published article by slug, or null when absent. */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
	const all = await getArticles();
	return all.find((article) => article.slug === slug) ?? null;
}

/** Build sidebar facets (category counts + tag cloud) from all published articles. */
export async function getKnowledgeFacets(): Promise<KnowledgeFacets> {
	const all = await getArticles();
	const categoryCounts: Record<string, number> = {};
	const tagCounts = new Map<string, number>();

	for (const article of all) {
		if (article.category) {
			categoryCounts[article.category] = (categoryCounts[article.category] ?? 0) + 1;
		}
		for (const tag of article.tags) {
			tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
		}
	}

	const tags = [...tagCounts.entries()]
		.map(([tag, count]) => ({ tag, count }))
		.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

	return { total: all.length, categoryCounts, tags };
}

/** Reset the build cache — test-only. */
export function __resetCmsCache(): void {
	cache = null;
}
