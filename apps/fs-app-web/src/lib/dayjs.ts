import dayjs from "dayjs";
import buddhistEra from "dayjs/plugin/buddhistEra";

dayjs.extend(buddhistEra);

/**
 * Format a date string with locale awareness.
 * Thai locale uses Buddhist Era (พ.ศ.) via the BBBB token.
 *
 * @param date  - ISO date string or Date
 * @param locale - "th" or "en"
 * @param withTime - include time (default true)
 */
export function formatDateTime(date: string | Date, locale: string, withTime = true): string {
	if (!date) return "--";
	const d = dayjs(date);
	if (!d.isValid()) return "--";

	if (locale === "th") {
		// D MMM BBBB = "7 มี.ค. 2569", D MMM BBBB HH:mm = "7 มี.ค. 2569 14:30"
		return withTime ? d.format("D/MM/BBBB HH:mm") : d.format("D/MM/BBBB");
	}
	// EN: "7 Mar 2026 14:30" or "7 Mar 2026"
	return withTime ? d.format("D/MM/YYYY HH:mm") : d.format("D/MM/YYYY");
}

export { dayjs };
