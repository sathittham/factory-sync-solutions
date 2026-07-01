import { type Crumb, PageHero } from "@/components/site/PageHero";
import { SiteShell } from "@/components/site/SiteShell";
import { categoryColor } from "@/lib/categoryColors";
import { formatArticleDate } from "@/lib/date";
import { useLocale } from "@/lib/i18n";
import {
	KNOWLEDGE_CATEGORIES,
	articleHref,
	categoryHref,
	categoryLabelKey,
	getCategoryBySlug,
	knowledgeHref,
	tagHref,
} from "@/lib/knowledge";
import { useEffect, useId, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Serializable view models (passed from Astro frontmatter)
// ---------------------------------------------------------------------------

export interface ArticleCard {
	readonly slug: string;
	readonly title: string;
	readonly category: string;
	readonly excerpt: string;
	readonly featuredImage: string;
	readonly tags: readonly string[];
	readonly isPinned: boolean;
	readonly readingMinutes: number;
	readonly publishedAt: string | null;
}

export interface ArticleDetailData extends ArticleCard {
	readonly author: string;
	/** Pre-rendered, sanitized HTML from the Lexical content (build-time). */
	readonly htmlContent: string;
}

/** Sidebar facets (category counts + tag cloud) — mirrors cms.ts KnowledgeFacets. */
export interface KnowledgeFacets {
	readonly total: number;
	readonly categoryCounts: Readonly<Record<string, number>>;
	readonly tags: ReadonlyArray<{ readonly tag: string; readonly count: number }>;
}

type KnowledgeMode = "hub" | "category" | "tag" | "article";

export interface KnowledgeContentProps {
	readonly mode: KnowledgeMode;
	readonly appUrl: string;
	readonly version: string;
	readonly articles?: readonly ArticleCard[];
	readonly categorySlug?: string;
	readonly activeTag?: string;
	readonly article?: ArticleDetailData;
	readonly facets?: KnowledgeFacets;
}

/** Articles per page in the client-side paginated grid. */
const PAGE_SIZE = 6;
const EMPTY_FACETS: KnowledgeFacets = { total: 0, categoryCounts: {}, tags: [] };

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ArrowRightIcon() {
	return (
		<svg
			width="15"
			height="15"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d="M5 12h14M12 5l7 7-7 7" />
		</svg>
	);
}

function ChevronIcon({ dir }: { readonly dir: "left" | "right" }) {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
		</svg>
	);
}

function ChevronDownIcon() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M6 9l6 6 6-6" />
		</svg>
	);
}

function TagIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
			<circle cx="7" cy="7" r="1.2" fill="currentColor" />
		</svg>
	);
}

function PinIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M14.4 3.6 12 1.2 9.6 3.6l.9.9-3.3 3.3-2.7.6L3 10.9l4.2 4.2L2.4 20l-.3 1.9 1.9-.3 4.9-4.8 4.2 4.2 1.5-1.5-.6-2.7 3.3-3.3.9.9L22 12.8 14.4 5.2Z" />
		</svg>
	);
}

function ClockIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</svg>
	);
}

/** Reading-time label, e.g. "3 นาที" / "3 min read". */
function ReadingTime({ minutes }: { readonly minutes: number }) {
	const { t } = useLocale();
	return (
		<span className="inline-flex items-center gap-1">
			<ClockIcon />
			{minutes} {t("knowledge.minutesUnit")}
		</span>
	);
}

/** Footer meta shared by grid + featured cards: date · read time … read more. */
function CardMeta({ article }: { readonly article: ArticleCard }) {
	const { locale, t } = useLocale();
	const date = formatArticleDate(article.publishedAt, locale);
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
				{date && <time>{date}</time>}
				{date && <span aria-hidden="true">·</span>}
				<ReadingTime minutes={article.readingMinutes} />
			</span>
			<a
				href={articleHref(article.slug)}
				className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5 dark:text-cyan-300"
			>
				{t("knowledge.readMore")}
				<ArrowRightIcon />
			</a>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Breadcrumb({ crumbs }: { readonly crumbs: readonly Crumb[] }) {
	return (
		<nav
			className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400"
			aria-label="Breadcrumb"
		>
			{crumbs.map((crumb, index) => (
				<span key={crumb.label} className="flex items-center gap-2">
					{index > 0 && <span aria-hidden="true">/</span>}
					{crumb.href ? (
						<a
							href={crumb.href}
							className="transition-colors hover:text-slate-900 dark:hover:text-white"
						>
							{crumb.label}
						</a>
					) : (
						<span className="text-slate-700 dark:text-slate-200">{crumb.label}</span>
					)}
				</span>
			))}
		</nav>
	);
}

/** Category pill — color-coded per category. */
function CategoryBadge({ slug }: { readonly slug: string }) {
	const { t } = useLocale();
	if (!slug) return null;
	return (
		<a
			href={categoryHref(slug)}
			className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80 ${categoryColor(slug).badge}`}
		>
			{t(categoryLabelKey(slug))}
		</a>
	);
}

/** Cover image with a skeleton shimmer until it loads, then fades in. */
function CoverImage({
	src,
	alt,
	className,
}: {
	readonly src: string;
	readonly alt: string;
	readonly className?: string;
}) {
	const [loaded, setLoaded] = useState(false);
	const ref = useRef<HTMLImageElement>(null);

	useEffect(() => {
		// Images already complete at hydration won't fire onLoad — sync from the DOM.
		if (ref.current?.complete) setLoaded(true);
	}, []);

	if (!src) return null;
	return (
		<span className="relative block h-full w-full overflow-hidden">
			{!loaded && (
				<span
					className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-[#0b2138]"
					aria-hidden="true"
				/>
			)}
			<img
				ref={ref}
				src={src}
				alt={alt}
				loading="lazy"
				decoding="async"
				onLoad={() => setLoaded(true)}
				className={`relative h-full w-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"} ${className ?? ""}`}
			/>
		</span>
	);
}

/** Small tag chips linking to each tag's listing page. */
function TagList({ tags, max = 3 }: { readonly tags: readonly string[]; readonly max?: number }) {
	if (tags.length === 0) return null;
	return (
		<div className="mb-3 flex flex-wrap gap-1.5">
			{tags.slice(0, max).map((tag) => (
				<a
					key={tag}
					href={tagHref(tag)}
					className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary dark:bg-[#0b2138] dark:text-slate-300"
				>
					#{tag}
				</a>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function ArticleCardItem({ article }: { readonly article: ArticleCard }) {
	return (
		<article className="group flex h-full flex-col overflow-hidden rounded-xl border border-sky-200 bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-cyan-300/15 dark:bg-[#071b33] dark:hover:border-cyan-300/35">
			<a
				href={articleHref(article.slug)}
				className="block aspect-[16/9] overflow-hidden"
				tabIndex={-1}
				aria-label={article.title}
			>
				<CoverImage
					src={article.featuredImage}
					alt=""
					className="transition-transform duration-300 group-hover:scale-105"
				/>
			</a>
			<div className="flex flex-1 flex-col p-5">
				<div className="mb-3">
					<CategoryBadge slug={article.category} />
				</div>
				<h2 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-slate-900 dark:text-white">
					<a
						href={articleHref(article.slug)}
						title={article.title}
						className="hover:text-primary dark:hover:text-cyan-200"
					>
						{article.title}
					</a>
				</h2>
				{article.excerpt && (
					<p
						title={article.excerpt}
						className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300"
					>
						{article.excerpt}
					</p>
				)}
				<TagList tags={article.tags} />
				<div className="mt-auto">
					<CardMeta article={article} />
				</div>
			</div>
		</article>
	);
}

/** Compact horizontal hero card for a pinned article. */
function FeaturedCard({ article }: { readonly article: ArticleCard }) {
	const { t } = useLocale();
	return (
		<article className="group grid overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-sm transition-shadow hover:shadow-md md:grid-cols-2 dark:border-cyan-300/15 dark:bg-[#071b33]">
			<a
				href={articleHref(article.slug)}
				className="relative block h-52 overflow-hidden sm:h-60 md:h-full md:min-h-[280px]"
				tabIndex={-1}
				aria-label={article.title}
			>
				<CoverImage
					src={article.featuredImage}
					alt=""
					className="transition-transform duration-300 group-hover:scale-105"
				/>
				<span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground shadow-sm">
					<PinIcon />
					{t("knowledge.pinned")}
				</span>
			</a>
			<div className="flex flex-col justify-center p-6 sm:p-7">
				<div className="mb-3">
					<CategoryBadge slug={article.category} />
				</div>
				<h2 className="mb-2 line-clamp-2 text-xl font-extrabold leading-tight text-slate-950 sm:text-2xl dark:text-white">
					<a
						href={articleHref(article.slug)}
						title={article.title}
						className="hover:text-primary dark:hover:text-cyan-200"
					>
						{article.title}
					</a>
				</h2>
				{article.excerpt && (
					<p
						title={article.excerpt}
						className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300"
					>
						{article.excerpt}
					</p>
				)}
				<TagList tags={article.tags} max={3} />
				<CardMeta article={article} />
			</div>
		</article>
	);
}

/** Featured section: single card, or a swipeable carousel when >1 pinned. */
function FeaturedSection({ articles }: { readonly articles: readonly ArticleCard[] }) {
	const { t } = useLocale();
	const scrollRef = useRef<HTMLDivElement>(null);
	const [index, setIndex] = useState(0);
	const pinned = articles.filter((article) => article.isPinned);

	if (pinned.length === 0) return null;

	const scrollTo = (i: number) => {
		const el = scrollRef.current;
		if (!el) return;
		const clamped = Math.max(0, Math.min(i, pinned.length - 1));
		el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
	};

	const handleScroll = () => {
		const el = scrollRef.current;
		if (!el || el.clientWidth === 0) return;
		setIndex(Math.round(el.scrollLeft / el.clientWidth));
	};

	const multiple = pinned.length > 1;

	if (!multiple) {
		return (
			<div className="mb-8">
				<FeaturedCard article={pinned[0]} />
			</div>
		);
	}

	return (
		<div className="mb-8">
			<div
				ref={scrollRef}
				onScroll={handleScroll}
				className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
			>
				{pinned.map((article) => (
					<div key={article.slug} className="w-full shrink-0 snap-center">
						<FeaturedCard article={article} />
					</div>
				))}
			</div>
			<div className="mt-4 flex items-center justify-center gap-4">
				<button
					type="button"
					onClick={() => scrollTo(index - 1)}
					disabled={index === 0}
					aria-label={t("knowledge.previous")}
					className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-white text-slate-600 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-cyan-300/20 dark:bg-[#071b33] dark:text-slate-300"
				>
					<ChevronIcon dir="left" />
				</button>
				<div className="flex items-center gap-2">
					{pinned.map((article, i) => (
						<button
							key={article.slug}
							type="button"
							onClick={() => scrollTo(i)}
							aria-label={`${t("knowledge.featured")} ${i + 1}`}
							aria-current={i === index ? "true" : undefined}
							className={`h-2.5 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2.5 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600"}`}
						/>
					))}
				</div>
				<button
					type="button"
					onClick={() => scrollTo(index + 1)}
					disabled={index === pinned.length - 1}
					aria-label={t("knowledge.next")}
					className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-sky-200 bg-white text-slate-600 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-cyan-300/20 dark:bg-[#071b33] dark:text-slate-300"
				>
					<ChevronIcon dir="right" />
				</button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function ArticleCardSkeleton() {
	const bar = "animate-pulse rounded bg-slate-200 dark:bg-[#0b2138]";
	return (
		<div className="overflow-hidden rounded-xl border border-sky-200 bg-white dark:border-cyan-300/15 dark:bg-[#071b33]">
			<div className="aspect-[16/9] animate-pulse bg-slate-200 dark:bg-[#0b2138]" />
			<div className="space-y-3 p-5">
				<div className={`h-4 w-24 rounded-full ${bar}`} />
				<div className={`h-5 w-3/4 ${bar}`} />
				<div className={`h-4 w-full ${bar}`} />
				<div className={`h-4 w-5/6 ${bar}`} />
			</div>
		</div>
	);
}

function SkeletonGrid({ count = PAGE_SIZE }: { readonly count?: number }) {
	return (
		<div className="grid grid-cols-1 gap-5 sm:grid-cols-2" aria-hidden="true">
			{Array.from({ length: count }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: static placeholder list, never reordered.
				<ArticleCardSkeleton key={i} />
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Grid + pagination
// ---------------------------------------------------------------------------

function EmptyState({ message }: { readonly message: string }) {
	return (
		<div className="rounded-md border border-dashed border-sky-300 bg-sky-50 p-10 text-center dark:border-cyan-300/25 dark:bg-[#06172d]">
			<p className="mx-auto max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300">
				{message}
			</p>
		</div>
	);
}

function ArticleGrid({ articles }: { readonly articles: readonly ArticleCard[] }) {
	return (
		<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
			{articles.map((article) => (
				<ArticleCardItem key={article.slug} article={article} />
			))}
		</div>
	);
}

function Pagination({
	page,
	pageCount,
	onChange,
	disabled,
}: {
	readonly page: number;
	readonly pageCount: number;
	readonly onChange: (page: number) => void;
	readonly disabled: boolean;
}) {
	const { t } = useLocale();
	const btn =
		"inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
	const inactive =
		"border border-sky-200 bg-white text-slate-600 hover:border-primary hover:text-primary dark:border-cyan-300/20 dark:bg-[#071b33] dark:text-slate-300";
	return (
		<nav
			className="mt-8 flex items-center justify-center gap-1.5"
			aria-label={t("knowledge.pagination")}
		>
			<button
				type="button"
				onClick={() => onChange(page - 1)}
				disabled={disabled || page === 1}
				aria-label={t("knowledge.previous")}
				className={`${btn} ${inactive}`}
			>
				<ChevronIcon dir="left" />
			</button>
			{Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
				<button
					key={p}
					type="button"
					onClick={() => onChange(p)}
					disabled={disabled}
					aria-current={p === page ? "page" : undefined}
					className={`${btn} ${p === page ? "bg-primary text-primary-foreground" : inactive}`}
				>
					{p}
				</button>
			))}
			<button
				type="button"
				onClick={() => onChange(page + 1)}
				disabled={disabled || page === pageCount}
				aria-label={t("knowledge.next")}
				className={`${btn} ${inactive}`}
			>
				<ChevronIcon dir="right" />
			</button>
		</nav>
	);
}

/** Client-side paginated grid with a brief skeleton on page change. */
function PaginatedGrid({
	articles,
	emptyMessage,
}: {
	readonly articles: readonly ArticleCard[];
	readonly emptyMessage: string;
}) {
	const [page, setPage] = useState(1);
	const [pending, setPending] = useState(false);
	const topRef = useRef<HTMLDivElement>(null);

	const pageCount = Math.max(1, Math.ceil(articles.length / PAGE_SIZE));
	const current = Math.min(page, pageCount);
	const start = (current - 1) * PAGE_SIZE;
	const visible = articles.slice(start, start + PAGE_SIZE);

	const goTo = (next: number) => {
		if (next < 1 || next > pageCount || next === current || pending) return;
		setPending(true);
		topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
		window.setTimeout(() => {
			setPage(next);
			setPending(false);
		}, 300);
	};

	if (articles.length === 0) return <EmptyState message={emptyMessage} />;

	return (
		<div ref={topRef} className="scroll-mt-24">
			{pending ? (
				<SkeletonGrid count={Math.min(PAGE_SIZE, visible.length)} />
			) : (
				<ArticleGrid articles={visible} />
			)}
			{pageCount > 1 && (
				<Pagination page={current} pageCount={pageCount} onChange={goTo} disabled={pending} />
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

/** Tracks the lg breakpoint (1024px) so aria state matches the CSS-forced-open desktop layout. */
function useIsDesktop() {
	const [isDesktop, setIsDesktop] = useState(false);
	useEffect(() => {
		const mq = window.matchMedia("(min-width: 1024px)");
		const update = () => setIsDesktop(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);
	return isDesktop;
}

/**
 * Sidebar card whose body collapses on mobile via a header toggle.
 * On lg+ it is permanently expanded (CSS `lg:block`), so desktop never flashes
 * and needs no JS; the toggle is disabled and the chevron hidden there.
 */
function SidebarCard({
	title,
	icon,
	defaultOpen = true,
	children,
}: {
	readonly title: string;
	readonly icon?: React.ReactNode;
	readonly defaultOpen?: boolean;
	readonly children: React.ReactNode;
}) {
	const isDesktop = useIsDesktop();
	const [openMobile, setOpenMobile] = useState(defaultOpen);
	const contentId = useId();
	const expanded = isDesktop || openMobile;
	const bodyVisibility = openMobile ? "block" : "hidden";

	return (
		<div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-xs dark:border-cyan-300/15 dark:bg-[#071b33]">
			<button
				type="button"
				onClick={() => setOpenMobile((v) => !v)}
				aria-expanded={expanded}
				aria-controls={contentId}
				className="flex w-full items-center justify-between gap-2 text-left lg:pointer-events-none"
			>
				<h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-white">
					{icon}
					{title}
				</h2>
				<span
					className={`shrink-0 text-slate-400 transition-transform lg:hidden ${openMobile ? "rotate-180" : ""}`}
					aria-hidden="true"
				>
					<ChevronDownIcon />
				</span>
			</button>
			<div id={contentId} className={`mt-4 ${bodyVisibility} lg:block`}>
				{children}
			</div>
		</div>
	);
}

function Sidebar({
	facets,
	activeSlug,
	activeTag,
}: {
	readonly facets: KnowledgeFacets;
	readonly activeSlug?: string;
	readonly activeTag?: string;
}) {
	const { t } = useLocale();
	const rowBase =
		"flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors";
	const activeRow = "bg-primary text-primary-foreground";
	const inactiveRow = "text-slate-700 hover:bg-sky-50 dark:text-slate-200 dark:hover:bg-[#0b2138]";
	const countBase =
		"inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold";
	const activeCount = "bg-white/20 text-primary-foreground";
	const inactiveCount = "bg-slate-100 text-slate-600 dark:bg-[#0b2138] dark:text-slate-300";
	const noCategory = !activeSlug;

	return (
		<aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
			<SidebarCard title={t("knowledge.categoriesTitle")}>
				<nav aria-label={t("knowledge.browseByCategory")} className="flex flex-col gap-1">
					<a
						href={knowledgeHref()}
						aria-current={noCategory && !activeTag ? "page" : undefined}
						className={`${rowBase} ${noCategory && !activeTag ? activeRow : inactiveRow}`}
					>
						<span>{t("knowledge.allArticles")}</span>
						<span
							className={`${countBase} ${noCategory && !activeTag ? activeCount : inactiveCount}`}
						>
							{facets.total}
						</span>
					</a>
					{KNOWLEDGE_CATEGORIES.map((category) => {
						const count = facets.categoryCounts[category.slug] ?? 0;
						if (count === 0) return null;
						const isActive = category.slug === activeSlug;
						return (
							<a
								key={category.slug}
								href={categoryHref(category)}
								aria-current={isActive ? "page" : undefined}
								className={`${rowBase} ${isActive ? activeRow : inactiveRow}`}
							>
								<span className="flex min-w-0 items-center gap-2.5">
									<span
										className={`h-2 w-2 shrink-0 rounded-full ${isActive ? "bg-white/70" : categoryColor(category.slug).dot}`}
										aria-hidden="true"
									/>
									<span className="truncate" title={t(category.labelKey)}>
										{t(category.labelKey)}
									</span>
								</span>
								<span className={`${countBase} ${isActive ? activeCount : inactiveCount}`}>
									{count}
								</span>
							</a>
						);
					})}
				</nav>
			</SidebarCard>

			{facets.tags.length > 0 && (
				<SidebarCard
					title={t("knowledge.popularTags")}
					defaultOpen={false}
					icon={
						<span className="text-primary dark:text-cyan-300">
							<TagIcon />
						</span>
					}
				>
					<div className="flex flex-wrap gap-2">
						{facets.tags.map(({ tag, count }) => {
							const isActive = tag === activeTag;
							return (
								<a
									key={tag}
									href={tagHref(tag)}
									title={`${count}`}
									aria-current={isActive ? "page" : undefined}
									className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
										isActive
											? "bg-primary text-primary-foreground"
											: "bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary dark:bg-[#0b2138] dark:text-slate-300 dark:hover:bg-cyan-300/10 dark:hover:text-cyan-200"
									}`}
								>
									#{tag}
								</a>
							);
						})}
					</div>
				</SidebarCard>
			)}
		</aside>
	);
}

// ---------------------------------------------------------------------------
// Mode bodies
// ---------------------------------------------------------------------------

/** Two-column shell: left sidebar rail + main column. */
function KnowledgeLayout({
	facets,
	activeSlug,
	activeTag,
	children,
}: {
	readonly facets: KnowledgeFacets;
	readonly activeSlug?: string;
	readonly activeTag?: string;
	readonly children: React.ReactNode;
}) {
	return (
		<section className="bg-white py-12 dark:bg-[#041225]">
			<div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)]">
				<Sidebar facets={facets} activeSlug={activeSlug} activeTag={activeTag} />
				<div>{children}</div>
			</div>
		</section>
	);
}

function HubBody({
	articles,
	facets,
}: {
	readonly articles: readonly ArticleCard[];
	readonly facets: KnowledgeFacets;
}) {
	const { t } = useLocale();
	const crumbs: Crumb[] = [{ label: t("nav.home"), href: "/" }, { label: t("knowledge.title") }];
	const pinnedSlugs = new Set(articles.filter((a) => a.isPinned).map((a) => a.slug));
	const rest = articles.filter((article) => !pinnedSlugs.has(article.slug));
	return (
		<>
			<PageHero title={t("knowledge.title")} subtitle={t("knowledge.subtitle")} crumbs={crumbs} />
			<KnowledgeLayout facets={facets}>
				<FeaturedSection articles={articles} />
				<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
					{t("knowledge.latestArticles")}
				</h2>
				<PaginatedGrid articles={rest} emptyMessage={t("knowledge.empty")} />
			</KnowledgeLayout>
		</>
	);
}

function CategoryBody({
	categorySlug,
	articles,
	facets,
}: {
	readonly categorySlug: string;
	readonly articles: readonly ArticleCard[];
	readonly facets: KnowledgeFacets;
}) {
	const { t } = useLocale();
	const label = t(categoryLabelKey(categorySlug));
	const crumbs: Crumb[] = [
		{ label: t("nav.home"), href: "/" },
		{ label: t("knowledge.title"), href: knowledgeHref() },
		{ label },
	];
	return (
		<>
			<PageHero title={label} crumbs={crumbs} />
			<KnowledgeLayout facets={facets} activeSlug={categorySlug}>
				<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
					{t("knowledge.articlesInCategory")}
				</h2>
				<PaginatedGrid articles={articles} emptyMessage={t("knowledge.emptyCategory")} />
			</KnowledgeLayout>
		</>
	);
}

function TagBody({
	tag,
	articles,
	facets,
}: {
	readonly tag: string;
	readonly articles: readonly ArticleCard[];
	readonly facets: KnowledgeFacets;
}) {
	const { t } = useLocale();
	const crumbs: Crumb[] = [
		{ label: t("nav.home"), href: "/" },
		{ label: t("knowledge.title"), href: knowledgeHref() },
		{ label: `#${tag}` },
	];
	return (
		<>
			<PageHero title={`#${tag}`} subtitle={t("knowledge.taggedWith")} crumbs={crumbs} />
			<KnowledgeLayout facets={facets} activeTag={tag}>
				<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
					{t("knowledge.taggedWith")} #{tag}
				</h2>
				<PaginatedGrid articles={articles} emptyMessage={t("knowledge.emptyTag")} />
			</KnowledgeLayout>
		</>
	);
}

function ArticleBody({ article }: { readonly article: ArticleDetailData }) {
	const { locale, t } = useLocale();
	const date = formatArticleDate(article.publishedAt, locale);
	const categoryLabel = article.category ? t(categoryLabelKey(article.category)) : undefined;
	const crumbs: Crumb[] = [
		{ label: t("nav.home"), href: "/" },
		{ label: t("knowledge.title"), href: knowledgeHref() },
	];
	if (article.category) {
		crumbs.push({ label: categoryLabel as string, href: categoryHref(article.category) });
	}
	crumbs.push({ label: article.title });

	return (
		<>
			<section className="border-b border-slate-200 bg-sky-50 dark:border-cyan-300/10 dark:bg-[#041225]">
				<div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
					<Breadcrumb crumbs={crumbs} />
					<div className="mb-4">
						<CategoryBadge slug={article.category} />
					</div>
					<h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl dark:text-white">
						{article.title}
					</h1>
					<p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
						{article.author && (
							<span>
								{t("knowledge.by")} {article.author}
							</span>
						)}
						{date && (
							<span>
								{t("knowledge.publishedOn")} {date}
							</span>
						)}
						<ReadingTime minutes={article.readingMinutes} />
					</p>
					{article.tags.length > 0 && (
						<div className="mt-4">
							<TagList tags={article.tags} max={6} />
						</div>
					)}
				</div>
			</section>

			{article.featuredImage && (
				<div className="mx-auto max-w-[1180px] px-4 pt-12 sm:px-6">
					<div className="aspect-[21/9] overflow-hidden rounded-2xl border border-sky-200 dark:border-cyan-300/15">
						<CoverImage src={article.featuredImage} alt={article.title} />
					</div>
				</div>
			)}

			<section className="bg-white py-12 dark:bg-[#041225]">
				<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
					<div
						className="prose-knowledge text-base leading-relaxed text-slate-700 dark:text-slate-200"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: build-time sanitized HTML from lexicalToHtml (trusted CMS authors, fixed tag whitelist).
						dangerouslySetInnerHTML={{ __html: article.htmlContent }}
					/>
					<div className="mt-10 border-t border-sky-200 pt-6 dark:border-cyan-300/15">
						<a
							href={knowledgeHref()}
							className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 dark:text-cyan-300"
						>
							← {t("knowledge.backToHub")}
						</a>
					</div>
				</div>
			</section>
		</>
	);
}

// ---------------------------------------------------------------------------
// Inner + root
// ---------------------------------------------------------------------------

// KnowledgeBody — rendered inside SiteShell's LocaleProvider
function KnowledgeBody({
	mode,
	articles,
	categorySlug,
	activeTag,
	article,
	facets,
}: Omit<KnowledgeContentProps, "appUrl" | "version">) {
	const resolvedFacets = facets ?? EMPTY_FACETS;
	const list = articles ?? [];

	if (mode === "article" && article) {
		return <ArticleBody article={article} />;
	}
	if (mode === "tag" && activeTag) {
		return <TagBody tag={activeTag} articles={list} facets={resolvedFacets} />;
	}
	if (mode === "category" && categorySlug && getCategoryBySlug(categorySlug)) {
		return <CategoryBody categorySlug={categorySlug} articles={list} facets={resolvedFacets} />;
	}
	return <HubBody articles={list} facets={resolvedFacets} />;
}

export function KnowledgeContent({ appUrl, version, ...bodyProps }: KnowledgeContentProps) {
	return (
		<SiteShell appUrl={appUrl} version={version}>
			<KnowledgeBody {...bodyProps} />
		</SiteShell>
	);
}
