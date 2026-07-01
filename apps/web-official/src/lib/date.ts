import type { Locale } from "./i18n";

// web-official has no dayjs (unlike web-app); use Intl directly. Thai locale
// renders the Buddhist Era (พ.ศ.) via the `buddhist` calendar, matching the
// project-wide date convention. Returns "" for missing/invalid input.
export function formatArticleDate(iso: string | null | undefined, locale: Locale): string {
	if (!iso) return "";
	const ms = Date.parse(iso);
	if (Number.isNaN(ms)) return "";
	const date = new Date(ms);
	const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
	if (locale === "th") {
		return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", options).format(date);
	}
	return new Intl.DateTimeFormat("en-GB", options).format(date);
}
