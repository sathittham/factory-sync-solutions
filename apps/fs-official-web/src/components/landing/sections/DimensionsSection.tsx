"use client";

import { FadeIn, StaggerChildren, StaggerItem } from "@/components/motion";
import { buttonVariants } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Radar Chart (pure SVG, no external library)
// ---------------------------------------------------------------------------

function RadarChart() {
	const { t } = useLocale();
	const cx = 110;
	const cy = 110;
	const maxR = 80;
	const rings = [0.25, 0.5, 0.75, 1.0];
	const angles = [-90, -45, 0, 45, 90, 135, 180, 225].map((deg) => (deg * Math.PI) / 180);
	const factoryValues = [0.85, 0.7, 0.6, 0.75, 0.9, 0.65, 0.8, 0.7];
	const benchmarkValues = [0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7, 0.7];
	const axisLabels = [
		t("landing.radar.axis.basic"),
		t("landing.radar.axis.improve"),
		t("landing.radar.axis.coord"),
		t("landing.radar.axis.maint"),
		t("landing.radar.axis.quality"),
		t("landing.radar.axis.prod"),
		t("landing.radar.axis.mat"),
		t("landing.radar.axis.cost"),
	];

	function toXY(angle: number, r: number) {
		return {
			x: cx + r * Math.cos(angle),
			y: cy + r * Math.sin(angle),
		};
	}

	function polygonPoints(values: number[]) {
		return values
			.map((v, i) => {
				const pt = toXY(angles[i], v * maxR);
				return `${pt.x},${pt.y}`;
			})
			.join(" ");
	}

	return (
		<svg
			viewBox="0 0 220 220"
			width="180"
			height="180"
			aria-label={t("landing.radar.ariaLabel")}
			role="img"
		>
			{/* Rings */}
			{rings.map((r) => (
				<polygon
					key={r}
					points={angles
						.map((a) => {
							const pt = toXY(a, r * maxR);
							return `${pt.x},${pt.y}`;
						})
						.join(" ")}
					fill="none"
					stroke="rgba(148,163,184,0.25)"
					strokeWidth="1"
				/>
			))}

			{/* Axes */}
			{angles.map((a) => {
				const outer = toXY(a, maxR);
				return (
					<line
						key={a}
						x1={cx}
						y1={cy}
						x2={outer.x}
						y2={outer.y}
						stroke="rgba(148,163,184,0.3)"
						strokeWidth="1"
					/>
				);
			})}

			{/* Benchmark polygon */}
			<polygon
				points={polygonPoints(benchmarkValues)}
				fill="rgba(147,197,253,0.08)"
				stroke="rgba(147,197,253,0.5)"
				strokeWidth="1.5"
				strokeDasharray="4 3"
			/>

			{/* Factory polygon */}
			<polygon
				points={polygonPoints(factoryValues)}
				fill="rgba(96,165,250,0.25)"
				stroke="#60a5fa"
				strokeWidth="2"
			/>

			{/* Axis labels */}
			{angles.map((a, i) => {
				const labelR = maxR + 16;
				const pt = toXY(a, labelR);
				const label = axisLabels[i];
				return (
					<text
						key={label}
						x={pt.x}
						y={pt.y}
						textAnchor="middle"
						dominantBaseline="middle"
						fontSize="7"
						fill="rgba(148,163,184,0.9)"
					>
						{label}
					</text>
				);
			})}

			{/* Center dot */}
			<circle cx={cx} cy={cy} r="3" fill="#60a5fa" />
		</svg>
	);
}

// ---------------------------------------------------------------------------
// DIMENSIONS data
// ---------------------------------------------------------------------------

interface DimensionCard {
	number: string;
	labelKey: string;
	icon: React.ReactNode;
}

const DIMENSIONS: DimensionCard[] = [
	{
		number: "01",
		labelKey: "landing.dim.basic",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
			</svg>
		),
	},
	{
		number: "02",
		labelKey: "landing.dim.improvement",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
			</svg>
		),
	},
	{
		number: "03",
		labelKey: "landing.dim.coordination",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
				<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			</svg>
		),
	},
	{
		number: "04",
		labelKey: "landing.dim.maintenance",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
			</svg>
		),
	},
	{
		number: "05",
		labelKey: "landing.dim.quality",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
				<polyline points="22 4 12 14.01 9 11.01" />
			</svg>
		),
	},
	{
		number: "06",
		labelKey: "landing.dim.production",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
				<path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
			</svg>
		),
	},
	{
		number: "07",
		labelKey: "landing.dim.material",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<rect x="1" y="3" width="15" height="13" rx="1" />
				<path d="M16 8h4l3 3v5h-7V8z" />
				<circle cx="5.5" cy="18.5" r="2.5" />
				<circle cx="18.5" cy="18.5" r="2.5" />
			</svg>
		),
	},
	{
		number: "08",
		labelKey: "landing.dim.cost",
		icon: (
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<line x1="12" y1="1" x2="12" y2="23" />
				<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
			</svg>
		),
	},
];

// ---------------------------------------------------------------------------
// DimensionsSection
// ---------------------------------------------------------------------------

export function DimensionsSection() {
	const { t } = useLocale();

	return (
		<section
			id="dimensions"
			className="border-b border-sky-200 bg-sky-50 py-6 text-slate-950 dark:border-cyan-300/15 dark:bg-[#06172d] dark:text-white"
		>
			<div className="mx-auto max-w-[1180px] px-4 sm:px-6">
				<div className="flex flex-col items-start gap-6 lg:flex-row">
					{/* Left — dimension cards */}
					<div className="flex-1 min-w-0">
						<FadeIn>
							<div className="mb-5">
								<h2 className="mb-3 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl dark:text-white">
									<span className="text-cyan-700 dark:text-cyan-300">
										{t("landing.dims.heading.highlight")}
									</span>{" "}
									{t("landing.dims.heading.suffix")}
								</h2>
								<p className="max-w-lg leading-relaxed text-slate-600 dark:text-slate-300">
									{t("landing.dims.subtitle")}
								</p>
							</div>
						</FadeIn>

						<StaggerChildren className="grid grid-cols-2 gap-3 lg:grid-cols-4">
							{DIMENSIONS.map((dim) => (
								<StaggerItem key={dim.number}>
									<div className="flex min-h-[86px] flex-col gap-2 rounded-md border border-sky-200 bg-white p-3 shadow-xs transition-all hover:border-sky-300 hover:shadow-md dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:shadow-none dark:hover:border-cyan-300/60 dark:hover:bg-cyan-300/15 dark:hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]">
										<div className="flex items-start justify-between">
											<div className="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold text-cyan-700 dark:text-cyan-300">
												{dim.number}
											</div>
											<span className="text-cyan-700 dark:text-cyan-300">{dim.icon}</span>
										</div>
										<p className="text-sm font-semibold leading-snug text-slate-900 dark:text-white">
											{t(dim.labelKey)}
										</p>
									</div>
								</StaggerItem>
							))}
						</StaggerChildren>
					</div>

					{/* Right — Radar chart card */}
					<div className="w-full shrink-0 lg:w-[350px]">
						<FadeIn delay={0.15}>
							<div className="rounded-md border border-sky-200 bg-white p-4 text-slate-950 shadow-xs dark:border-cyan-300/35 dark:bg-[#041225] dark:text-white dark:shadow-[0_0_35px_rgba(14,165,233,0.16)]">
								<div className="mb-3 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
									<span>{t("landing.radar.overview")}</span>
									<span>{t("landing.radar.totalScore")}</span>
								</div>
								<div className="flex items-center justify-center mb-2">
									<RadarChart />
								</div>
								<div className="mb-3 text-center">
									<span className="text-4xl font-bold text-cyan-700 dark:text-cyan-300">
										{t("landing.radar.score")}
									</span>
								</div>
								<div className="mb-4 flex items-center justify-center gap-4 text-sm">
									<span className="flex items-center gap-1.5">
										<span className="inline-block w-3 h-3 rounded-full bg-blue-400" />
										{t("landing.radar.you")}
									</span>
									<span className="flex items-center gap-1.5">
										<span
											className="inline-block w-3 h-3 rounded-full border border-blue-300"
											style={{ borderStyle: "dashed" }}
										/>
										{t("landing.radar.avg")}
									</span>
								</div>
								<a
									href="#process"
									className={cn(
										buttonVariants(),
										"w-full justify-center bg-blue-600 text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] hover:bg-blue-500"
									)}
								>
									{t("landing.radar.seeReport")}
								</a>
							</div>
						</FadeIn>
					</div>
				</div>
			</div>
		</section>
	);
}
