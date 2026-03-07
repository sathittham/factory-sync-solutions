import { useEffect } from "react";
import {
	Radar,
	RadarChart,
	PolarGrid,
	PolarAngleAxis,
	PolarRadiusAxis,
	ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store";
import {
	setAssessment,
	setAssessments,
	setLoading,
	type Assessment,
} from "@/store/resultSlice";
import { useLocale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const diagnosisConfig: Record<string, { color: string; bg: string; border: string; icon: string }> = {
	Beginning: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: "M12 9v2m0 4h.01" },
	Developing: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
	Established: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: "M9 12l2 2 4-4" },
	Advanced: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "M5 13l4 4L19 7" },
};

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
	const pct = (score / 5) * 100;
	const r = (size - 12) / 2;
	const circumference = 2 * Math.PI * r;
	const offset = circumference - (pct / 100) * circumference;

	return (
		<svg width={size} height={size} className="transform -rotate-90">
			<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(220 15% 92%)" strokeWidth="10" />
			<circle
				cx={size / 2}
				cy={size / 2}
				r={r}
				fill="none"
				stroke="hsl(220 70% 45%)"
				strokeWidth="10"
				strokeLinecap="round"
				strokeDasharray={circumference}
				strokeDashoffset={offset}
				className="transition-all duration-1000 ease-out"
			/>
		</svg>
	);
}

export function ResultPage() {
	const dispatch = useAppDispatch();
	const { assessment, assessments, loading } = useAppSelector((s) => s.result);
	const { t } = useLocale();

	useEffect(() => {
		if (!assessment && !loading) {
			dispatch(setLoading(true));
			api
				.get<Assessment[]>("/results")
				.then((data) => {
					dispatch(setAssessments(data));
					if (data.length > 0) {
						dispatch(setAssessment(data[0]));
					}
				})
				.catch(() => {})
				.finally(() => dispatch(setLoading(false)));
		}
	}, [assessment, loading, dispatch]);

	if (loading) {
		return (
			<div className="container max-w-4xl py-10 space-y-6">
				<Skeleton className="h-10 w-64" />
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<Skeleton className="h-40 rounded-2xl" />
					<Skeleton className="h-40 rounded-2xl col-span-2" />
				</div>
				<Skeleton className="h-80 rounded-2xl" />
			</div>
		);
	}

	if (!assessment) {
		return (
			<div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
				<div className="text-center animate-fade-up">
					<div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
						<svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
							<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold mb-2">{t("result.noResults.title")}</h1>
					<p className="text-muted-foreground">{t("result.noResults.desc")}</p>
				</div>
			</div>
		);
	}

	const scores = assessment.scores ?? [];
	const diag = diagnosisConfig[assessment.diagnosis] || diagnosisConfig.Beginning;

	const radarData = scores.map((s) => ({
		dimension: s.dimensionName,
		score: s.score,
		fullMark: 5,
	}));

	return (
		<div className="bg-dots min-h-[calc(100vh-4rem)]">
			<div className="container max-w-4xl py-8 sm:py-10 space-y-6" data-testid="result-summary">
				{/* Hero score section */}
				<div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-fade-up">
					<div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-accent" />
					<div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
						{/* Score ring */}
						<div className="relative flex-shrink-0">
							<ScoreRing score={assessment.overallScore} size={140} />
							<div className="absolute inset-0 flex flex-col items-center justify-center">
								<span className="text-3xl font-extrabold tabular-nums">
									{assessment.overallScore.toFixed(2)}
								</span>
								<span className="text-xs text-muted-foreground font-medium">/5.00</span>
							</div>
						</div>

						<div className="text-center sm:text-left">
							<h1 className="text-2xl font-extrabold mb-2">{t("result.overallScore")}</h1>
							<Badge className={`text-sm px-3 py-1 ${diag.bg} ${diag.color} ${diag.border} border font-semibold`}>
								{t(`diagnosis.${assessment.diagnosis}`)}
							</Badge>
						</div>
					</div>
				</div>

				{/* Radar + Dimension scores side by side */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Radar Chart */}
					<div className="bg-white rounded-2xl border shadow-sm p-6 animate-fade-up" data-testid="result-spider-chart" style={{ animationDelay: "0.1s" }}>
						<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
							{t("result.dimensionScores")}
						</h2>
						<ResponsiveContainer width="100%" height={300}>
							<RadarChart data={radarData}>
								<PolarGrid stroke="hsl(220 15% 88%)" />
								<PolarAngleAxis
									dataKey="dimension"
									tick={{ fontSize: 11, fill: "hsl(220 10% 46%)" }}
								/>
								<PolarRadiusAxis
									angle={90}
									domain={[0, 5]}
									tick={{ fontSize: 9, fill: "hsl(220 10% 60%)" }}
								/>
								<Radar
									dataKey="score"
									stroke="hsl(220 70% 45%)"
									fill="hsl(220 70% 45%)"
									fillOpacity={0.15}
									strokeWidth={2}
								/>
							</RadarChart>
						</ResponsiveContainer>
						<div className="sr-only">
							{scores.map((s) => (
								<p key={s.dimensionId}>
									{s.dimensionName}: {s.score.toFixed(2)} out of 5
								</p>
							))}
						</div>
					</div>

					{/* Dimension bars */}
					<div className="bg-white rounded-2xl border shadow-sm p-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
						<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
							{t("result.dimensionScores")}
						</h2>
						<div className="space-y-4">
							{scores.map((s, i) => (
								<div key={s.dimensionId} className="animate-fade-up" style={{ animationDelay: `${0.2 + i * 0.05}s` }}>
									<div className="flex justify-between items-baseline mb-1.5">
										<span className="text-sm font-medium truncate mr-2">{s.dimensionName}</span>
										<span className="text-sm font-mono font-bold tabular-nums">{s.score.toFixed(2)}</span>
									</div>
									<div className="h-2.5 bg-secondary rounded-full overflow-hidden">
										<div
											className="h-full rounded-full animate-score-fill"
											style={{
												width: `${(s.score / 5) * 100}%`,
												background: s.score >= 3.5
													? "hsl(152 60% 40%)"
													: s.score >= 2.5
														? "hsl(220 70% 45%)"
														: "hsl(0 72% 51%)",
												animationDelay: `${0.3 + i * 0.08}s`,
											}}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Strengths & Weaknesses */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
					{assessment.strengths?.length > 0 && (
						<div className="bg-white rounded-2xl border shadow-sm p-6 animate-fade-up" data-testid="result-strengths-panel" style={{ animationDelay: "0.25s" }}>
							<div className="flex items-center gap-2 mb-4">
								<div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-600">
										<path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
									</svg>
								</div>
								<h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700">
									{t("result.strengths")}
								</h3>
							</div>
							<ul className="space-y-2">
								{assessment.strengths.map((s) => (
									<li key={s} className="flex items-start gap-2 text-sm">
										<span className="text-emerald-500 mt-0.5 flex-shrink-0">+</span>
										{s}
									</li>
								))}
							</ul>
						</div>
					)}

					{assessment.weaknesses?.length > 0 && (
						<div className="bg-white rounded-2xl border shadow-sm p-6 animate-fade-up" data-testid="result-weaknesses-panel" style={{ animationDelay: "0.3s" }}>
							<div className="flex items-center gap-2 mb-4">
								<div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
									<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-500">
										<path d="M12 9v2m0 4h.01M5.07 19h13.86c1.1 0 1.8-1.17 1.26-2.12l-6.93-12c-.54-.94-1.9-.94-2.44 0l-6.93 12C4.35 17.83 5.05 19 6.15 19z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
									</svg>
								</div>
								<h3 className="text-sm font-bold uppercase tracking-wider text-red-700">
									{t("result.weaknesses")}
								</h3>
							</div>
							<ul className="space-y-2">
								{assessment.weaknesses.map((w) => (
									<li key={w} className="flex items-start gap-2 text-sm">
										<span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
										{w}
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/* Previous assessments */}
				{assessments.length > 1 && (
					<div className="bg-white rounded-2xl border shadow-sm p-6 animate-fade-up" style={{ animationDelay: "0.35s" }}>
						<h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
							{t("result.previousAssessments")}
						</h2>
						<div className="space-y-1.5">
							{assessments.map((a) => (
								<button
									key={a.id}
									type="button"
									onClick={() => dispatch(setAssessment(a))}
									className={`w-full flex justify-between items-center p-3 rounded-lg text-sm transition-colors ${
										a.id === assessment.id
											? "bg-primary/5 border border-primary/20"
											: "hover:bg-muted"
									}`}
								>
									<span className="text-muted-foreground">
										{new Date(a.submittedAt).toLocaleDateString()}
									</span>
									<span className="font-mono font-bold">
										{a.overallScore.toFixed(2)}
										<span className="text-muted-foreground font-normal ml-2">
											{t(`diagnosis.${a.diagnosis}`)}
										</span>
									</span>
								</button>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
