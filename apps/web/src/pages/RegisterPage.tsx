import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store";
import { setProfile, type Profile } from "@/store/authSlice";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const schema = z.object({
	companyName: z.string().min(1, "register.companyNameError"),
	companyRegId: z.string().regex(/^\d{13}$/, "register.regIdError"),
	industryType: z.string().min(1, "register.industryTypeError"),
	companySize: z.string().min(1, "register.companySizeError"),
	contactName: z.string().min(1, "register.contactNameError"),
	contactEmail: z.string().email("register.contactEmailError"),
	contactPhone: z.string().min(9, "register.contactPhoneError"),
});

type FormData = z.infer<typeof schema>;

interface DbdCompanyProfile {
	nameTh: string;
	nameEn: string;
	type: string;
	registerCapital: string;
	objectiveTextTh: string;
	objectiveTextEn: string;
	address: string;
	subDistrict: string;
	district: string;
	province: string;
}

const industryKeys = [
	"manufacturing", "food", "automotive", "electronics", "textile", "chemical",
	"construction", "agriculture", "logistics", "energy", "pharma", "plastics",
	"printing", "metal", "wood", "other",
] as const;

const sizeKeys = ["small", "medium", "large"] as const;

function estimateCompanySize(registerCapital: string): string {
	const capital = Number(registerCapital);
	if (!capital) return "";
	if (capital < 5_000_000) return "small";
	if (capital < 200_000_000) return "medium";
	return "large";
}

export function RegisterPage() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { isRegistered, hasCompletedQuiz, user } = useAppSelector((s) => s.auth);
	const { locale, t } = useLocale();
	const [error, setError] = useState<string | null>(null);
	const [isLookingUp, setIsLookingUp] = useState(false);
	const [dbdInfo, setDbdInfo] = useState<DbdCompanyProfile | null>(null);
	const [regIdTaken, setRegIdTaken] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			contactName: user?.displayName || "",
			contactEmail: user?.email || "",
		},
	});

	if (isRegistered && hasCompletedQuiz) {
		navigate("/results", { replace: true });
		return null;
	}
	if (isRegistered) {
		navigate("/quiz", { replace: true });
		return null;
	}

	function getLookupLabel() {
		if (dbdInfo) return t("register.lookupFound");
		if (isLookingUp) return t("register.lookupLoading");
		return t("register.lookup");
	}

	const handleDbdLookup = async () => {
		const regId = watch("companyRegId");
		if (!regId || !/^\d{13}$/.test(regId)) return;

		setIsLookingUp(true);
		setDbdInfo(null);
		setRegIdTaken(null);
		try {
			try {
				const check = await api.get<{ registered: boolean; companyName?: string }>(`/profile/check/${regId}`);
				if (check.registered) {
					setRegIdTaken(check.companyName || "Another company");
				}
			} catch {
				// proceed
			}
			const company = await api.get<DbdCompanyProfile>(`/dbd/${regId}`);
			if (company) {
				setDbdInfo(company);
				if (company.nameTh) setValue("companyName", company.nameTh);
				const size = estimateCompanySize(company.registerCapital);
				if (size) setValue("companySize", size);
			}
		} catch {
			// user fills manually
		} finally {
			setIsLookingUp(false);
		}
	};

	const onSubmit = async (data: FormData) => {
		setError(null);
		try {
			const profile = await api.post<Profile>("/profile", {
				...data,
				turnstileToken: "skip-for-now",
			});
			dispatch(setProfile(profile));
			navigate("/quiz");
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError(t("register.error"));
			}
		}
	};

	return (
		<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-grid bg-mesh">
			<div className="w-full max-w-lg animate-fade-up" data-testid="registration-form">
				<div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
					<div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-accent" />
					<div className="p-6 sm:p-8">
						<div className="mb-6">
							<div className="flex items-center gap-3 mb-2">
								<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
										<path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-10h2m4 0h2m-8 4h2m4 0h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
									</svg>
								</div>
								<div>
									<h1 className="text-xl font-extrabold">{t("register.title")}</h1>
									<p className="text-sm text-muted-foreground">{t("register.subtitle")}</p>
								</div>
							</div>
						</div>

						<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
							<div className="space-y-1.5">
								<label htmlFor="companyRegId" className="text-sm font-medium">{t("register.regId")}</label>
								<div className="flex gap-2">
									<Input
										id="companyRegId"
										placeholder="0115560016313"
										className="font-mono"
										{...register("companyRegId", {
											onChange: () => { setDbdInfo(null); setRegIdTaken(null); },
										})}
									/>
									<Button type="button" variant="outline" onClick={handleDbdLookup} disabled={isLookingUp || !!dbdInfo} className="flex-shrink-0">
										{isLookingUp ? (
											<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
												<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
												<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
											</svg>
										) : getLookupLabel()}
									</Button>
								</div>
								{errors.companyRegId && <p className="text-xs text-destructive">{t(errors.companyRegId.message || "")}</p>}
							</div>

							{regIdTaken && (
								<div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-sm text-blue-800">
									<p className="font-semibold text-xs uppercase tracking-wide mb-0.5">{t("register.regIdTaken.title")}</p>
									<p className="text-blue-700">&ldquo;{regIdTaken}&rdquo; {t("register.regIdTaken.desc")}</p>
								</div>
							)}

							{dbdInfo && (
								<div className="rounded-xl border bg-muted/30 p-3 text-sm space-y-0.5">
									<p className="font-semibold">{dbdInfo.nameTh}</p>
									{dbdInfo.nameEn && <p className="text-muted-foreground text-xs">{dbdInfo.nameEn}</p>}
									<p className="text-muted-foreground text-xs">{dbdInfo.type} &middot; {dbdInfo.objectiveTextTh || dbdInfo.objectiveTextEn}</p>
									{dbdInfo.address && <p className="text-muted-foreground text-xs">{dbdInfo.address} {dbdInfo.subDistrict} {dbdInfo.district} {dbdInfo.province}</p>}
								</div>
							)}

							<div className="space-y-1.5">
								<label htmlFor="companyName" className="text-sm font-medium">{t("register.companyName")}</label>
								<Input id="companyName" {...register("companyName")} />
								{errors.companyName && <p className="text-xs text-destructive">{t(errors.companyName.message || "")}</p>}
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label htmlFor="industryType" className="text-sm font-medium">{t("register.industryType")}</label>
									<Select id="industryType" {...register("industryType")}>
										<option value="">{t("register.select")}</option>
										{industryKeys.map((key) => <option key={key} value={key}>{t(`industry.${key}`)}</option>)}
									</Select>
									{errors.industryType && <p className="text-xs text-destructive">{t(errors.industryType.message || "")}</p>}
								</div>
								<div className="space-y-1.5">
									<label htmlFor="companySize" className="text-sm font-medium">{t("register.companySize")}</label>
									<Select id="companySize" {...register("companySize")}>
										<option value="">{t("register.select")}</option>
										{sizeKeys.map((key) => <option key={key} value={key}>{t(`size.${key}`)}</option>)}
									</Select>
									{errors.companySize && <p className="text-xs text-destructive">{t(errors.companySize.message || "")}</p>}
								</div>
							</div>

							<div className="border-t pt-4">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
									{locale === "th" ? "ข้อมูลผู้ติดต่อ" : "Contact Information"}
								</p>
							</div>

							<div className="space-y-1.5">
								<label htmlFor="contactName" className="text-sm font-medium">{t("register.contactName")}</label>
								<Input id="contactName" {...register("contactName")} />
								{errors.contactName && <p className="text-xs text-destructive">{t(errors.contactName.message || "")}</p>}
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label htmlFor="contactEmail" className="text-sm font-medium">{t("register.contactEmail")}</label>
									<Input id="contactEmail" type="email" disabled className="bg-muted/50 cursor-not-allowed text-muted-foreground" {...register("contactEmail")} />
									{errors.contactEmail && <p className="text-xs text-destructive">{t(errors.contactEmail.message || "")}</p>}
								</div>
								<div className="space-y-1.5">
									<label htmlFor="contactPhone" className="text-sm font-medium">{t("register.contactPhone")}</label>
									<Input id="contactPhone" {...register("contactPhone")} />
									{errors.contactPhone && <p className="text-xs text-destructive">{t(errors.contactPhone.message || "")}</p>}
								</div>
							</div>

							{error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">{error}</div>}

							<Button type="submit" className="w-full h-11 font-semibold shadow-md shadow-primary/20" disabled={isSubmitting} data-testid="registration-submit-btn">
								{isSubmitting ? (
									<>
										<svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
										</svg>
										{t("register.submitting")}
									</>
								) : t("register.submit")}
							</Button>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
