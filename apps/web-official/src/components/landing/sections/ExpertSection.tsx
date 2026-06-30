"use client";

import { FadeIn } from "@/components/motion";
import { useLocale } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// GoldSeal SVG
// ---------------------------------------------------------------------------

function GoldSeal() {
	const { t } = useLocale();

	return (
		<svg
			width="48"
			height="48"
			viewBox="0 0 64 64"
			aria-label={t("landing.goldSeal.ariaLabel")}
			role="img"
			className="h-12 w-12 shrink-0"
		>
			<circle cx="32" cy="32" r="28" fill="#b45309" opacity="0.9" />
			<circle cx="32" cy="32" r="24" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
			<circle cx="32" cy="32" r="20" fill="#92400e" opacity="0.7" />
			<text x="32" y="29" textAnchor="middle" fontSize="7" fill="#fde68a" fontWeight="bold">
				{t("landing.seal.line1")}
			</text>
			<text x="32" y="38" textAnchor="middle" fontSize="7" fill="#fde68a" fontWeight="bold">
				{t("landing.seal.line2")}
			</text>
			{[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
				const rad = (deg * Math.PI) / 180;
				const x1 = (32 + 26 * Math.cos(rad)).toFixed(3);
				const y1 = (32 + 26 * Math.sin(rad)).toFixed(3);
				const x2 = (32 + 30 * Math.cos(rad)).toFixed(3);
				const y2 = (32 + 30 * Math.sin(rad)).toFixed(3);
				return (
					<line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth="1.5" />
				);
			})}
		</svg>
	);
}

// ---------------------------------------------------------------------------
// CheckIcon (used only in ExpertSection bullet list)
// ---------------------------------------------------------------------------

function CheckIcon() {
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
			className="shrink-0"
			aria-hidden="true"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

// ---------------------------------------------------------------------------
// EXPERT_BULLETS data
// ---------------------------------------------------------------------------

const EXPERT_BULLETS = {
	th: [
		"Factory Health Check – ตรวจสุขภาพโรงงาน ครบ 8 มิติ",
		"Engineering Review – ตรวจประเมินระบบและกระบวนการโดยวิศวกร",
		"Improvement Roadmap – แผนปรับปรุงเชิงลึก เป็นแผนที่ทำได้จริง",
		"Digital Factory & Dashboard – แดชบอร์ดข้อมูลออนไลน์ ติดตาม KPI",
		"AI / IoT Integration – เชื่อมต่อข้อมูล วิเคราะห์ด้วย AI และ IoT",
	],
	en: [
		"Factory Health Check – Full 8-dimension factory health assessment",
		"Engineering Review – System and process assessment by engineers",
		"Improvement Roadmap – Deep improvement plan with actionable steps",
		"Digital Factory & Dashboard – Online KPI dashboard and data tracking",
		"AI / IoT Integration – Data connectivity, AI and IoT analytics",
	],
};

// ---------------------------------------------------------------------------
// ExpertSection
// ---------------------------------------------------------------------------

export function ExpertSection() {
	const { t, locale } = useLocale();
	const bullets = EXPERT_BULLETS[locale];

	return (
		<section id="expert" className="bg-sky-50 text-slate-950 dark:bg-[#06172d] dark:text-white">
			<div className="mx-auto max-w-[1180px] border-t border-sky-200 px-4 py-8 sm:px-6 dark:border-cyan-300/15">
				<div className="grid gap-7 lg:grid-cols-[0.9fr_0.75fr_1fr] lg:items-center">
					{/* Left — certificate card */}
					<FadeIn>
						<div className="relative flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-amber-200/70 bg-linear-to-br from-amber-50 via-yellow-50 to-orange-50 p-5 shadow-2xl">
							{/* decorative corner ornaments */}
							<div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-amber-400 rounded-tl-md" />
							<div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-amber-400 rounded-tr-md" />
							<div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-amber-400 rounded-bl-md" />
							<div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-amber-400 rounded-br-md" />

							<div className="text-center">
								<p className="text-xs font-bold tracking-[0.25em] text-amber-700 uppercase mb-2">
									{t("landing.certificate.title")}
								</p>
								<div className="w-16 h-0.5 bg-amber-400/60 mx-auto mb-4" />
								<p className="text-xs text-slate-500 mb-1">{t("landing.certificate.person")}</p>
								<h3 className="text-xl font-extrabold text-slate-800 mb-1">
									{t("landing.certificate.level")}
								</h3>
								<p className="text-sm font-semibold text-slate-600 mb-1">
									{t("landing.certificate.discipline")}
								</p>
								<p className="text-xs text-slate-400">{t("landing.certificate.branch")}</p>
							</div>

							<GoldSeal />

							<div className="text-center">
								<p className="text-xs font-semibold text-amber-800">
									{t("landing.certificate.authority")}
								</p>
							</div>
						</div>
					</FadeIn>

					{/* Center — content */}
					<FadeIn delay={0.1}>
						<span className="mb-3 inline-block text-sm font-semibold uppercase tracking-widest text-cyan-700 dark:text-cyan-300">
							{t("landing.expert.label")}
						</span>
						<h2 className="mb-4 text-3xl font-extrabold leading-tight text-slate-950 md:text-[32px] dark:text-white">
							{t("landing.expert.heading.main")}
							<span className="block text-cyan-700 dark:text-cyan-300">
								{t("landing.expert.heading.level")}
							</span>
						</h2>
						<p className="leading-relaxed text-slate-600 dark:text-slate-300">
							{t("landing.expert.desc")}
						</p>
					</FadeIn>

					<FadeIn delay={0.16}>
						<ul className="flex flex-col gap-3">
							{bullets.map((bullet) => {
								const [title, detail] = bullet.split(" – ");
								return (
									<li
										key={bullet}
										className="flex items-start gap-3 border-b border-sky-200 pb-3 last:border-b-0 dark:border-cyan-300/10"
									>
										<span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-700 dark:text-cyan-300">
											<CheckIcon />
										</span>
										<span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
											<strong className="block text-slate-950 dark:text-white">{title}</strong>
											{detail}
										</span>
									</li>
								);
							})}
						</ul>
					</FadeIn>
				</div>
			</div>
		</section>
	);
}
