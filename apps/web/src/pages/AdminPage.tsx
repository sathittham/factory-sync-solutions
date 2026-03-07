import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface DimensionScore {
	dimensionId: string;
	dimensionName: string;
	score: number;
	maxScore: number;
}

interface AdminAssessment {
	id: string;
	uid: string;
	companyName?: string;
	industryType?: string;
	companySize?: string;
	contactName?: string;
	contactEmail?: string;
	overallScore: number;
	diagnosis: string;
	submittedAt: string;
	scores?: DimensionScore[];
	strengths?: string[];
	weaknesses?: string[];
}

const diagnosisColors: Record<string, string> = {
	Beginning: "bg-red-50 text-red-700 border-red-200",
	Developing: "bg-amber-50 text-amber-700 border-amber-200",
	Established: "bg-blue-50 text-blue-700 border-blue-200",
	Advanced: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const diagnosisDots: Record<string, string> = {
	Beginning: "bg-red-500",
	Developing: "bg-amber-500",
	Established: "bg-blue-500",
	Advanced: "bg-emerald-500",
};

const industryKeys = [
	"manufacturing", "food", "automotive", "electronics", "textile", "chemical", "other",
] as const;

function getScoreColor(score: number): string {
	if (score >= 4) return "hsl(152 60% 38%)";
	if (score >= 3) return "hsl(220 65% 48%)";
	if (score >= 2) return "hsl(38 92% 50%)";
	return "hsl(0 72% 51%)";
}

export function AdminPage() {
	const [assessments, setAssessments] = useState<AdminAssessment[]>([]);
	const [loading, setLoading] = useState(true);
	const [industryFilter, setIndustryFilter] = useState("");
	const [sizeFilter, setSizeFilter] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailData, setDetailData] = useState<AdminAssessment | null>(null);
	const { t } = useLocale();

	const fetchAssessments = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (industryFilter) params.set("industryType", industryFilter);
			if (sizeFilter) params.set("companySize", sizeFilter);
			const query = params.toString();
			const path = query ? "/admin/assessments?" + query : "/admin/assessments";
			const data = await api.get<AdminAssessment[]>(path);
			setAssessments(data);
		} catch {
			// Error loading
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAssessments();
	}, [industryFilter, sizeFilter]);

	const handleSelectAssessment = async (a: AdminAssessment) => {
		if (selectedId === a.id) {
			setSelectedId(null);
			setDetailData(null);
			return;
		}
		setSelectedId(a.id);

		// If the assessment already has scores (from list), use it directly
		if (a.scores && a.scores.length > 0) {
			setDetailData(a);
			return;
		}

		// Otherwise fetch full detail
		setDetailLoading(true);
		try {
			const detail = await api.get<AdminAssessment>(`/admin/assessments/${a.id}`);
			setDetailData(detail);
		} catch {
			// Use basic data as fallback
			setDetailData(a);
		} finally {
			setDetailLoading(false);
		}
	};

	const handleExport = async () => {
		try {
			const res = await fetch("/api/v1/admin/export", {
				headers: {
					Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
				},
			});
			if (!res.ok) throw new Error("Export failed");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `assessments-${new Date().toISOString().slice(0, 10)}.csv`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			// Export failed
		}
	};

	const totalSubmissions = assessments.length;
	const avgScore =
		totalSubmissions > 0
			? assessments.reduce((sum, a) => sum + a.overallScore, 0) / totalSubmissions
			: 0;
	const diagnosisCounts = assessments.reduce(
		(acc, a) => {
			acc[a.diagnosis] = (acc[a.diagnosis] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);

	const renderDetailContent = () => {
		if (detailLoading) {
			return (
				<div className="space-y-3">
					<Skeleton className="h-6 w-48" />
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						{["det-a", "det-b", "det-c", "det-d"].map((id) => (
							<Skeleton key={id} className="h-16 rounded-md" />
						))}
					</div>
				</div>
			);
		}
		if (detailData) {
			return (
				<div className="space-y-4">
					{/* Company info row */}
					<div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
						{detailData.companyName && (
							<div>
								<span className="text-xs text-muted-foreground">{t("admin.company")}</span>
								<p className="font-medium">{detailData.companyName}</p>
							</div>
						)}
						{detailData.industryType && (
							<div>
								<span className="text-xs text-muted-foreground">{t("admin.industry")}</span>
								<p className="font-medium">{t(`industry.${detailData.industryType}`)}</p>
							</div>
						)}
						{detailData.companySize && (
							<div>
								<span className="text-xs text-muted-foreground">{t("admin.companySize")}</span>
								<p className="font-medium">{t(`size.${detailData.companySize}`)}</p>
							</div>
						)}
						{detailData.contactName && (
							<div>
								<span className="text-xs text-muted-foreground">{t("admin.contactName")}</span>
								<p className="font-medium">{detailData.contactName}</p>
							</div>
						)}
						{detailData.contactEmail && (
							<div>
								<span className="text-xs text-muted-foreground">{t("admin.contactEmail")}</span>
								<p className="font-medium font-mono text-xs">{detailData.contactEmail}</p>
							</div>
						)}
					</div>

					{/* Dimension scores */}
					{detailData.scores && detailData.scores.length > 0 && (
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-2">{t("result.dimensionScores")}</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{detailData.scores.map((s) => (
									<div key={s.dimensionId} className="flex items-center gap-2 bg-white rounded-md border p-2.5">
										<div className="flex-1 min-w-0">
											<div className="flex justify-between items-baseline mb-1">
												<span className="text-xs font-medium truncate mr-2">{s.dimensionName}</span>
												<span className="text-xs font-mono font-semibold tabular-nums" style={{ color: getScoreColor(s.score) }}>
													{s.score.toFixed(2)}
												</span>
											</div>
											<div className="h-1 bg-muted rounded-full overflow-hidden">
												<div
													className="h-full rounded-full"
													style={{ width: `${(s.score / 5) * 100}%`, background: getScoreColor(s.score) }}
												/>
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Strengths & Weaknesses */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{detailData.strengths && detailData.strengths.length > 0 && (
							<div className="bg-emerald-50/50 rounded-md border border-emerald-200 p-3">
								<p className="text-xs font-medium text-emerald-700 mb-2">{t("result.strengths")}</p>
								<ul className="space-y-1">
									{detailData.strengths.map((s) => (
										<li key={s} className="text-xs text-emerald-800 flex items-start gap-1.5">
											<span className="text-emerald-500 mt-px">+</span>
											{s}
										</li>
									))}
								</ul>
							</div>
						)}
						{detailData.weaknesses && detailData.weaknesses.length > 0 && (
							<div className="bg-red-50/50 rounded-md border border-red-200 p-3">
								<p className="text-xs font-medium text-red-700 mb-2">{t("result.weaknesses")}</p>
								<ul className="space-y-1">
									{detailData.weaknesses.map((w) => (
										<li key={w} className="text-xs text-red-800 flex items-start gap-1.5">
											<span className="text-red-400 mt-px">!</span>
											{w}
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			);
		}
		return <p className="text-sm text-muted-foreground">{t("admin.noDetail")}</p>;
	};

	return (
		<div className="min-h-[calc(100vh-3.5rem)]">
			<div className="container max-w-6xl py-6 sm:py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-6 animate-fade-up">
					<div>
						<h1 className="text-2xl font-bold">{t("admin.title")}</h1>
						<p className="text-sm text-muted-foreground mt-0.5">{t("admin.subtitle") || "Assessment overview & management"}</p>
					</div>
					<Button
						variant="outline"
						onClick={handleExport}
						data-testid="admin-export-csv-btn"
						className="gap-2 hidden sm:flex"
					>
						<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
							<path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
						{t("admin.exportCsv")}
					</Button>
				</div>

				{/* Stat cards */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
					<div className="bg-white rounded-lg border p-5 animate-fade-up">
						<p className="text-xs font-medium text-muted-foreground mb-2">
							{t("admin.totalSubmissions")}
						</p>
						<p className="text-3xl font-bold font-mono tabular-nums">{totalSubmissions}</p>
					</div>

					<div className="bg-white rounded-lg border p-5 animate-fade-up delay-1">
						<p className="text-xs font-medium text-muted-foreground mb-2">
							{t("admin.avgScore")}
						</p>
						<p className="text-3xl font-bold font-mono tabular-nums">{avgScore.toFixed(2)}</p>
						<p className="text-xs text-muted-foreground font-mono mt-1">/5.00</p>
					</div>

					<div className="bg-white rounded-lg border p-5 animate-fade-up delay-2">
						<p className="text-xs font-medium text-muted-foreground mb-2">
							{t("admin.distribution")}
						</p>
						<div className="flex flex-wrap gap-1.5">
							{Object.entries(diagnosisCounts).map(([diag, count]) => (
								<span
									key={diag}
									className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md border ${diagnosisColors[diag] || ""}`}
								>
									<span className={`h-1.5 w-1.5 rounded-full ${diagnosisDots[diag] || "bg-gray-400"}`} />
									{t(`diagnosis.${diag}`)}: {count}
								</span>
							))}
							{Object.keys(diagnosisCounts).length === 0 && (
								<span className="text-xs text-muted-foreground">--</span>
							)}
						</div>
					</div>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-lg border p-4 mb-5 animate-fade-up delay-3">
					<div className="flex flex-wrap gap-4 items-end">
						<div className="space-y-1.5">
							<label htmlFor="filter-industry" className="text-xs font-medium text-muted-foreground">
								{t("admin.industry")}
							</label>
							<Select
								id="filter-industry"
								value={industryFilter}
								onChange={(e) => setIndustryFilter(e.target.value)}
								data-testid="admin-filter-industry"
							>
								<option value="">{t("admin.allIndustries")}</option>
								{industryKeys.map((key) => (
									<option key={key} value={key}>
										{t(`industry.${key}`)}
									</option>
								))}
							</Select>
						</div>
						<div className="space-y-1.5">
							<label htmlFor="filter-size" className="text-xs font-medium text-muted-foreground">
								{t("admin.companySize")}
							</label>
							<Select
								id="filter-size"
								value={sizeFilter}
								onChange={(e) => setSizeFilter(e.target.value)}
								data-testid="admin-filter-size"
							>
								<option value="">{t("admin.allSizes")}</option>
								<option value="small">{t("size.small")}</option>
								<option value="medium">{t("size.medium")}</option>
								<option value="large">{t("size.large")}</option>
							</Select>
						</div>
						<Button
							variant="outline"
							onClick={handleExport}
							data-testid="admin-export-csv-btn-mobile"
							className="gap-2 sm:hidden"
						>
							<svg width="15" height="15" viewBox="0 0 16 16" fill="none">
								<path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
							{t("admin.exportCsv")}
						</Button>
					</div>
				</div>

				{/* Table */}
				{loading ? (
					<div className="bg-white rounded-lg border overflow-hidden">
						<div className="p-4 space-y-3">
							<Skeleton className="h-10 w-full rounded-md" />
							{["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((id) => (
								<Skeleton key={id} className="h-14 w-full rounded-md" />
							))}
						</div>
					</div>
				) : (
					<div className="bg-white rounded-lg border overflow-hidden animate-fade-up delay-4" data-testid="admin-assessment-table">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/30">
										<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground hidden sm:table-cell">{t("admin.id")}</th>
										<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground">{t("admin.company")}</th>
										<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground">{t("admin.score")}</th>
										<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground">{t("admin.diagnosis")}</th>
										<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground hidden sm:table-cell">{t("admin.date")}</th>
									</tr>
								</thead>
								<tbody>
									{assessments.map((a) => (
										<>
											<tr
												key={a.id}
												onClick={() => handleSelectAssessment(a)}
												className={`border-b last:border-0 cursor-pointer transition-colors ${
													selectedId === a.id
														? "bg-primary/5"
														: "hover:bg-muted/30"
												}`}
											>
												<td className="py-3 px-3 sm:px-5 font-mono text-xs text-muted-foreground hidden sm:table-cell">
													{a.id.slice(0, 8)}...
												</td>
												<td className="py-3 px-3 sm:px-5">
													<div className="text-sm font-medium">{a.companyName || "--"}</div>
													<div className="text-[11px] text-muted-foreground sm:hidden mt-0.5">{new Date(a.submittedAt).toLocaleDateString()}</div>
												</td>
												<td className="py-3 px-3 sm:px-5">
													<div className="flex items-center gap-2">
														<span className="font-semibold font-mono tabular-nums text-sm">{a.overallScore.toFixed(2)}</span>
														<div className="hidden sm:block w-16 h-1.5 bg-muted rounded-full overflow-hidden">
															<div
																className="h-full bg-primary rounded-full"
																style={{ width: `${(a.overallScore / 5) * 100}%` }}
															/>
														</div>
													</div>
												</td>
												<td className="py-3 px-3 sm:px-5">
													<Badge className={`text-[10px] border ${diagnosisColors[a.diagnosis] || ""}`}>
														<span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${diagnosisDots[a.diagnosis] || "bg-gray-400"}`} />
														{t(`diagnosis.${a.diagnosis}`)}
													</Badge>
												</td>
												<td className="py-3 px-3 sm:px-5 text-muted-foreground font-mono text-xs hidden sm:table-cell">
													{new Date(a.submittedAt).toLocaleDateString()}
												</td>
											</tr>
											{/* Expanded detail row */}
											{selectedId === a.id && (
												<tr key={`${a.id}-detail`}>
													<td colSpan={5} className="p-0">
														<div className="border-t bg-muted/10 p-5 animate-fade-up" style={{ animationDelay: "0s" }}>
															{renderDetailContent()}
														</div>
													</td>
												</tr>
											)}
										</>
									))}
									{assessments.length === 0 && (
										<tr>
											<td colSpan={5} className="py-16 text-center">
												<div className="flex flex-col items-center gap-2">
													<div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
														<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
															<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
														</svg>
													</div>
													<p className="text-muted-foreground text-sm">{t("admin.noAssessments")}</p>
												</div>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
