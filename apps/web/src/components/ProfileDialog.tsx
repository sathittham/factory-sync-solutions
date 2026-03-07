import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiError } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store";
import { setProfile, type Profile } from "@/store/authSlice";
import { useLocale } from "@/lib/i18n";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

const schema = z.object({
	companyName: z.string().min(1, "register.companyNameError"),
	industryType: z.string().min(1, "register.industryTypeError"),
	companySize: z.string().min(1, "register.companySizeError"),
	contactName: z.string().min(1, "register.contactNameError"),
	contactEmail: z.string().email("register.contactEmailError"),
	contactPhone: z.string().min(9, "register.contactPhoneError"),
});

type FormData = z.infer<typeof schema>;

const industryKeys = [
	"manufacturing", "food", "automotive", "electronics", "textile", "chemical",
	"construction", "agriculture", "logistics", "energy", "pharma", "plastics",
	"printing", "metal", "wood", "other",
] as const;

const sizeKeys = ["small", "medium", "large"] as const;

interface ProfileDialogProps {
	readonly open: boolean;
	readonly onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
	const dispatch = useAppDispatch();
	const { profile, user } = useAppSelector((s) => s.auth);
	const { t } = useLocale();
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting, isDirty },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			companyName: profile?.companyName || "",
			industryType: profile?.industryType || "",
			companySize: profile?.companySize || "",
			contactName: profile?.contactName || "",
			contactEmail: profile?.contactEmail || "",
			contactPhone: profile?.contactPhone || "",
		},
	});

	// Reset form when dialog opens with latest profile data
	useEffect(() => {
		if (open && profile) {
			reset({
				companyName: profile.companyName || "",
				industryType: profile.industryType || "",
				companySize: profile.companySize || "",
				contactName: profile.contactName || "",
				contactEmail: profile.contactEmail || "",
				contactPhone: profile.contactPhone || "",
			});
			setError(null);
			setSuccess(false);
		}
	}, [open, profile, reset]);

	const onSubmit = async (data: FormData) => {
		setError(null);
		setSuccess(false);
		trackEvent("profile_save", { industry: data.industryType, size: data.companySize });
		try {
			const updated = await api.put<Profile>("/profile", data);
			dispatch(setProfile(updated));
			setSuccess(true);
			trackEvent("profile_save_success", { industry: data.industryType, size: data.companySize });
			setTimeout(() => setSuccess(false), 3000);
		} catch (err) {
			if (err instanceof ApiError) {
				setError(err.message);
			} else {
				setError(t("profile.error"));
			}
			trackEvent("profile_save_error", { error: err instanceof ApiError ? err.message : "unknown" });
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0" data-testid="profile-dialog">
				<DialogHeader className="px-6 pt-6 pb-4">
					<DialogTitle>{t("profile.title")}</DialogTitle>
					<DialogDescription>{t("profile.subtitle")}</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6" data-testid="profile-form">
					{/* Section 1: User Account (read-only from Google) */}
					<div className="mb-5">
						<div className="flex items-center gap-3 mb-4">
							<span className="h-px flex-1 bg-border" />
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								{t("profile.userSection")}
							</p>
							<span className="h-px flex-1 bg-border" />
						</div>

						<div className="rounded-md border bg-muted/30 p-4 space-y-3">
							<div className="flex items-center gap-3">
								{user?.photoURL ? (
									<img
										src={user.photoURL}
										alt=""
										referrerPolicy="no-referrer"
										className="h-10 w-10 rounded-full object-cover flex-shrink-0"
									/>
								) : (
									<div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold uppercase flex-shrink-0">
										{(user?.displayName || user?.email || "U").charAt(0)}
									</div>
								)}
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium truncate">{user?.displayName}</p>
									<p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
								</div>
								<span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">Google</span>
							</div>
							{profile?.companyRegId && (
								<>
									<div className="h-px bg-border" />
									<div className="flex items-center justify-between">
										<span className="text-xs font-medium text-muted-foreground">{t("profile.regId")}</span>
										<span className="text-sm font-mono text-foreground/70 tracking-wide">{profile.companyRegId}</span>
									</div>
								</>
							)}
						</div>
					</div>

					{/* Section 2: Contact Person */}
					<div className="mb-5">
						<div className="flex items-center gap-3 mb-4">
							<span className="h-px flex-1 bg-border" />
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								{t("profile.contactSection")}
							</p>
							<span className="h-px flex-1 bg-border" />
						</div>

						<div className="space-y-3">
							<div className="space-y-1.5">
								<label htmlFor="pd-contactName" className="text-sm font-medium">{t("register.contactName")}</label>
								<Input id="pd-contactName" {...register("contactName")} />
								{errors.contactName && <p className="text-xs text-destructive">{t(errors.contactName.message || "")}</p>}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label htmlFor="pd-contactEmail" className="text-sm font-medium">{t("register.contactEmail")}</label>
									<Input id="pd-contactEmail" type="email" {...register("contactEmail")} />
									{errors.contactEmail && <p className="text-xs text-destructive">{t(errors.contactEmail.message || "")}</p>}
								</div>
								<div className="space-y-1.5">
									<label htmlFor="pd-contactPhone" className="text-sm font-medium">{t("register.contactPhone")}</label>
									<Input id="pd-contactPhone" {...register("contactPhone")} />
									{errors.contactPhone && <p className="text-xs text-destructive">{t(errors.contactPhone.message || "")}</p>}
								</div>
							</div>
						</div>
					</div>

					{/* Section 2: Company Profile */}
					<div className="mb-5">
						<div className="flex items-center gap-3 mb-4">
							<span className="h-px flex-1 bg-border" />
							<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
								{t("profile.companySection")}
							</p>
							<span className="h-px flex-1 bg-border" />
						</div>

						<div className="space-y-3">
							<div className="space-y-1.5">
								<label htmlFor="pd-companyName" className="text-sm font-medium">{t("register.companyName")}</label>
								<Input id="pd-companyName" {...register("companyName")} />
								{errors.companyName && <p className="text-xs text-destructive">{t(errors.companyName.message || "")}</p>}
							</div>

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<label htmlFor="pd-industryType" className="text-sm font-medium">{t("register.industryType")}</label>
									<Select id="pd-industryType" {...register("industryType")}>
										<option value="">{t("register.select")}</option>
										{industryKeys.map((key) => <option key={key} value={key}>{t(`industry.${key}`)}</option>)}
									</Select>
									{errors.industryType && <p className="text-xs text-destructive">{t(errors.industryType.message || "")}</p>}
								</div>
								<div className="space-y-1.5">
									<label htmlFor="pd-companySize" className="text-sm font-medium">{t("register.companySize")}</label>
									<Select id="pd-companySize" {...register("companySize")}>
										<option value="">{t("register.select")}</option>
										{sizeKeys.map((key) => <option key={key} value={key}>{t(`size.${key}`)}</option>)}
									</Select>
									{errors.companySize && <p className="text-xs text-destructive">{t(errors.companySize.message || "")}</p>}
								</div>
							</div>
						</div>
					</div>

					{/* Feedback messages */}
					{error && (
						<div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center animate-scale-in mb-4">
							{error}
						</div>
					)}

					{success && (
						<div className="p-3 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm text-center animate-scale-in mb-4">
							<span className="inline-flex items-center gap-1.5">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
									<path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>
								{t("profile.saved")}
							</span>
						</div>
					)}

					<Button
						type="submit"
						className="w-full h-11 font-semibold"
						disabled={isSubmitting || !isDirty}
						data-testid="profile-submit-btn"
					>
						{isSubmitting ? (
							<>
								<svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
								</svg>
								{t("profile.saving")}
							</>
						) : t("profile.save")}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
