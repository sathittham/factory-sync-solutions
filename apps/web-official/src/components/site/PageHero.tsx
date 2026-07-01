"use client";

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Shared page hero — the standard header banner for every content page.
// Left-aligned: breadcrumb → title → subtitle → optional actions. Keeping this
// in one place is what makes the Services / Knowledge / Contact / About headers
// visually consistent.
// ---------------------------------------------------------------------------

export interface Crumb {
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

export interface PageHeroProps {
	readonly title: string;
	readonly subtitle?: string;
	readonly crumbs?: readonly Crumb[];
	/** Optional call-to-action row rendered below the subtitle. */
	readonly children?: ReactNode;
}

export function PageHero({ title, subtitle, crumbs, children }: PageHeroProps) {
	return (
		<section className="relative overflow-hidden border-b border-slate-200 bg-sky-50 dark:border-cyan-300/10 dark:bg-[#041225]">
			<div className="relative mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
				{crumbs && crumbs.length > 0 && <Breadcrumb crumbs={crumbs} />}
				<h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl dark:text-white">
					{title}
				</h1>
				{subtitle && (
					<p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
						{subtitle}
					</p>
				)}
				{children && <div className="mt-7 flex flex-wrap gap-3">{children}</div>}
			</div>
		</section>
	);
}
