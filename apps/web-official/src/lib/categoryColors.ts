// Per-category color tokens for the Knowledge Hub. Each of the 8 categories gets
// a distinct hue so badges and sidebar dots are visually scannable. Class strings
// are written out in full (not composed) so Tailwind's scanner keeps them.

export interface CategoryColor {
	/** Pill badge (light + dark). */
	readonly badge: string;
	/** Small solid dot before a sidebar label. */
	readonly dot: string;
}

const FALLBACK: CategoryColor = {
	badge: "bg-slate-500/10 text-slate-700 dark:bg-slate-400/10 dark:text-slate-300",
	dot: "bg-slate-400",
};

const CATEGORY_COLORS: Readonly<Record<string, CategoryColor>> = {
	"law-licensing": {
		badge: "bg-blue-500/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
		dot: "bg-blue-500",
	},
	"factory-safety": {
		badge: "bg-rose-500/10 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300",
		dot: "bg-rose-500",
	},
	"digital-factory": {
		badge: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
		dot: "bg-violet-500",
	},
	"machinery-automation": {
		badge: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
		dot: "bg-amber-500",
	},
	environment: {
		badge: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
		dot: "bg-emerald-500",
	},
	"lean-kaizen": {
		badge: "bg-teal-500/10 text-teal-700 dark:bg-teal-400/10 dark:text-teal-300",
		dot: "bg-teal-500",
	},
	"digital-marketing": {
		badge: "bg-fuchsia-500/10 text-fuchsia-700 dark:bg-fuchsia-400/10 dark:text-fuchsia-300",
		dot: "bg-fuchsia-500",
	},
	"gov-benefits": {
		badge: "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300",
		dot: "bg-indigo-500",
	},
};

/** Color tokens for a category slug (falls back to a neutral slate). */
export function categoryColor(slug: string): CategoryColor {
	return CATEGORY_COLORS[slug] ?? FALLBACK;
}
