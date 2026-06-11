"use client";

import { FadeIn } from "@/components/motion";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const RESULTS_CARDS = {
	th: [
		{
			badge: "A",
			industry: "AUTOPARTS",
			metric: "-28%",
			metricColor: "text-red-400",
			desc: "ลดของเสีย",
			timeframe: "ภายใน 6 เดือน",
		},
		{
			badge: "B",
			industry: "BEVERAGE",
			metric: "+22%",
			metricColor: "text-green-400",
			desc: "เพิ่มผลภาพ",
			timeframe: "ภายใน 5 เดือน",
		},
		{
			badge: "E",
			industry: "ELECTRONICS",
			metric: "-35%",
			metricColor: "text-red-400",
			desc: "ลดเวลาหยุดเครื่อง",
			timeframe: "ภายใน 4 เดือน",
		},
		{
			badge: "P",
			industry: "PACKAGING",
			metric: "+18%",
			metricColor: "text-green-400",
			desc: "ปรับปรุงการส่งมอบ",
			timeframe: "ภายใน 3 เดือน",
		},
	],
	en: [
		{
			badge: "A",
			industry: "AUTOPARTS",
			metric: "-28%",
			metricColor: "text-red-400",
			desc: "Defect reduction",
			timeframe: "within 6 months",
		},
		{
			badge: "B",
			industry: "BEVERAGE",
			metric: "+22%",
			metricColor: "text-green-400",
			desc: "Productivity gain",
			timeframe: "within 5 months",
		},
		{
			badge: "E",
			industry: "ELECTRONICS",
			metric: "-35%",
			metricColor: "text-red-400",
			desc: "Downtime reduction",
			timeframe: "within 4 months",
		},
		{
			badge: "P",
			industry: "PACKAGING",
			metric: "+18%",
			metricColor: "text-green-400",
			desc: "Delivery improvement",
			timeframe: "within 3 months",
		},
	],
};

export function ResultsSection() {
	const { t, locale } = useLocale();
	const cards = RESULTS_CARDS[locale];

	return (
		<section id="results" className="bg-white py-12 dark:bg-[#041225]">
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<FadeIn>
					<div className="mb-8 text-center">
						<h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
							{t("landing.results.title")}
						</h2>
					</div>
				</FadeIn>

				{/* All 4 cards — carousel on mobile via overflow-x-auto, grid on desktop */}
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{cards.map((card) => (
						<div
							key={card.badge + card.industry}
							className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md dark:border-cyan-300/15 dark:bg-[#071b33] dark:shadow-none"
						>
							<div className="flex items-center gap-3">
								<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg font-extrabold text-white dark:bg-cyan-300/15">
									{card.badge}
								</div>
								<span className="text-xs font-bold text-slate-400 tracking-widest uppercase">
									{card.industry}
								</span>
							</div>
							<div>
								<div className={cn("text-3xl font-extrabold", card.metricColor)}>{card.metric}</div>
								<p className="text-slate-700 font-semibold mt-1 dark:text-slate-200">{card.desc}</p>
							</div>
							<p className="text-slate-400 text-sm border-t border-slate-100 pt-3">
								{card.timeframe}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
