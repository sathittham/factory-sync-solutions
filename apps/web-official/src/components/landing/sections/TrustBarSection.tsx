"use client";

import { useLocale } from "@/lib/i18n";

const TRUST_ICONS = [
	// trophy with laurel wreath
	<svg
		key="trophy"
		width="30"
		height="30"
		viewBox="0 0 24 24"
		fill="currentColor"
		className="text-blue-500 dark:text-cyan-300"
		aria-hidden="true"
	>
		{/* trophy */}
		<path d="M17 4V2.8c0-.44-.36-.8-.8-.8H7.8c-.44 0-.8.36-.8.8V4H3.8c-.44 0-.8.36-.8.8V7a4 4 0 0 0 4 4h.36A5 5 0 0 0 11 13.9V16H8.6a.8.8 0 0 0 0 1.6h6.8a.8.8 0 0 0 0-1.6H13v-2.1A5 5 0 0 0 16.64 11H17a4 4 0 0 0 4-4V4.8c0-.44-.36-.8-.8-.8H17zM7 9.2A2.2 2.2 0 0 1 4.8 7v-1.2H7V9.2zm12-2.2A2.2 2.2 0 0 1 16.8 9.2V5.8H19V7z" />
		{/* base */}
		<path d="M9 18.4h6c.44 0 .8.36.8.8V21a.8.8 0 0 1-.8.8H9a.8.8 0 0 1-.8-.8v-1.8c0-.44.36-.8.8-.8z" />
		{/* laurel left */}
		<path
			d="M4.1 13.3c-.7 1.2-.9 2.7-.5 4.1 1-.4 1.8-1.2 2.2-2.2-.8-.1-1.5-.7-1.7-1.5.7.3 1.5.1 2-.4-.7-.3-1.2-1-1.2-1.8.6.4 1.4.4 2 0-.6-.4-1-1.1-.9-1.9-1 .5-1.7 1.5-1.9 2.6"
			opacity=".85"
		/>
		{/* laurel right */}
		<path
			d="M19.9 13.3c.7 1.2.9 2.7.5 4.1-1-.4-1.8-1.2-2.2-2.2.8-.1 1.5-.7 1.7-1.5-.7.3-1.5.1-2-.4.7-.3 1.2-1 1.2-1.8-.6.4-1.4.4-2 0 .6-.4 1-1.1.9-1.9 1 .5 1.7 1.5 1.9 2.6"
			opacity=".85"
		/>
	</svg>,
	// factory (filled, windows cut out)
	<svg
		key="factory"
		width="30"
		height="30"
		viewBox="0 0 24 24"
		fill="currentColor"
		fillRule="evenodd"
		clipRule="evenodd"
		className="text-blue-500 dark:text-cyan-300"
		aria-hidden="true"
	>
		{/* chimney */}
		<path d="M4 4h2v6H4z" />
		{/* body + roof with window cutouts */}
		<path d="M2 21V9l6 3.6V9l6 3.6V9l8 4.4V21H2zM6 18.6h2.2v-3H6v3zm5 0h2.2v-3H11v3zm5 0h2.2v-3H16v3z" />
	</svg>,
	// star medal
	<svg
		key="star"
		width="30"
		height="30"
		viewBox="0 0 24 24"
		fill="currentColor"
		fillRule="evenodd"
		clipRule="evenodd"
		className="text-blue-500 dark:text-cyan-300"
		aria-hidden="true"
	>
		{/* outer medal circle with star hole */}
		<path d="M12 1.5A9.5 9.5 0 1 0 12 20.5 9.5 9.5 0 0 0 12 1.5zm0 4.3 1.9 3.85 4.25.62-3.07 3 .72 4.23L12 15.5l-3.8 2-.73-4.23-3.07-3 4.25-.62L12 5.8z" />
		{/* ribbon tails */}
		<path
			d="M8.4 18.6 6.5 22.5l-1.3-2.1-2.5.2 1.6-3.3a9.6 9.6 0 0 0 4.1 1.3zm7.2 0a9.6 9.6 0 0 0 4.1-1.3l1.6 3.3-2.5-.2-1.3 2.1-1.9-3.9z"
			opacity=".85"
		/>
	</svg>,
	// shield with check
	<svg
		key="shield"
		width="30"
		height="30"
		viewBox="0 0 24 24"
		fill="currentColor"
		fillRule="evenodd"
		clipRule="evenodd"
		className="text-blue-500 dark:text-cyan-300"
		aria-hidden="true"
	>
		<path d="M12 1.7 20 4.8v6.2c0 5.1-3.4 8.9-8 10.5-4.6-1.6-8-5.4-8-10.5V4.8l8-3.1zm4.2 6.6-1.5-1.4-4.4 4.5-1.9-1.9-1.5 1.5 3.4 3.4 5.9-6.1z" />
	</svg>,
];

export function TrustBarSection() {
	const { t } = useLocale();

	const items = [
		{
			icon: TRUST_ICONS[0],
			titleKey: "landing.trust.exp",
			subKey: "landing.trust.expSub",
		},
		{
			icon: TRUST_ICONS[1],
			titleKey: "landing.trust.consult",
			subKey: "landing.trust.consultSub",
		},
		{
			icon: TRUST_ICONS[2],
			titleKey: "landing.trust.eng",
			subKey: "landing.trust.engSub",
		},
		{
			icon: TRUST_ICONS[3],
			titleKey: "landing.trust.std",
			subKey: "landing.trust.stdSub",
		},
	];

	return (
		<section className="border-y border-sky-200 bg-white py-5 text-slate-950 dark:border-cyan-300/20 dark:bg-[#06172d] dark:text-white">
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<div className="grid grid-cols-1 divide-y divide-sky-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 dark:divide-cyan-300/15">
					{items.map((item) => (
						<div
							key={item.titleKey}
							className="flex items-center gap-4 px-5 py-4 first:pl-0 last:pr-0"
						>
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 dark:border-cyan-300/30 dark:bg-cyan-300/10">
								{item.icon}
							</div>
							<div>
								<p className="text-sm font-bold leading-snug text-slate-950 dark:text-white">
									{t(item.titleKey)}
								</p>
								<p className="mt-1 text-sm leading-snug text-cyan-700 sm:text-xs dark:text-cyan-300">
									{t(item.subKey)}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
