// Build-time article source for the Knowledge Hub (Phase 4).
//
// web-official is a fully static SSG site (Cloudflare Pages). Articles are
// authored in web-cms (SonicJS) and pulled at *build* time from its public REST
// API (`GET /api/content/blog-posts`, `public: ['read']` on the collection).
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
	/** Raw Lexical editor state (string or parsed object) for detail rendering. */
	readonly content: unknown;
	readonly author: string;
	/** ISO-8601 published timestamp, or null when unpublished/undated. */
	readonly publishedAt: string | null;
}

const COLLECTION_PATH = "/api/content/blog-posts";
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

function normalizeArticle(record: Record<string, unknown>): Article | null {
	const slug = asString(pick(record, "slug"));
	const title = asString(pick(record, "title"));
	if (!slug || !title) return null;

	const rawCategory = asString(pick(record, "category"));
	const category = KNOWLEDGE_CATEGORY_SLUGS.has(rawCategory) ? rawCategory : "";

	const content = pick(record, "content") ?? null;
	const explicitExcerpt = asString(pick(record, "excerpt")).trim();
	const excerpt = explicitExcerpt || lexicalToPlainText(parseLexical(content)).slice(0, 200);

	return {
		id: asString(pick(record, "id")) || slug,
		slug,
		title,
		category,
		excerpt,
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

/** All published articles (build-cached). Returns [] on any failure. */
export function getArticles(): Promise<Article[]> {
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

/** Reset the build cache — test-only. */
export function __resetCmsCache(): void {
	cache = null;
}
