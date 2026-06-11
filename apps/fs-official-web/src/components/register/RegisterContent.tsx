import { Turnstile } from "@/components/Turnstile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import heroBackground from "@/fs-bg.png";
import { LocaleProvider, useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	type User,
	createUserWithEmailAndPassword,
	getAdditionalUserInfo,
	onAuthStateChanged,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signInWithPopup,
} from "firebase/auth";
import { ArrowLeft, Check, Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, type FieldErrors, type UseFormRegister, useForm } from "react-hook-form";
import { z } from "zod";
import { auth, googleProvider } from "../../lib/firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegisterContentProps {
	readonly appUrl: string;
	readonly apiBaseUrl: string;
	readonly turnstileSiteKey: string;
}

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

interface CheckRegIdResponse {
	registered: boolean;
	companyName?: string;
	industryType?: string;
	companySize?: string;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schema = z.object({
	companyName: z.string().min(1, "register.companyNameError"),
	companyRegId: z.string().regex(/^\d{13}$/, { message: "register.regIdError" }),
	industryType: z.string().min(1, "register.industryTypeError"),
	companySize: z.string().min(1, "register.companySizeError"),
	contactName: z.string().min(1, "register.contactNameError"),
	contactEmail: z.string().email({ message: "register.contactEmailError" }),
	contactPhone: z.string().min(9, "register.contactPhoneError"),
	acceptTerms: z.literal(true, { error: "register.acceptTermsError" }),
	marketingConsent: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const industryKeys = [
	"manufacturing",
	"food",
	"automotive",
	"electronics",
	"textile",
	"chemical",
	"construction",
	"agriculture",
	"logistics",
	"energy",
	"pharma",
	"plastics",
	"printing",
	"metal",
	"wood",
	"other",
] as const;

const sizeKeys = ["small", "medium", "large"] as const;

const HERO_IMG = heroBackground.src;

// Steps 1-3 map to: auth → company → contact; 4 = success
type PageStep = 1 | 2 | 3 | 4;

const STEP_KEYS = [
	"register.step.account",
	"register.step.company",
	"register.step.contact",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function estimateCompanySize(registerCapital: string): string {
	const capital = Number(registerCapital);
	if (!capital) return "";
	if (capital < 5_000_000) return "small";
	if (capital < 200_000_000) return "medium";
	return "large";
}

function mapFirebaseError(code: string, t: (key: string) => string): string {
	switch (code) {
		case "auth/invalid-email":
			return t("signin.errorInvalidEmail");
		case "auth/user-not-found":
		case "auth/wrong-password":
		case "auth/invalid-credential":
			return t("signin.errorInvalidCredential");
		case "auth/email-already-in-use":
			return t("signin.errorEmailInUse");
		case "auth/weak-password":
			return t("signin.errorWeakPassword");
		case "auth/account-exists-with-different-credential":
			return t("signin.errorAccountExistsOtherProvider");
		case "auth/too-many-requests":
			return t("signin.errorTooManyRequests");
		case "auth/network-request-failed":
			return t("signin.errorNetwork");
		default:
			return t("signin.errorGeneric");
	}
}

class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = "ApiError";
	}
}

// ---------------------------------------------------------------------------
// StepIndicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { readonly current: PageStep }) {
	const { t } = useLocale();
	// Only show for steps 1-3; step 4 is success
	const displayStep = Math.min(current, 3) as 1 | 2 | 3;

	return (
		<div className="flex items-start justify-center mb-8">
			{STEP_KEYS.map((key, i) => {
				const stepNum = (i + 1) as 1 | 2 | 3;
				const isDone = displayStep > stepNum;
				const isActive = displayStep === stepNum;

				let circleStyle: string;
				if (isDone) {
					circleStyle = "border-blue-600 bg-blue-600 text-white";
				} else if (isActive) {
					circleStyle =
						"border-blue-600 bg-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,0.15)]";
				} else {
					circleStyle =
						"border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500";
				}

				let labelStyle: string;
				if (isActive) {
					labelStyle = "text-slate-900 dark:text-white";
				} else if (isDone) {
					labelStyle = "text-blue-600 dark:text-blue-400";
				} else {
					labelStyle = "text-slate-400 dark:text-slate-500";
				}

				return (
					<div key={key} className="flex items-start">
						{/* Circle + label */}
						<div className="flex flex-col items-center gap-1.5 w-20 sm:w-24">
							<div
								className={cn(
									"flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200",
									circleStyle
								)}
							>
								{isDone ? <Check className="h-4 w-4 stroke-[3]" /> : stepNum}
							</div>
							<span className={cn("text-center text-[11px] leading-tight font-medium", labelStyle)}>
								{t(key)}
							</span>
						</div>
						{/* Connector line — skip after last step */}
						{i < STEP_KEYS.length - 1 && (
							<div
								className={cn(
									"mt-4 h-0.5 w-10 sm:w-16 shrink-0 transition-colors duration-200",
									isDone ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
								)}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner() {
	return (
		<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
			<path
				className="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			/>
		</svg>
	);
}

function DbdInfoCard({ info }: { readonly info: DbdCompanyProfile }) {
	return (
		<div className="rounded-md border bg-muted/30 p-3 text-sm space-y-0.5">
			<p className="font-medium">{info.nameTh}</p>
			{info.nameEn && <p className="text-muted-foreground text-xs">{info.nameEn}</p>}
			<p className="text-muted-foreground text-xs">
				{info.type} &middot; {info.objectiveTextTh || info.objectiveTextEn}
			</p>
			{info.address && (
				<p className="text-muted-foreground text-xs">
					{info.address} {info.subDistrict} {info.district} {info.province}
				</p>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Auth step
// ---------------------------------------------------------------------------

type AuthMode = "signin" | "signup" | "reset";

function AuthStep({ onAuthenticated }: { readonly onAuthenticated: (user: User) => void }) {
	const { t } = useLocale();
	const [mode, setMode] = useState<AuthMode>("signup");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [isEmailLoading, setIsEmailLoading] = useState(false);
	const [isGoogleLoading, setIsGoogleLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);

	const isAnyLoading = isEmailLoading || isGoogleLoading;

	const switchMode = (next: AuthMode) => {
		setEmail("");
		setPassword("");
		setConfirmPassword("");
		setError(null);
		setSuccessMessage(null);
		setMode(next);
	};

	const handleGoogleSignIn = async () => {
		setIsGoogleLoading(true);
		setError(null);
		try {
			const result = await signInWithPopup(auth, googleProvider);
			const additionalInfo = getAdditionalUserInfo(result);
			if (additionalInfo?.isNewUser) {
				globalThis.gtag?.("event", "sign_up", { method: "google" });
			}
			onAuthenticated(result.user);
		} catch (err: unknown) {
			const code = (err as { code?: string }).code ?? "";
			if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
				setError(mapFirebaseError(code, t));
			}
		} finally {
			setIsGoogleLoading(false);
		}
	};

	const handleEmailSignIn = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		setIsEmailLoading(true);
		try {
			const result = await signInWithEmailAndPassword(auth, email, password);
			onAuthenticated(result.user);
		} catch (err: unknown) {
			const code = (err as { code?: string }).code ?? "";
			setError(mapFirebaseError(code, t));
		} finally {
			setIsEmailLoading(false);
		}
	};

	const handleEmailSignUp = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		if (password !== confirmPassword) {
			setError(t("signin.errorPasswordMismatch"));
			return;
		}
		setIsEmailLoading(true);
		try {
			const result = await createUserWithEmailAndPassword(auth, email, password);
			globalThis.gtag?.("event", "sign_up", { method: "email" });
			onAuthenticated(result.user);
		} catch (err: unknown) {
			const code = (err as { code?: string }).code ?? "";
			setError(mapFirebaseError(code, t));
		} finally {
			setIsEmailLoading(false);
		}
	};

	const handlePasswordReset = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		setIsEmailLoading(true);
		try {
			await sendPasswordResetEmail(auth, email);
			setSuccessMessage(t("signin.resetEmailSent"));
		} catch (err: unknown) {
			const code = (err as { code?: string }).code ?? "";
			setError(mapFirebaseError(code, t));
		} finally {
			setIsEmailLoading(false);
		}
	};

	const modeConfig = {
		signup: {
			heading: t("signin.createAccountTitle"),
			subheading: t("signin.createAccountSubtitle"),
			idleLabel: t("signin.createAccount"),
			handler: handleEmailSignUp,
		},
		signin: {
			heading: t("signin.title"),
			subheading: t("signin.subtitle"),
			idleLabel: t("signin.signInWithEmail"),
			handler: handleEmailSignIn,
		},
		reset: {
			heading: t("signin.resetTitle"),
			subheading: t("signin.resetSubtitle"),
			idleLabel: t("signin.sendResetEmail"),
			handler: handlePasswordReset,
		},
	};
	const { heading, subheading, idleLabel, handler: submitHandler } = modeConfig[mode];
	const submitLabel = isEmailLoading ? t("signin.loading") : idleLabel;

	return (
		<div className="space-y-5">
			<div className="flex flex-col items-center text-center gap-1.5">
				<h2 className="text-xl font-bold">{heading}</h2>
				<p className="text-sm text-muted-foreground">{subheading}</p>
			</div>

			<form onSubmit={submitHandler} className="space-y-3">
				<div className="space-y-1.5">
					<label htmlFor="auth-email" className="text-sm font-medium">
						{t("signin.emailLabel")}
					</label>
					<Input
						id="auth-email"
						type="email"
						autoComplete="email"
						placeholder={t("register.emailPlaceholder")}
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						disabled={isAnyLoading}
					/>
				</div>

				{mode !== "reset" && (
					<div className="space-y-1.5">
						<div className="flex items-center justify-between">
							<label htmlFor="auth-password" className="text-sm font-medium">
								{t("signin.passwordLabel")}
							</label>
							{mode === "signin" && (
								<button
									type="button"
									className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
									onClick={() => switchMode("reset")}
								>
									{t("signin.forgotPassword")}
								</button>
							)}
						</div>
						<div className="relative">
							<Input
								id="auth-password"
								type={showPassword ? "text" : "password"}
								autoComplete={mode === "signup" ? "new-password" : "current-password"}
								placeholder="••••••••"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={isAnyLoading}
								className="pr-10"
							/>
							<button
								type="button"
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								onClick={() => setShowPassword((v) => !v)}
								aria-label={showPassword ? t("signin.hidePassword") : t("signin.showPassword")}
							>
								{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
							</button>
						</div>
					</div>
				)}

				{mode === "signup" && (
					<div className="space-y-1.5">
						<label htmlFor="auth-confirm" className="text-sm font-medium">
							{t("signin.confirmPasswordLabel")}
						</label>
						<Input
							id="auth-confirm"
							type={showPassword ? "text" : "password"}
							autoComplete="new-password"
							placeholder="••••••••"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							required
							disabled={isAnyLoading}
						/>
					</div>
				)}

				{error && <p className="text-sm text-destructive text-center">{error}</p>}
				{successMessage && (
					<p className="text-sm text-green-600 dark:text-green-400 text-center">{successMessage}</p>
				)}

				<Button type="submit" className="w-full h-11 font-semibold" disabled={isAnyLoading}>
					{isEmailLoading ? (
						<>
							<Spinner />
							<span className="ml-2">{t("signin.loading")}</span>
						</>
					) : (
						submitLabel
					)}
				</Button>
			</form>

			{mode === "reset" ? (
				<p className="text-center text-sm text-muted-foreground">
					<button
						type="button"
						className="underline underline-offset-4 hover:text-primary"
						onClick={() => switchMode("signin")}
					>
						{t("signin.backToSignIn")}
					</button>
				</p>
			) : (
				<>
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-background px-2 text-muted-foreground">
								{t("signin.orContinueWith")}
							</span>
						</div>
					</div>

					<Button
						type="button"
						variant="outline"
						className="w-full h-11 font-semibold gap-2"
						onClick={handleGoogleSignIn}
						disabled={isAnyLoading}
					>
						{isGoogleLoading ? (
							<Spinner />
						) : (
							<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
								<path
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									fill="#4285F4"
								/>
								<path
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									fill="#34A853"
								/>
								<path
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
									fill="#FBBC05"
								/>
								<path
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									fill="#EA4335"
								/>
							</svg>
						)}
						{t("signin.signInWithGoogle")}
					</Button>

					<p className="text-center text-sm text-muted-foreground">
						{mode === "signup" ? t("signin.haveAccount") : t("signin.noAccount")}{" "}
						<button
							type="button"
							className="font-medium underline underline-offset-4 hover:text-primary"
							onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
						>
							{mode === "signup" ? t("signin.signInLink") : t("signin.signUpLink")}
						</button>
					</p>
				</>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------

function SuccessCard({
	appUrl,
	t,
}: { readonly appUrl: string; readonly t: (k: string) => string }) {
	return (
		<div className="flex flex-col items-center text-center gap-4 py-4">
			<div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
				<svg
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-green-600 dark:text-green-400"
					aria-hidden="true"
				>
					<path d="M20 6L9 17l-5-5" />
				</svg>
			</div>
			<div className="space-y-1">
				<h2 className="text-2xl font-bold">{t("register.success.title")}</h2>
				<p className="text-base text-muted-foreground">{t("register.success.desc")}</p>
			</div>
			<a
				href={appUrl}
				className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-600 px-8 font-semibold text-white shadow-[0_0_24px_rgba(37,99,235,0.35)] transition-colors hover:bg-blue-500"
			>
				{t("register.success.goToApp")}
				<svg
					width="14"
					height="14"
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
		</div>
	);
}

// ---------------------------------------------------------------------------
// Registration form — Step 2 (company) + Step 3 (contact/consent)
// ---------------------------------------------------------------------------

function RegistrationForm({
	user,
	apiBaseUrl,
	turnstileSiteKey,
	onSuccess,
	onStepChange,
}: {
	readonly user: User;
	readonly apiBaseUrl: string;
	readonly turnstileSiteKey: string;
	readonly onSuccess: () => void;
	readonly onStepChange: (step: 2 | 3) => void;
}) {
	const { locale, t } = useLocale();
	const [formStep, setFormStep] = useState<"company" | "contact">("company");
	const [error, setError] = useState<string | null>(null);
	const [isLookingUp, setIsLookingUp] = useState(false);
	const [dbdInfo, setDbdInfo] = useState<DbdCompanyProfile | null>(null);
	const [regIdTaken, setRegIdTaken] = useState<string | null>(null);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [turnstileError, setTurnstileError] = useState(false);

	const handleTurnstileVerify = useCallback((token: string) => {
		setTurnstileToken(token);
		setTurnstileError(false);
	}, []);

	const handleTurnstileExpire = useCallback(() => {
		setTurnstileToken(null);
	}, []);

	const handleTurnstileError = useCallback(() => {
		setTurnstileToken(null);
		setTurnstileError(true);
	}, []);

	const {
		register: formRegister,
		control,
		handleSubmit,
		setValue,
		watch,
		trigger,
		formState: { errors, isSubmitting },
	} = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			companyName: "",
			companyRegId: "",
			industryType: "",
			companySize: "",
			contactName: user.displayName ?? "",
			contactEmail: user.email ?? "",
			contactPhone: "",
			marketingConsent: false,
		},
	});

	function getLookupLabel() {
		if (dbdInfo) return t("register.lookupFound");
		if (isLookingUp) return t("register.lookupLoading");
		return t("register.lookup");
	}

	const prefillFromExisting = (check: CheckRegIdResponse) => {
		setRegIdTaken(check.companyName ?? t("register.companyName.unknown"));
		if (check.companyName) setValue("companyName", check.companyName);
		if (check.industryType) setValue("industryType", check.industryType);
		if (check.companySize) setValue("companySize", check.companySize);
	};

	const prefillFromDbd = (company: DbdCompanyProfile) => {
		if (company.nameTh) setValue("companyName", company.nameTh);
		const size = estimateCompanySize(company.registerCapital);
		if (size) setValue("companySize", size);
	};

	const handleDbdLookup = async () => {
		const regId = watch("companyRegId");
		if (!regId || !/^\d{13}$/.test(regId)) return;

		setIsLookingUp(true);
		setDbdInfo(null);
		setRegIdTaken(null);

		try {
			const token = await user.getIdToken();
			const headers = {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			};

			// Check existing profile
			const checkRes = await fetch(`${apiBaseUrl}/profile/check/${regId}`, { headers });
			const check: CheckRegIdResponse | null = checkRes.ok ? await checkRes.json() : null;
			const hasExisting = check?.registered === true;
			if (hasExisting && check) prefillFromExisting(check);

			// DBD lookup
			const dbdRes = await fetch(`${apiBaseUrl}/dbd/${regId}`, { headers });
			if (dbdRes.ok) {
				const dbdData: DbdCompanyProfile = await dbdRes.json();
				setDbdInfo(dbdData);
				if (!hasExisting) prefillFromDbd(dbdData);
			}
		} catch {
			// user fills manually
		} finally {
			setIsLookingUp(false);
		}
	};

	const handleNextStep = async () => {
		const valid = await trigger(["companyRegId", "companyName", "industryType", "companySize"]);
		if (valid) {
			setFormStep("contact");
			onStepChange(3);
		}
	};

	const handleBackStep = () => {
		setFormStep("company");
		setError(null);
		onStepChange(2);
	};

	const onSubmit = async (data: FormData) => {
		setError(null);
		if (turnstileSiteKey && !turnstileToken) {
			return; // CAPTCHA required — block silently (widget is visible)
		}

		try {
			const token = await user.getIdToken();
			const { acceptTerms: _, ...payload } = data;
			const res = await fetch(`${apiBaseUrl}/profile`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					...payload,
					marketingConsent: !!data.marketingConsent,
					turnstileToken: turnstileToken ?? "",
				}),
			});

			if (!res.ok) {
				const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
				const errMsg = body.error?.message ?? body.error ?? res.statusText;
				throw new ApiError(res.status, typeof errMsg === "string" ? errMsg : res.statusText);
			}

			globalThis.gtag?.("event", "generate_lead", {
				event_category: "registration",
			});
			onSuccess();
		} catch (err) {
			setError(err instanceof ApiError ? err.message : t("register.error"));
		}
	};

	// -------------------------------------------------------------------------
	// Step 2 — Company info
	// -------------------------------------------------------------------------
	if (formStep === "company") {
		return (
			<div className="space-y-4">
				{/* Registration ID with lookup */}
				<div className="space-y-1.5">
					<label htmlFor="companyRegId" className="text-sm font-medium">
						{t("register.regId")}
					</label>
					<div className="flex gap-2">
						<Input
							id="companyRegId"
							placeholder="0115560016313"
							className="font-mono tracking-wide"
							data-testid="reg-company-id-input"
							{...formRegister("companyRegId", {
								onChange: () => {
									setDbdInfo(null);
									setRegIdTaken(null);
								},
							})}
						/>
						<Button
							type="button"
							variant="outline"
							onClick={handleDbdLookup}
							disabled={isLookingUp || !!dbdInfo}
							className="shrink-0 min-w-[80px]"
							data-testid="reg-dbd-lookup-btn"
						>
							{isLookingUp ? <Spinner /> : getLookupLabel()}
						</Button>
					</div>
					{errors.companyRegId && (
						<p className="text-xs text-destructive">{t(errors.companyRegId.message ?? "")}</p>
					)}
				</div>

				{regIdTaken && (
					<div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-300">
						<p className="font-medium text-xs mb-0.5">{t("register.regIdTaken.title")}</p>
						<p className="text-blue-700 dark:text-blue-400 text-[13px]">
							&ldquo;{regIdTaken}&rdquo; {t("register.regIdTaken.desc")}
						</p>
					</div>
				)}

				{dbdInfo && <DbdInfoCard info={dbdInfo} />}

				{/* Company name */}
				<div className="space-y-1.5">
					<label htmlFor="companyName" className="text-sm font-medium">
						{t("register.companyName")}
					</label>
					<Input id="companyName" {...formRegister("companyName")} />
					{errors.companyName && (
						<p className="text-xs text-destructive">{t(errors.companyName.message ?? "")}</p>
					)}
				</div>

				{/* Industry + Size */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<label htmlFor="industryType" className="text-sm font-medium">
							{t("register.industryType")}
						</label>
						<Controller
							name="industryType"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										id="industryType"
										onBlur={field.onBlur}
										aria-invalid={!!errors.industryType}
									>
										<SelectValue placeholder={t("register.select")} />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{industryKeys.map((key) => (
												<SelectItem key={key} value={key}>
													{t(`industry.${key}`)}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							)}
						/>
						{errors.industryType && (
							<p className="text-xs text-destructive">{t(errors.industryType.message ?? "")}</p>
						)}
					</div>
					<div className="space-y-1.5">
						<label htmlFor="companySize" className="text-sm font-medium">
							{t("register.companySize")}
						</label>
						<Controller
							name="companySize"
							control={control}
							render={({ field }) => (
								<Select value={field.value} onValueChange={field.onChange}>
									<SelectTrigger
										id="companySize"
										onBlur={field.onBlur}
										aria-invalid={!!errors.companySize}
									>
										<SelectValue placeholder={t("register.select")} />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{sizeKeys.map((key) => (
												<SelectItem key={key} value={key}>
													{t(`size.${key}`)}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							)}
						/>
						{errors.companySize && (
							<p className="text-xs text-destructive">{t(errors.companySize.message ?? "")}</p>
						)}
					</div>
				</div>

				<Button type="button" className="w-full h-11 font-semibold" onClick={handleNextStep}>
					{t("register.next")} →
				</Button>
			</div>
		);
	}

	// -------------------------------------------------------------------------
	// Step 3 — Contact info + consent + submit
	// -------------------------------------------------------------------------
	return (
		<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
			<ContactFields formRegister={formRegister} errors={errors} t={t} />

			{/* Consent checkboxes */}
			<div className="space-y-3 pt-1">
				<div className="flex items-start gap-2.5">
					<input
						type="checkbox"
						id="acceptTerms"
						className="mt-1 h-4 w-4 rounded border-gray-300 accent-primary"
						{...formRegister("acceptTerms")}
					/>
					<label htmlFor="acceptTerms" className="text-sm leading-relaxed">
						{t("register.acceptTerms")}{" "}
						<a
							href="/terms"
							target="_blank"
							rel="noreferrer"
							className="text-primary hover:underline font-medium"
						>
							{t("register.termsLink")}
						</a>{" "}
						{t("register.and")}{" "}
						<a
							href="/privacy"
							target="_blank"
							rel="noreferrer"
							className="text-primary hover:underline font-medium"
						>
							{t("register.privacyLink")}
						</a>
					</label>
				</div>
				{errors.acceptTerms && (
					<p className="text-xs text-destructive ml-6">
						{t(errors.acceptTerms.message ?? "register.acceptTermsError")}
					</p>
				)}

				<div className="flex items-start gap-2.5">
					<input
						type="checkbox"
						id="marketingConsent"
						className="mt-1 h-4 w-4 rounded border-gray-300 accent-primary"
						{...formRegister("marketingConsent")}
					/>
					<label htmlFor="marketingConsent" className="text-sm leading-relaxed">
						{t("register.marketingConsent")}
						<span className="block text-xs text-muted-foreground mt-0.5">
							{t("register.marketingConsentDetail")}{" "}
							<a
								href="/marketing"
								target="_blank"
								rel="noreferrer"
								className="text-primary hover:underline font-medium"
							>
								{t("register.marketingPolicyLink")}
							</a>
						</span>
					</label>
				</div>
			</div>

			{turnstileSiteKey && (
				<div className="flex flex-col items-center gap-2">
					<Turnstile
						siteKey={turnstileSiteKey}
						onVerify={handleTurnstileVerify}
						onExpire={handleTurnstileExpire}
						onError={handleTurnstileError}
						language={locale}
					/>
					{turnstileError && (
						<p className="text-xs text-muted-foreground text-center">
							{t("register.captchaUnavailable")}
						</p>
					)}
				</div>
			)}

			{error && (
				<div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
					{error}
				</div>
			)}

			<div className="flex gap-3">
				<Button
					type="button"
					variant="outline"
					className="h-11 gap-1.5"
					onClick={handleBackStep}
					disabled={isSubmitting}
				>
					<ArrowLeft className="h-4 w-4" />
					{t("register.back")}
				</Button>
				<Button
					type="submit"
					className="flex-1 h-11 font-semibold"
					disabled={isSubmitting}
					data-testid="registration-submit-btn"
				>
					{isSubmitting ? (
						<>
							<Spinner />
							<span className="ml-2">{t("register.submitting")}</span>
						</>
					) : (
						t("register.submit")
					)}
				</Button>
			</div>
		</form>
	);
}

// ---------------------------------------------------------------------------
// ContactFields (shared between form steps)
// ---------------------------------------------------------------------------

function ContactFields({
	formRegister,
	errors,
	t,
}: {
	readonly formRegister: UseFormRegister<FormData>;
	readonly errors: FieldErrors<FormData>;
	readonly t: (key: string) => string;
}) {
	return (
		<>
			<div className="space-y-1.5">
				<label htmlFor="contactName" className="text-sm font-medium">
					{t("register.contactName")}
				</label>
				<Input id="contactName" {...formRegister("contactName")} />
				{errors.contactName && (
					<p className="text-xs text-destructive">{t(errors.contactName.message ?? "")}</p>
				)}
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div className="space-y-1.5">
					<label htmlFor="contactEmail" className="text-sm font-medium">
						{t("register.contactEmail")}
					</label>
					<Input
						id="contactEmail"
						type="email"
						readOnly
						tabIndex={-1}
						className="bg-muted/40 cursor-not-allowed opacity-60 text-muted-foreground"
						{...formRegister("contactEmail")}
					/>
					{errors.contactEmail && (
						<p className="text-xs text-destructive">{t(errors.contactEmail.message ?? "")}</p>
					)}
				</div>
				<div className="space-y-1.5">
					<label htmlFor="contactPhone" className="text-sm font-medium">
						{t("register.contactPhone")}
					</label>
					<Input id="contactPhone" {...formRegister("contactPhone")} />
					{errors.contactPhone && (
						<p className="text-xs text-destructive">{t(errors.contactPhone.message ?? "")}</p>
					)}
				</div>
			</div>
		</>
	);
}

// ---------------------------------------------------------------------------
// Page background wrapper — factory hero image + vignette + scanlines
// ---------------------------------------------------------------------------

function PageBg({
	children,
	align = "center",
}: {
	readonly children: React.ReactNode;
	readonly align?: "center" | "form";
}) {
	return (
		<div
			className={cn(
				"relative flex min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-sky-50 dark:bg-[#041225]",
				align === "form"
					? "items-start justify-center px-3 py-6 sm:items-center sm:px-4 sm:py-8"
					: "items-center justify-center"
			)}
		>
			{/* Background image */}
			<div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
				<img
					src={HERO_IMG}
					alt=""
					className="h-full w-full object-cover opacity-25 dark:opacity-40"
				/>
				{/* Radial vignette — darker at edges, lighter at center for card readability */}
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_110%_at_50%_50%,rgba(248,250,252,0.2)_0%,rgba(240,249,255,0.92)_100%)] dark:bg-[radial-gradient(ellipse_120%_110%_at_50%_50%,rgba(4,18,37,0.15)_0%,rgba(4,18,37,0.88)_100%)]" />
				{/* Scanlines texture */}
				<div className="absolute inset-0 factory-scanlines opacity-15 dark:opacity-30" />
			</div>
			{children}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main island
// ---------------------------------------------------------------------------

function RegisterInner({ appUrl, apiBaseUrl, turnstileSiteKey }: RegisterContentProps) {
	const { t } = useLocale();
	// null = loading, false = unauthenticated, User = authenticated
	const [authUser, setAuthUser] = useState<User | null | false>(null);
	const [pageStep, setPageStep] = useState<PageStep>(1);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (mountedRef.current) {
				if (user) {
					setAuthUser(user);
					setPageStep((prev) => (prev === 1 ? 2 : prev));
				} else {
					setAuthUser(false);
					setPageStep(1);
				}
			}
		});
		return () => {
			mountedRef.current = false;
			unsubscribe();
		};
	}, []);

	const handleAuthenticated = useCallback((user: User) => {
		setAuthUser(user);
		setPageStep(2);
	}, []);

	const handleFormStepChange = useCallback((step: 2 | 3) => {
		setPageStep(step);
	}, []);

	const handleSuccess = useCallback(() => {
		setPageStep(4);
	}, []);

	// Loading spinner while Firebase resolves auth state
	if (authUser === null) {
		return (
			<PageBg>
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</PageBg>
		);
	}

	const isSuccess = pageStep === 4;

	return (
		<PageBg align="form">
			<div className="relative z-10 w-full max-w-lg" data-testid="registration-form">
				<Card className="overflow-hidden shadow-2xl dark:border-cyan-300/10 dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
					<CardContent className="p-0">
						<div className="p-5 sm:p-8 md:p-10">
							{/* Page header */}
							<div className="flex flex-col items-center text-center gap-2 mb-6">
								<div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
									<svg
										width="22"
										height="22"
										viewBox="0 0 24 24"
										fill="none"
										className="text-primary"
										aria-hidden="true"
									>
										<path
											d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-10h2m4 0h2m-8 4h2m4 0h2"
											stroke="currentColor"
											strokeWidth="1.5"
											strokeLinecap="round"
										/>
									</svg>
								</div>
								{!isSuccess && (
									<div>
										<h1 className="text-2xl font-bold">{t("register.title")}</h1>
										<p className="text-base text-muted-foreground mt-0.5">
											{t("register.subtitle")}
										</p>
									</div>
								)}
							</div>

							{/* Step indicator — visible for steps 1–3 */}
							{!isSuccess && <StepIndicator current={pageStep} />}

							{isSuccess && <SuccessCard appUrl={appUrl} t={t} />}

							{!isSuccess && authUser === false && (
								<AuthStep onAuthenticated={handleAuthenticated} />
							)}

							{!isSuccess && authUser !== false && (
								<RegistrationForm
									user={authUser}
									apiBaseUrl={apiBaseUrl}
									turnstileSiteKey={turnstileSiteKey}
									onSuccess={handleSuccess}
									onStepChange={handleFormStepChange}
								/>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</PageBg>
	);
}

export function RegisterContent(props: RegisterContentProps) {
	return (
		<LocaleProvider>
			<RegisterInner {...props} />
		</LocaleProvider>
	);
}
