import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useLocale } from "@/lib/i18n";
import { formatDateTime } from "@/lib/dayjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

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

interface AdminUser {
	uid: string;
	email: string;
	displayName: string;
	companyName: string;
	companyRegId: string;
	industryType: string;
	companySize: string;
	contactName: string;
	contactEmail: string;
	contactPhone: string;
	role: string;
	createdAt: string;
	updatedAt: string;
}

const diagnosisColors: Record<string, string> = {
	Beginning: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
	Developing: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
	Established: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
	Advanced: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
};

const diagnosisDots: Record<string, string> = {
	Beginning: "bg-red-500",
	Developing: "bg-amber-500",
	Established: "bg-blue-500",
	Advanced: "bg-emerald-500",
};

const industryKeys = [
	"manufacturing", "food", "automotive", "electronics", "textile", "chemical",
	"construction", "agriculture", "logistics", "energy", "pharma", "plastics",
	"printing", "metal", "wood", "other",
] as const;

function getScoreColor(score: number): string {
	if (score >= 4) return "hsl(152 60% 38%)";
	if (score >= 3) return "hsl(220 65% 48%)";
	if (score >= 2) return "hsl(38 92% 50%)";
	return "hsl(0 72% 51%)";
}

// --- Quiz Tab (Assessment list) ---

function QuizTab() {
	const [assessments, setAssessments] = useState<AdminAssessment[]>([]);
	const [loading, setLoading] = useState(true);
	const [industryFilter, setIndustryFilter] = useState("");
	const [sizeFilter, setSizeFilter] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailData, setDetailData] = useState<AdminAssessment | null>(null);
	const { t, locale } = useLocale();

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

		if (a.scores && a.scores.length > 0) {
			setDetailData(a);
			return;
		}

		setDetailLoading(true);
		try {
			const detail = await api.get<AdminAssessment>(`/admin/assessments/${a.id}`);
			setDetailData(detail);
		} catch {
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

					{detailData.scores && detailData.scores.length > 0 && (
						<div>
							<p className="text-xs font-medium text-muted-foreground mb-2">{t("result.dimensionScores")}</p>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{detailData.scores.map((s) => (
									<div key={s.dimensionId} className="flex items-center gap-2 bg-card rounded-md border p-2.5">
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
		<>
			{/* Stat cards */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
				<div className="bg-card rounded-lg border p-5 animate-fade-up">
					<p className="text-xs font-medium text-muted-foreground mb-2">
						{t("admin.totalSubmissions")}
					</p>
					<p className="text-3xl font-bold font-mono tabular-nums">{totalSubmissions}</p>
				</div>

				<div className="bg-card rounded-lg border p-5 animate-fade-up delay-1">
					<p className="text-xs font-medium text-muted-foreground mb-2">
						{t("admin.avgScore")}
					</p>
					<p className="text-3xl font-bold font-mono tabular-nums">{avgScore.toFixed(2)}</p>
					<p className="text-xs text-muted-foreground font-mono mt-1">/5.00</p>
				</div>

				<div className="bg-card rounded-lg border p-5 animate-fade-up delay-2">
					<p className="text-xs font-medium text-muted-foreground mb-2">
						{t("admin.distribution")}
					</p>
					<div className="flex flex-wrap gap-1.5">
						{Object.entries(diagnosisCounts).map(([diag, count]) => (
							<span
								key={diag}
								className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md border ${diagnosisColors[diag] || ""}`}
							>
								<span className={`h-1.5 w-1.5 rounded-full ${diagnosisDots[diag] || "bg-muted-foreground"}`} />
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
			<div className="bg-card rounded-lg border p-4 mb-5 animate-fade-up delay-3">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">
							{t("admin.industry")}
						</label>
						<Select value={industryFilter || "__all__"} onValueChange={(v: string) => setIndustryFilter(v === "__all__" ? "" : v)}>
							<SelectTrigger className="w-[200px]" data-testid="admin-filter-industry">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">{t("admin.allIndustries")}</SelectItem>
								{industryKeys.map((key) => (
									<SelectItem key={key} value={key}>
										{t(`industry.${key}`)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">
							{t("admin.companySize")}
						</label>
						<Select value={sizeFilter || "__all__"} onValueChange={(v: string) => setSizeFilter(v === "__all__" ? "" : v)}>
							<SelectTrigger className="w-[180px]" data-testid="admin-filter-size">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">{t("admin.allSizes")}</SelectItem>
								<SelectItem value="small">{t("size.small")}</SelectItem>
								<SelectItem value="medium">{t("size.medium")}</SelectItem>
								<SelectItem value="large">{t("size.large")}</SelectItem>
							</SelectContent>
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
				<div className="bg-card rounded-lg border overflow-hidden">
					<div className="p-4 space-y-3">
						<Skeleton className="h-10 w-full rounded-md" />
						{["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((id) => (
							<Skeleton key={id} className="h-14 w-full rounded-md" />
						))}
					</div>
				</div>
			) : (
				<div className="bg-card rounded-lg border overflow-hidden animate-fade-up delay-4" data-testid="admin-assessment-table">
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
												<div className="text-[11px] text-muted-foreground sm:hidden mt-0.5">{formatDateTime(a.submittedAt, locale)}</div>
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
													<span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${diagnosisDots[a.diagnosis] || "bg-muted-foreground"}`} />
													{t(`diagnosis.${a.diagnosis}`)}
												</Badge>
											</td>
											<td className="py-3 px-3 sm:px-5 text-muted-foreground font-mono text-xs hidden sm:table-cell">
												{formatDateTime(a.submittedAt, locale)}
											</td>
										</tr>
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
		</>
	);
}

// --- Users Tab (Person management) ---

function UserDetailDialog({ user, open, onClose, t, locale }: {
	readonly user: AdminUser | null;
	readonly open: boolean;
	readonly onClose: () => void;
	readonly t: (key: string) => string;
	readonly locale: string;
}) {
	if (!user) return null;

	const fields = [
		{ label: t("admin.contactName"), value: user.contactName || user.displayName },
		{ label: t("admin.accountEmail"), value: user.email },
		{ label: t("admin.contactEmail"), value: user.contactEmail },
		{ label: t("admin.phone"), value: user.contactPhone },
		{ label: t("admin.company"), value: user.companyName },
		{ label: t("admin.regId"), value: user.companyRegId },
		{ label: t("admin.industry"), value: user.industryType ? t(`industry.${user.industryType}`) : "" },
		{ label: t("admin.companySize"), value: user.companySize ? t(`size.${user.companySize}`) : "" },
		{ label: t("admin.role"), value: user.role === "admin" ? t("admin.roleAdmin") : t("admin.roleUser") },
		{ label: t("admin.registered"), value: user.createdAt ? formatDateTime(user.createdAt, locale) : "" },
		{ label: t("admin.lastUpdated"), value: user.updatedAt ? formatDateTime(user.updatedAt, locale) : "" },
	];

	return (
		<Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("admin.userDetail")}</DialogTitle>
					<DialogDescription>
						{user.contactName || user.displayName || user.email}
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 py-2">
					{fields.map((f) => (
						f.value ? (
							<div key={f.label}>
								<p className="text-xs text-muted-foreground">{f.label}</p>
								<p className="text-sm font-medium break-all">{f.value}</p>
							</div>
						) : null
					))}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>{t("admin.cancel")}</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function UsersTab() {
	const [users, setUsers] = useState<AdminUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [updatingUid, setUpdatingUid] = useState<string | null>(null);
	const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
	const [roleDialog, setRoleDialog] = useState<{ user: AdminUser; newRole: string } | null>(null);
	const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
	const [roleFilter, setRoleFilter] = useState("");
	const { t, locale } = useLocale();

	useEffect(() => {
		(async () => {
			setLoading(true);
			try {
				const data = await api.get<AdminUser[]>("/admin/users");
				setUsers(data);
			} catch {
				// Error loading
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const filteredUsers = roleFilter
		? users.filter((u) => u.role === roleFilter)
		: users;

	const openRoleDialog = (user: AdminUser, newRole: string) => {
		setRoleDialog({ user, newRole });
	};

	const confirmRoleChange = async () => {
		if (!roleDialog) return;
		const { user, newRole } = roleDialog;
		setRoleDialog(null);
		setUpdatingUid(user.uid);
		setToast(null);
		try {
			await api.put(`/admin/users/${user.uid}/role`, { role: newRole });
			setUsers((prev) =>
				prev.map((u) => (u.uid === user.uid ? { ...u, role: newRole } : u)),
			);
			setToast({ type: "success", msg: t("admin.roleUpdated") });
		} catch {
			setToast({ type: "error", msg: t("admin.roleError") });
		} finally {
			setUpdatingUid(null);
		}
	};

	const dialogName = roleDialog
		? roleDialog.user.contactName || roleDialog.user.displayName || roleDialog.user.email
		: "";
	const dialogMsg = roleDialog
		? roleDialog.newRole === "admin"
			? t("admin.confirmPromote").replace("{name}", dialogName)
			: t("admin.confirmDemote").replace("{name}", dialogName)
		: "";

	if (loading) {
		return (
			<div className="bg-card rounded-lg border overflow-hidden">
				<div className="p-4 space-y-3">
					<Skeleton className="h-10 w-full rounded-md" />
					{["u-1", "u-2", "u-3", "u-4"].map((id) => (
						<Skeleton key={id} className="h-14 w-full rounded-md" />
					))}
				</div>
			</div>
		);
	}

	return (
		<>
			{toast && (
				<div
					className={`mb-4 p-3 rounded-md text-sm animate-scale-in ${
						toast.type === "success"
							? "bg-emerald-50 text-emerald-800 border border-emerald-200"
							: "bg-red-50 text-red-800 border border-red-200"
					}`}
				>
					{toast.msg}
				</div>
			)}

			{/* Role filter */}
			<div className="bg-card rounded-lg border p-4 mb-5 animate-fade-up">
				<div className="flex flex-wrap gap-4 items-end">
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-muted-foreground">
							{t("admin.role")}
						</label>
						<Select value={roleFilter || "__all__"} onValueChange={(v: string) => setRoleFilter(v === "__all__" ? "" : v)}>
							<SelectTrigger className="w-[180px]" data-testid="admin-filter-role">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">{t("admin.allRoles")}</SelectItem>
								<SelectItem value="admin">{t("admin.filterAdmin")}</SelectItem>
								<SelectItem value="user">{t("admin.filterUser")}</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<p className="text-xs text-muted-foreground pb-2.5">
						{filteredUsers.length} / {users.length} {t("admin.users").toLowerCase()}
					</p>
				</div>
			</div>

			<div className="bg-card rounded-lg border overflow-hidden animate-fade-up" data-testid="admin-users-table">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b bg-muted/30">
								<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground">{t("admin.contactName")}</th>
								<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground hidden sm:table-cell">{t("admin.email")}</th>
								<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground">{t("admin.company")}</th>
								<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground">{t("admin.role")}</th>
								<th className="text-left py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground hidden sm:table-cell">{t("admin.registered")}</th>
								<th className="text-right py-3 px-3 sm:px-5 text-xs font-medium text-muted-foreground" />
							</tr>
						</thead>
						<tbody>
							{filteredUsers.map((u) => (
								<tr
									key={u.uid}
									className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
									onClick={() => setDetailUser(u)}
								>
									<td className="py-3 px-3 sm:px-5">
										<div className="text-sm font-medium">{u.contactName || u.displayName || "--"}</div>
										<div className="text-[11px] text-muted-foreground sm:hidden mt-0.5">{u.email}</div>
									</td>
									<td className="py-3 px-3 sm:px-5 font-mono text-xs text-muted-foreground hidden sm:table-cell">
										{u.email}
									</td>
									<td className="py-3 px-3 sm:px-5">
										<div className="text-sm">{u.companyName || "--"}</div>
										{u.industryType && (
											<div className="text-[11px] text-muted-foreground">{t(`industry.${u.industryType}`)}</div>
										)}
									</td>
									<td className="py-3 px-3 sm:px-5">
										<Badge
											className={`text-[10px] border ${
												u.role === "admin"
													? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800"
													: "bg-muted text-muted-foreground border-border"
											}`}
										>
											{u.role === "admin" ? t("admin.roleAdmin") : t("admin.roleUser")}
										</Badge>
									</td>
									<td className="py-3 px-3 sm:px-5 text-muted-foreground font-mono text-xs hidden sm:table-cell">
										{formatDateTime(u.createdAt, locale)}
									</td>
									<td className="py-3 px-3 sm:px-5 text-right" onClick={(e) => e.stopPropagation()}>
										{u.role === "admin" ? (
											<Button
												variant="outline"
												size="sm"
												className="text-xs h-7 px-2"
												disabled={updatingUid === u.uid}
												onClick={() => openRoleDialog(u, "user")}
											>
												{updatingUid === u.uid ? "..." : t("admin.demoteUser")}
											</Button>
										) : (
											<Button
												variant="outline"
												size="sm"
												className="text-xs h-7 px-2 border-violet-200 text-violet-700 hover:bg-violet-50"
												disabled={updatingUid === u.uid}
												onClick={() => openRoleDialog(u, "admin")}
											>
												{updatingUid === u.uid ? "..." : t("admin.promoteAdmin")}
											</Button>
										)}
									</td>
								</tr>
							))}
							{filteredUsers.length === 0 && (
								<tr>
									<td colSpan={6} className="py-16 text-center">
										<div className="flex flex-col items-center gap-2">
											<div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
												<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
													<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
												</svg>
											</div>
											<p className="text-muted-foreground text-sm">{t("admin.noUsers")}</p>
										</div>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* User detail dialog */}
			<UserDetailDialog
				user={detailUser}
				open={!!detailUser}
				onClose={() => setDetailUser(null)}
				t={t}
				locale={locale}
			/>

			{/* Role change confirmation dialog */}
			<Dialog open={!!roleDialog} onOpenChange={(open) => { if (!open) setRoleDialog(null); }}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							{roleDialog?.newRole === "admin" ? t("admin.promoteAdmin") : t("admin.demoteUser")}
						</DialogTitle>
						<DialogDescription>{dialogMsg}</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:gap-0">
						<Button variant="outline" onClick={() => setRoleDialog(null)}>
							{t("admin.cancel")}
						</Button>
						<Button
							onClick={confirmRoleChange}
							className={roleDialog?.newRole === "admin" ? "bg-violet-600 hover:bg-violet-700" : ""}
						>
							{roleDialog?.newRole === "admin" ? t("admin.promoteAdmin") : t("admin.demoteUser")}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

// --- Main Admin Page ---

export function AdminPage() {
	const { t } = useLocale();

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

	return (
		<div className="min-h-[calc(100vh-3.5rem)]">
			<div className="container max-w-6xl py-6 sm:py-8">
				{/* Header */}
				<div className="flex items-center justify-between mb-6 animate-fade-up">
					<div>
						<h1 className="text-2xl font-bold">{t("admin.title")}</h1>
						<p className="text-sm text-muted-foreground mt-0.5">{t("admin.subtitle")}</p>
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

				<Tabs defaultValue="quiz">
					<TabsList className="mb-5">
						<TabsTrigger value="quiz">{t("admin.tabQuiz")}</TabsTrigger>
						<TabsTrigger value="users">{t("admin.tabUsers")}</TabsTrigger>
					</TabsList>

					<TabsContent value="quiz">
						<QuizTab />
					</TabsContent>

					<TabsContent value="users">
						<UsersTab />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
