"use client";

import { FadeIn } from "@/components/motion";
import heroBackground from "@/fs-bg.png";
import { useLocale } from "@/lib/i18n";

const HERO_IMG = heroBackground.src;

const HERO_STATS = [
	{
		value: "43",
		labelKey: "landing.stat.questions",
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				aria-hidden="true"
			>
				<rect x="9" y="2" width="6" height="4" rx="1" />
				<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
			</svg>
		),
	},
	{
		value: "8",
		labelKey: "landing.stat.dims",
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="3" />
				<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
			</svg>
		),
	},
	{
		value: "15",
		labelKey: "landing.stat.time",
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" />
				<polyline points="12 6 12 12 16 14" />
			</svg>
		),
	},
	{
		value: null,
		labelKey: "landing.stat.report",
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				aria-hidden="true"
			>
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="16" y1="13" x2="8" y2="13" />
				<line x1="16" y1="17" x2="8" y2="17" />
			</svg>
		),
	},
];

export function HeroSection({ appUrl }: { appUrl: string }) {
	const { t } = useLocale();

	return (
		<section id="hero" className="relative overflow-hidden bg-sky-50 dark:bg-[#041225]">
			<div className="absolute inset-0">
				<img
					src={HERO_IMG}
					alt=""
					className="h-full w-full object-cover opacity-75 dark:opacity-70"
					loading="eager"
				/>
				<div className="absolute inset-0 bg-[linear-gradient(90deg,#f8fafc_0%,rgba(248,250,252,0.88)_30%,rgba(240,249,255,0.4)_60%,rgba(240,249,255,0.08)_100%)] dark:bg-[linear-gradient(90deg,#041225_0%,rgba(4,18,37,0.9)_34%,rgba(4,18,37,0.48)_72%,rgba(4,18,37,0.3)_100%)]" />
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_26%,rgba(14,165,233,0.18),transparent_34%),linear-gradient(180deg,rgba(248,250,252,0)_70%,#f0f9ff_100%)] dark:bg-[radial-gradient(circle_at_68%_26%,rgba(14,165,233,0.34),transparent_34%),linear-gradient(180deg,rgba(4,18,37,0)_70%,#06172d_100%)]" />
				<div className="absolute inset-0 factory-scanlines opacity-25 dark:opacity-40" />
			</div>
			<div className="relative mx-auto flex min-h-[500px] max-w-[1180px] flex-col md:min-h-[430px] md:flex-row">
				{/* ── LEFT: text ─────────────────────────────────── */}
				<div className="flex max-w-[650px] flex-1 flex-col justify-center px-6 py-12 text-slate-950 sm:px-10 md:max-w-[640px] md:px-4 md:py-14 lg:max-w-[720px] dark:text-white">
					<FadeIn delay={0}>
						<h1 className="mb-4 text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-[40px] md:text-[38px] xl:text-[48px]">
							<span className="block">{t("landing.hero.title1")}</span>
							<span className="block mt-1">
								{t("landing.hero.title2.prefix")}{" "}
								<span className="text-cyan-600 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:text-cyan-300 dark:drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]">
									AI
								</span>{" "}
								{t("landing.hero.title2.connector")}{" "}
								<span className="text-cyan-600 drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] dark:text-cyan-300 dark:drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]">
									{t("landing.hero.title2.engineers")}
								</span>
							</span>
						</h1>
					</FadeIn>

					<FadeIn delay={0.08}>
						<p className="mb-6 max-w-[500px] text-base leading-relaxed text-slate-700 sm:text-lg md:max-w-[460px] dark:text-slate-200">
							{t("landing.hero.desc")}
						</p>
					</FadeIn>

					<FadeIn delay={0.16}>
						<div className="mb-6 flex flex-wrap gap-3">
							<a
								href="/register"
								onClick={() => globalThis.gtag?.("event", "cta_click", { location: "hero" })}
								className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-600 px-7 font-semibold text-white shadow-[0_0_28px_rgba(37,99,235,0.5)] transition-colors hover:bg-blue-500"
							>
								{t("nav.signUp")}
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
							</a>
							<a
								href="#contact"
								className="inline-flex h-11 items-center gap-2 rounded-md border border-blue-200 bg-white/75 px-7 font-medium text-slate-900 transition-colors hover:bg-white dark:border-cyan-300/35 dark:bg-[#06172d]/45 dark:text-white dark:hover:bg-white/10"
							>
								<svg
									width="15"
									height="15"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									aria-hidden="true"
								>
									<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
									<circle cx="12" cy="7" r="4" />
								</svg>
								{t("landing.hero.cta2")}
							</a>
						</div>
					</FadeIn>

					<FadeIn delay={0.24}>
						<div className="grid max-w-[660px] grid-cols-2 gap-3 sm:grid-cols-4 md:max-w-[590px]">
							{HERO_STATS.map((stat) => (
								<div
									key={stat.labelKey}
									className="rounded-md border border-blue-200 bg-white/75 p-3 text-center shadow-xs dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
								>
									<div className="mb-2 flex justify-center text-cyan-700 dark:text-cyan-300">
										{stat.icon}
									</div>
									{stat.value && (
										<div className="mb-0.5 text-2xl font-bold text-slate-950 sm:text-[28px] dark:text-white">
											{stat.value}
										</div>
									)}
									<div className="text-xs leading-snug text-slate-600 sm:text-sm dark:text-slate-300">
										{t(stat.labelKey)}
									</div>
								</div>
							))}
						</div>
					</FadeIn>
				</div>
			</div>
		</section>
	);
}
