import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminAssessment {
	id: string;
	uid: string;
	overallScore: number;
	diagnosis: string;
	submittedAt: string;
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

export function AdminPage() {
	const [assessments, setAssessments] = useState<AdminAssessment[]>([]);
	const [loading, setLoading] = useState(true);
	const [industryFilter, setIndustryFilter] = useState("");
	const [sizeFilter, setSizeFilter] = useState("");
	const { t } = useLocale();

	const fetchAssessments = async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (industryFilter) params.set("industryType", industryFilter);
			if (sizeFilter) params.set("companySize", sizeFilter);
			const query = params.toString();
			const data = await api.get<AdminAssessment[]>(
				`/admin/assessments${query ? `?${query}` : ""}`,
			);
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

	return (
		<div className="min-h-[calc(100vh-4rem)] bg-dots">
			<div className="container max-w-6xl py-8 sm:py-10">
				<div className="flex items-center justify-between mb-8 animate-fade-up">
					<div className="flex items-center gap-3">
						<div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-primary">
								<path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
							</svg>
						</div>
						<div>
							<h1 className="text-2xl sm:text-3xl font-extrabold">{t("admin.title")}</h1>
							<p className="text-sm text-muted-foreground">{t("admin.subtitle") || "Assessment overview & management"}</p>
						</div>
					</div>
					<Button
						variant="outline"
						onClick={handleExport}
						data-testid="admin-export-csv-btn"
						className="gap-2 hidden sm:flex"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
						{t("admin.exportCsv")}
					</Button>
				</div>

				{/* Stat cards */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
					<div className="bg-white rounded-xl border p-5 animate-fade-up">
						<div className="flex items-center justify-between mb-3">
							<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{t("admin.totalSubmissions")}
							</p>
							<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-primary">
									<path d="M2 2h12M2 6h12M2 10h8M2 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
								</svg>
							</div>
						</div>
						<p className="text-3xl font-extrabold font-mono tabular-nums">{totalSubmissions}</p>
					</div>

					<div className="bg-white rounded-xl border p-5 animate-fade-up delay-1">
						<div className="flex items-center justify-between mb-3">
							<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{t("admin.avgScore")}
							</p>
							<div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-accent">
									<path d="M8 1l2 4.5 5 .7-3.6 3.5.9 5L8 12.5 3.7 14.7l.9-5L1 6.2l5-.7L8 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
								</svg>
							</div>
						</div>
						<p className="text-3xl font-extrabold font-mono tabular-nums">{avgScore.toFixed(2)}</p>
						<p className="text-xs text-muted-foreground mt-1">{t("admin.outOf") || "out of 5.00"}</p>
					</div>

					<div className="bg-white rounded-xl border p-5 animate-fade-up delay-2">
						<div className="flex items-center justify-between mb-3">
							<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{t("admin.distribution")}
							</p>
							<div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-emerald-600">
									<rect x="1" y="9" width="3" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
									<rect x="5.5" y="5" width="3" height="9" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
									<rect x="10" y="2" width="3" height="12" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
								</svg>
							</div>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{Object.entries(diagnosisCounts).map(([diag, count]) => (
								<span
									key={diag}
									className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border ${diagnosisColors[diag] || ""}`}
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
				<div className="bg-white rounded-xl border p-4 mb-6 animate-fade-up delay-3">
					<div className="flex flex-wrap gap-4 items-end">
						<div className="space-y-1.5">
							<label htmlFor="filter-industry" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
							<label htmlFor="filter-size" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
								<path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v8m0 0l-3-3m3 3l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
							{t("admin.exportCsv")}
						</Button>
					</div>
				</div>

				{/* Table */}
				{loading ? (
					<div className="bg-white rounded-xl border overflow-hidden">
						<div className="p-4 space-y-3">
							<Skeleton className="h-10 w-full rounded-lg" />
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-14 w-full rounded-lg" />
							))}
						</div>
					</div>
				) : (
					<div className="bg-white rounded-xl border overflow-hidden animate-fade-up delay-4" data-testid="admin-assessment-table">
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b bg-muted/30">
										<th className="text-left py-3 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.id")}</th>
										<th className="text-left py-3 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.score")}</th>
										<th className="text-left py-3 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.diagnosis")}</th>
										<th className="text-left py-3 px-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("admin.date")}</th>
									</tr>
								</thead>
								<tbody>
									{assessments.map((a) => (
										<tr
											key={a.id}
											className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer group"
										>
											<td className="py-3.5 px-5 font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
												{a.id.slice(0, 8)}...
											</td>
											<td className="py-3.5 px-5">
												<div className="flex items-center gap-2">
													<span className="font-semibold font-mono tabular-nums">{a.overallScore.toFixed(2)}</span>
													<div className="hidden sm:block w-16 h-1.5 bg-muted rounded-full overflow-hidden">
														<div
															className="h-full bg-primary rounded-full"
															style={{ width: `${(a.overallScore / 5) * 100}%` }}
														/>
													</div>
												</div>
											</td>
											<td className="py-3.5 px-5">
												<Badge className={`text-xs border ${diagnosisColors[a.diagnosis] || ""}`}>
													<span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${diagnosisDots[a.diagnosis] || "bg-gray-400"}`} />
													{t(`diagnosis.${a.diagnosis}`)}
												</Badge>
											</td>
											<td className="py-3.5 px-5 text-muted-foreground font-mono text-xs">
												{new Date(a.submittedAt).toLocaleDateString()}
											</td>
										</tr>
									))}
									{assessments.length === 0 && (
										<tr>
											<td colSpan={4} className="py-16 text-center">
												<div className="flex flex-col items-center gap-2">
													<div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
														<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
															<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
														</svg>
													</div>
													<p className="text-muted-foreground text-sm font-medium">{t("admin.noAssessments")}</p>
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
