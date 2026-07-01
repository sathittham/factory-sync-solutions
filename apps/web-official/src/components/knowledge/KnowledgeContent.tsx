import { SiteNav } from "@/components/SiteNavBar";
import { SiteFooter, useTheme } from "@/components/site/chrome";
import { formatArticleDate } from "@/lib/date";
import { LocaleProvider, useLocale } from "@/lib/i18n";
import {
	KNOWLEDGE_CATEGORIES,
	articleHref,
	categoryHref,
	categoryLabelKey,
	getCategoryBySlug,
	knowledgeHref,
} from "@/lib/knowledge";

// ---------------------------------------------------------------------------
// Serializable view models (passed from Astro frontmatter)
// ---------------------------------------------------------------------------

export interface ArticleCard {
	readonly slug: string;
	readonly title: string;
	readonly category: string;
	readonly excerpt: string;
	readonly publishedAt: string | null;
}

export interface ArticleDetailData extends ArticleCard {
	readonly author: string;
	/** Pre-rendered, sanitized HTML from the Lexical content (build-time). */
	readonly htmlContent: string;
}

type KnowledgeMode = "hub" | "category" | "article";

export interface KnowledgeContentProps {
	readonly mode: KnowledgeMode;
	readonly appUrl: string;
	readonly version: string;
	readonly articles?: readonly ArticleCard[];
	readonly categorySlug?: string;
	readonly article?: ArticleDetailData;
}

// ---------------------------------------------------------------------------
// Icons + small pieces
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

interface Crumb {
	readonly label: string;
	readonly href?: string;
}

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

function CategoryBadge({ slug }: { readonly slug: string }) {
	const { t } = useLocale();
	if (!slug) return null;
	return (
		<a
			href={categoryHref(slug)}
			className="inline-flex items-center rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-600/20 dark:bg-cyan-300/10 dark:text-cyan-200 dark:hover:bg-cyan-300/20"
		>
			{t(categoryLabelKey(slug))}
		</a>
	);
}

function Hero({
	title,
	subtitle,
	crumbs,
}: {
	readonly title: string;
	readonly subtitle?: string;
	readonly crumbs: readonly Crumb[];
}) {
	return (
		<section className="relative overflow-hidden border-b border-slate-200 bg-sky-50 dark:border-cyan-300/10 dark:bg-[#041225]">
			<div className="relative mx-auto max-w-[1180px] px-4 py-14 sm:px-6 sm:py-16">
				<Breadcrumb crumbs={crumbs} />
				<h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl dark:text-white">
					{title}
				</h1>
				{subtitle && (
					<p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
						{subtitle}
					</p>
				)}
			</div>
		</section>
	);
}

/** Category filter chips — links to each of the 8 category pages. */
function CategoryChips({ activeSlug }: { readonly activeSlug?: string }) {
	const { t } = useLocale();
	return (
		<nav aria-label={t("knowledge.browseByCategory")} className="flex flex-wrap gap-2">
			<a
				href={knowledgeHref()}
				className={chipClass(!activeSlug)}
				aria-current={activeSlug ? undefined : "page"}
			>
				{t("knowledge.allArticles")}
			</a>
			{KNOWLEDGE_CATEGORIES.map((category) => {
				const isActive = category.slug === activeSlug;
				return (
					<a
						key={category.slug}
						href={categoryHref(category)}
						className={chipClass(isActive)}
						aria-current={isActive ? "page" : undefined}
					>
						{t(category.labelKey)}
					</a>
				);
			})}
		</nav>
	);
}

function chipClass(active: boolean): string {
	const base =
		"inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors";
	if (active) {
		return `${base} bg-blue-600 text-white shadow-sm`;
	}
	return `${base} border border-sky-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-cyan-300/20 dark:bg-[#071b33] dark:text-slate-200 dark:hover:border-cyan-300/40`;
}

function ArticleCardItem({ article }: { readonly article: ArticleCard }) {
	const { locale, t } = useLocale();
	const date = formatArticleDate(article.publishedAt, locale);
	return (
		<article className="group flex h-full flex-col rounded-md border border-sky-200 bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-cyan-300/15 dark:bg-[#071b33] dark:hover:border-cyan-300/35">
			<div className="mb-3 flex items-center justify-between gap-2">
				<CategoryBadge slug={article.category} />
				{date && <time className="text-xs text-slate-400">{date}</time>}
			</div>
			<h2 className="mb-2 text-lg font-bold leading-snug text-slate-900 dark:text-white">
				<a
					href={articleHref(article.slug)}
					className="hover:text-blue-700 dark:hover:text-cyan-200"
				>
					{article.title}
				</a>
			</h2>
			{article.excerpt && (
				<p className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
					{article.excerpt}
				</p>
			)}
			<a
				href={articleHref(article.slug)}
				className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-transform group-hover:translate-x-0.5 dark:text-cyan-300"
			>
				{t("knowledge.readMore")}
				<ArrowRightIcon />
			</a>
		</article>
	);
}

function EmptyState({ message }: { readonly message: string }) {
	return (
		<div className="rounded-md border border-dashed border-sky-300 bg-sky-50 p-10 text-center dark:border-cyan-300/25 dark:bg-[#06172d]">
			<p className="mx-auto max-w-lg text-base leading-relaxed text-slate-600 dark:text-slate-300">
				{message}
			</p>
		</div>
	);
}

function ArticleGrid({
	articles,
	emptyMessage,
}: {
	readonly articles: readonly ArticleCard[];
	readonly emptyMessage: string;
}) {
	if (articles.length === 0) return <EmptyState message={emptyMessage} />;
	return (
		<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{articles.map((article) => (
				<ArticleCardItem key={article.slug} article={article} />
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Mode bodies
// ---------------------------------------------------------------------------

function HubBody({ articles }: { readonly articles: readonly ArticleCard[] }) {
	const { t } = useLocale();
	const crumbs: Crumb[] = [{ label: t("nav.home"), href: "/" }, { label: t("knowledge.title") }];
	return (
		<>
			<Hero title={t("knowledge.title")} subtitle={t("knowledge.subtitle")} crumbs={crumbs} />
			<section className="bg-white py-10 dark:bg-[#041225]">
				<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
					<div className="mb-8">
						<CategoryChips />
					</div>
					<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
						{t("knowledge.latestArticles")}
					</h2>
					<ArticleGrid articles={articles} emptyMessage={t("knowledge.empty")} />
				</div>
			</section>
		</>
	);
}

function CategoryBody({
	categorySlug,
	articles,
}: {
	readonly categorySlug: string;
	readonly articles: readonly ArticleCard[];
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
			<Hero title={label} crumbs={crumbs} />
			<section className="bg-white py-10 dark:bg-[#041225]">
				<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
					<div className="mb-8">
						<CategoryChips activeSlug={categorySlug} />
					</div>
					<h2 className="mb-6 text-2xl font-extrabold text-slate-950 dark:text-white">
						{t("knowledge.articlesInCategory")}
					</h2>
					<ArticleGrid articles={articles} emptyMessage={t("knowledge.emptyCategory")} />
				</div>
			</section>
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
				<div className="mx-auto max-w-[820px] px-4 py-12 sm:px-6 sm:py-14">
					<Breadcrumb crumbs={crumbs} />
					<div className="mb-4">
						<CategoryBadge slug={article.category} />
					</div>
					<h1 className="text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl dark:text-white">
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
					</p>
				</div>
			</section>

			<section className="bg-white py-12 dark:bg-[#041225]">
				<div className="mx-auto max-w-[820px] px-4 sm:px-6">
					<div
						className="prose-knowledge text-base leading-relaxed text-slate-700 dark:text-slate-200"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: build-time sanitized HTML from lexicalToHtml (trusted CMS authors, fixed tag whitelist).
						dangerouslySetInnerHTML={{ __html: article.htmlContent }}
					/>
					<div className="mt-10 border-t border-sky-200 pt-6 dark:border-cyan-300/15">
						<a
							href={knowledgeHref()}
							className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-cyan-300"
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

function KnowledgeInner({
	mode,
	appUrl,
	version,
	articles,
	categorySlug,
	article,
}: KnowledgeContentProps) {
	const { theme, resolvedTheme, setTheme } = useTheme();

	let body: React.ReactNode = null;
	if (mode === "article" && article) {
		body = <ArticleBody article={article} />;
	} else if (mode === "category" && categorySlug && getCategoryBySlug(categorySlug)) {
		body = <CategoryBody categorySlug={categorySlug} articles={articles ?? []} />;
	} else {
		body = <HubBody articles={articles ?? []} />;
	}

	return (
		<div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-[#041225] dark:text-slate-100">
			<SiteNav appUrl={appUrl} theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} />
			<main className="flex-1">{body}</main>
			<SiteFooter version={version} resolvedTheme={resolvedTheme} />
		</div>
	);
}

export function KnowledgeContent(props: KnowledgeContentProps) {
	return (
		<LocaleProvider>
			<KnowledgeInner {...props} />
		</LocaleProvider>
	);
}
