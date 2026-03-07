import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { useAppDispatch, useAppSelector } from "@/store";
import {
	setQuestions,
	setAnswer,
	setCurrentStep,
	setSubmitting,
	resetQuiz,
} from "@/store/quizSlice";
import {
	setAssessment,
	setAssessments,
	setLoading as setResultLoading,
} from "@/store/resultSlice";
import { setHasCompletedQuiz } from "@/store/authSlice";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Assessment } from "@/store/resultSlice";
import { FadeIn, StaggerChildren, StaggerItem, ScaleIn, AnimatePresence, motion } from "@/components/motion";

const SKELETON_DIMS = Array.from({ length: 8 }, (_, i) => `dim-skel-${i}`);
const SKELETON_QUESTIONS = Array.from({ length: 6 }, (_, i) => `q-skel-${i}`);

const diagnosisConfig: Record<string, { color: string; bg: string; border: string; label: Record<string, string> }> = {
	Beginning: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", label: { th: "เริ่มต้น", en: "Beginning" } },
	Developing: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: { th: "กำลังพัฒนา", en: "Developing" } },
	Established: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", label: { th: "มั่นคง", en: "Established" } },
	Advanced: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: { th: "ก้าวหน้า", en: "Advanced" } },
};

function MiniScoreRing({ score, size = 80 }: Readonly<{ score: number; size?: number }>) {
	const pct = (score / 5) * 100;
	const strokeW = 7;
	const r = (size - strokeW) / 2;
	const circumference = 2 * Math.PI * r;
	const offset = circumference - (pct / 100) * circumference;

	return (
		<svg width={size} height={size} className="transform -rotate-90">
			<circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(220 14% 93%)" strokeWidth={strokeW} />
			<circle
				cx={size / 2} cy={size / 2} r={r} fill="none"
				stroke="hsl(220 65% 48%)" strokeWidth={strokeW} strokeLinecap="round"
				strokeDasharray={circumference} strokeDashoffset={offset}
				className="transition-all duration-1000 ease-out"
			/>
		</svg>
	);
}

function CompletedDashboard({ onRetake }: Readonly<{ onRetake: () => void }>) {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { profile } = useAppSelector((s) => s.auth);
	const { assessment, assessments, loading: resultLoading } = useAppSelector((s) => s.result);
	const { locale, t } = useLocale();

	useEffect(() => {
		if (!assessment && !resultLoading) {
			dispatch(setResultLoading(true));
			api
				.get<Assessment[]>("/results")
				.then((data) => {
					dispatch(setAssessments(data));
					if (data.length > 0) dispatch(setAssessment(data[0]));
				})
				.catch(() => {})
				.finally(() => dispatch(setResultLoading(false)));
		}
	}, [assessment, resultLoading, dispatch]);

	const diag = assessment ? (diagnosisConfig[assessment.diagnosis] || diagnosisConfig.Beginning) : null;
	const topScores = assessment?.scores
		?.slice()
		.sort((a, b) => b.score - a.score)
		.slice(0, 3) ?? [];

	return (
		<div className="min-h-[calc(100vh-7rem)]">
			<div className="bg-gradient-to-b from-primary/[0.04] to-transparent border-b">
				<div className="container max-w-4xl py-8 sm:py-10 px-4 sm:px-6">
					<FadeIn>
						<p className="text-base text-muted-foreground mb-1">
							{locale === "th" ? "ยินดีต้อนรับกลับ" : "Welcome back"},
						</p>
						<h1 className="text-2xl sm:text-3xl font-bold text-foreground">
							{profile?.companyName ?? (locale === "th" ? "บริษัทของคุณ" : "Your Company")}
						</h1>
					</FadeIn>
				</div>
			</div>

			<div className="container max-w-4xl py-6 sm:py-8 px-4 sm:px-6 space-y-5">
				{assessment && (
					<ScoreCard assessment={assessment} diag={diag} topScores={topScores} locale={locale} />
				)}
				{!assessment && resultLoading && <ScoreCardSkeleton />}

				<StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 gap-4" stagger={0.1}>
					<StaggerItem>
						<button
							type="button"
							onClick={() => navigate("/results")}
							className="w-full group bg-white rounded-xl border p-6 text-left hover:border-primary/30 hover:shadow-md transition-all duration-200"
						>
							<div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
								<svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-primary">
									<path d="M16 8v8M12 11v5M8 14v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
									<rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.8" />
								</svg>
							</div>
							<h3 className="text-lg font-bold text-foreground mb-1">{t("quiz.viewResults")}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{locale === "th"
									? "ดูผลวิเคราะห์เชิงลึก กราฟเรดาร์ จุดแข็ง และข้อเสนอแนะ"
									: "View detailed analysis, radar chart, strengths & recommendations"}
							</p>
							<div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary">
								{locale === "th" ? "ดูผลลัพธ์" : "View results"}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-0.5 transition-transform">
									<path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
						</button>
					</StaggerItem>

					<StaggerItem>
						<button
							type="button"
							onClick={onRetake}
							className="w-full group bg-white rounded-xl border p-6 text-left hover:border-primary/30 hover:shadow-md transition-all duration-200"
						>
							<div className="h-11 w-11 rounded-lg bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-100/70 transition-colors">
								<svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-amber-600">
									<path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
									<path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
							<h3 className="text-lg font-bold text-foreground mb-1">{t("quiz.retake")}</h3>
							<p className="text-sm text-muted-foreground leading-relaxed">
								{locale === "th"
									? "ทำแบบประเมินใหม่อีกครั้งเพื่อเปรียบเทียบกับผลลัพธ์ก่อนหน้า"
									: "Take the assessment again and compare with your previous results"}
							</p>
							<div className="flex items-center gap-1 mt-3 text-sm font-medium text-amber-600">
								{locale === "th" ? "เริ่มทำใหม่" : "Start over"}
								<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-0.5 transition-transform">
									<path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
						</button>
					</StaggerItem>
				</StaggerChildren>

				{assessments.length > 1 && (
					<FadeIn delay={0.3}>
						<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
								<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
								<path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
							</svg>
							{locale === "th"
								? `คุณมีผลประเมินทั้งหมด ${assessments.length} ครั้ง`
								: `You have ${assessments.length} assessments total`}
						</div>
					</FadeIn>
				)}
			</div>
		</div>
	);
}

function ScoreCard({ assessment, diag, topScores, locale }: Readonly<{
	assessment: Assessment;
	diag: (typeof diagnosisConfig)[string] | null;
	topScores: Assessment["scores"];
	locale: string;
}>) {
	return (
		<ScaleIn delay={0.1}>
			<div className="bg-white rounded-xl border p-6 sm:p-8">
				<div className="flex flex-col sm:flex-row items-center gap-6">
					<div className="relative flex-shrink-0">
						<MiniScoreRing score={assessment.overallScore} size={120} />
						<div className="absolute inset-0 flex flex-col items-center justify-center">
							<span className="text-2xl font-bold tabular-nums tracking-tight">
								{assessment.overallScore.toFixed(2)}
							</span>
							<span className="text-xs text-muted-foreground font-mono">/5.00</span>
						</div>
					</div>
					<div className="flex-1 text-center sm:text-left">
						<div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
							<h2 className="text-lg font-bold">
								{locale === "th" ? "คะแนนล่าสุด" : "Latest Score"}
							</h2>
							{diag && (
								<Badge className={`text-sm px-2.5 py-0.5 ${diag.bg} ${diag.color} ${diag.border} border font-medium`}>
									{diag.label[locale]}
								</Badge>
							)}
						</div>
						{topScores.length > 0 && (
							<div className="space-y-2 mt-3">
								{topScores.map((s) => (
									<div key={s.dimensionId} className="flex items-center gap-3">
										<span className="text-sm text-muted-foreground w-32 sm:w-40 truncate text-left">
											{s.dimensionName}
										</span>
										<div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
											<div
												className="h-full rounded-full bg-primary/70 animate-score-fill"
												style={{ width: `${(s.score / 5) * 100}%` }}
											/>
										</div>
										<span className="text-sm font-mono font-semibold tabular-nums w-10 text-right">
											{s.score.toFixed(1)}
										</span>
									</div>
								))}
							</div>
						)}
						{assessment.submittedAt && (
							<p className="text-sm text-muted-foreground mt-3">
								{locale === "th" ? "ประเมินเมื่อ " : "Assessed on "}
								<span className="font-mono">
									{new Date(assessment.submittedAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
										year: "numeric", month: "short", day: "numeric",
									})}
								</span>
							</p>
						)}
					</div>
				</div>
			</div>
		</ScaleIn>
	);
}

function ScoreCardSkeleton() {
	return (
		<div className="bg-white rounded-xl border p-8">
			<div className="flex items-center gap-6">
				<Skeleton className="h-[120px] w-[120px] rounded-full flex-shrink-0" />
				<div className="flex-1 space-y-3">
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-2 w-full" />
					<Skeleton className="h-2 w-3/4" />
					<Skeleton className="h-2 w-1/2" />
				</div>
			</div>
		</div>
	);
}

function getDimTabClass(isCurrent: boolean, isComplete: boolean): string {
	if (isCurrent) return "bg-primary text-white";
	if (isComplete) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
	return "bg-white text-muted-foreground border hover:text-foreground";
}

function DimensionTabs({ dimensions, questions, answers, currentStep, locale, onStepChange }: Readonly<{
	dimensions: { id: string; nameTh: string; nameEn: string }[];
	questions: { id: string; dimensionId: string }[];
	answers: Record<string, number>;
	currentStep: number;
	locale: string;
	onStepChange: (step: number) => void;
}>) {
	return (
		<div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none">
			{dimensions.map((dim, i) => {
				const dimQuestions = questions.filter((q) => q.dimensionId === dim.id);
				const dimAnswered = dimQuestions.filter((q) => answers[q.id]).length;
				const isComplete = dimAnswered === dimQuestions.length;

				return (
					<button
						key={dim.id}
						type="button"
						onClick={() => onStepChange(i)}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${getDimTabClass(i === currentStep, isComplete)}`}
					>
						{isComplete && i !== currentStep && (
							<svg width="11" height="11" viewBox="0 0 12 12" fill="none">
								<path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						)}
						{locale === "th" ? dim.nameTh : dim.nameEn}
					</button>
				);
			})}
		</div>
	);
}

function QuestionCard({ q, qNum, isAnswered, selectedValue, locale, idx, onAnswer }: Readonly<{
	q: { id: string; textTh: string; textEn: string; rubric?: Record<string, { th: string; en: string }> };
	qNum: number;
	isAnswered: boolean;
	selectedValue: number | undefined;
	locale: string;
	idx: number;
	onAnswer: (questionId: string, value: number) => void;
}>) {
	const questionText = locale === "th" ? q.textTh : q.textEn;
	const secondaryText = locale === "th" ? q.textEn : q.textTh;
	const hasRubric = q.rubric && Object.keys(q.rubric).length > 0;

	return (
		<motion.div
			key={q.id}
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
			data-testid="quiz-question-card"
			className={`bg-white rounded-lg border p-5 transition-colors ${isAnswered ? "border-primary/20" : ""}`}
		>
			<div className="mb-4">
				<div className="flex items-start gap-3">
					<span className={`flex-shrink-0 h-7 w-7 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${
						isAnswered ? "bg-primary text-white" : "bg-muted text-muted-foreground"
					}`}>
						{qNum}
					</span>
					<div className="flex-1 min-w-0">
						<p className="font-medium text-foreground leading-snug text-[15px]">{questionText}</p>
						<p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{secondaryText}</p>
					</div>
				</div>
			</div>
			{hasRubric ? (
				<div className="space-y-1.5 ml-10">
					{[1, 2, 3, 4, 5].map((val) => {
						const isSelected = selectedValue === val;
						const rubricText = q.rubric?.[String(val)];
						const label = rubricText ? (locale === "th" ? rubricText.th : rubricText.en) : "";
						return (
							<button
								key={val}
								type="button"
								onClick={() => onAnswer(q.id, val)}
								className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
									isSelected
										? "bg-primary text-white"
										: "bg-secondary/40 text-foreground hover:bg-secondary/70"
								}`}
							>
								<span className={`flex-shrink-0 h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
									isSelected ? "bg-white/20 text-white" : "bg-white text-muted-foreground border"
								}`}>
									{val}
								</span>
								<span className={`text-[13px] sm:text-sm leading-snug ${
									isSelected ? "text-white/90" : "text-foreground/80"
								}`}>
									{label}
								</span>
							</button>
						);
					})}
				</div>
			) : (
				<div className="flex items-stretch gap-1.5 sm:gap-2 ml-10">
					{[1, 2, 3, 4, 5].map((val) => {
						const isSelected = selectedValue === val;
						return (
							<button
								key={val}
								type="button"
								onClick={() => onAnswer(q.id, val)}
								className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 sm:py-2.5 rounded-md text-sm font-semibold transition-colors ${
									isSelected
										? "bg-primary text-white"
										: "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
								}`}
							>
								<span className="text-sm sm:text-base">{val}</span>
							</button>
						);
					})}
				</div>
			)}
		</motion.div>
	);
}

function DimensionHeader({ dimension, stepAnswered, stepTotal, locale }: Readonly<{
	dimension: { id: string; nameTh: string; nameEn: string } | undefined;
	stepAnswered: number;
	stepTotal: number;
	locale: string;
}>) {
	return (
		<AnimatePresence mode="wait">
			{dimension && (
				<motion.div
					key={dimension.id}
					initial={{ opacity: 0, y: -8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 8 }}
					transition={{ duration: 0.25 }}
					className="flex items-center justify-between mb-4"
				>
					<div>
						<h2 className="text-lg font-bold leading-tight">
							{locale === "th" ? dimension.nameTh : dimension.nameEn}
						</h2>
						<p className="text-xs text-muted-foreground mt-0.5">
							{locale === "th" ? dimension.nameEn : dimension.nameTh}
						</p>
					</div>
					<span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">
						{stepAnswered}/{stepTotal}
					</span>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

function QuizNavigation({ currentStep, totalSteps, allAnswered, isSubmitting, onPrev, onNext, onSubmit }: Readonly<{
	currentStep: number;
	totalSteps: number;
	allAnswered: boolean;
	isSubmitting: boolean;
	onPrev: () => void;
	onNext: () => void;
	onSubmit: () => void;
}>) {
	const { t } = useLocale();
	const isLastStep = currentStep >= totalSteps - 1;

	return (
		<div className="flex items-center justify-between mt-6 pt-5 border-t">
			<Button
				variant="outline"
				onClick={onPrev}
				disabled={currentStep === 0}
				data-testid="quiz-prev-btn"
				className="gap-1.5"
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
					<path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
				{t("quiz.previous")}
			</Button>

			{isLastStep ? (
				<Button
					onClick={onSubmit}
					disabled={!allAnswered || isSubmitting}
					data-testid="quiz-submit-btn"
					className="gap-2"
				>
					{isSubmitting ? (
						<>
							<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
							</svg>
							{t("quiz.submitting")}
						</>
					) : (
						t("quiz.submit")
					)}
				</Button>
			) : (
				<Button onClick={onNext} data-testid="quiz-next-btn" className="gap-1.5">
					{t("quiz.next")}
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
						<path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
					</svg>
				</Button>
			)}
		</div>
	);
}

export function QuizPage() {
	const dispatch = useAppDispatch();
	const navigate = useNavigate();
	const { questions, dimensions, answers, currentStep, isSubmitting, questionsLoaded } =
		useAppSelector((s) => s.quiz);
	const { hasCompletedQuiz } = useAppSelector((s) => s.auth);
	const { locale, t } = useLocale();
	const [error, setError] = useState<string | null>(null);
	const [startRetake, setStartRetake] = useState(false);

	const shouldLoadQuestions = !hasCompletedQuiz || startRetake;

	useEffect(() => {
		if (shouldLoadQuestions && !questionsLoaded) {
			api
				.get<{
					questions: typeof questions;
					dimensions: typeof dimensions;
				}>("/quiz/questions")
				.then((data) => dispatch(setQuestions(data)))
				.catch(() => setError(t("quiz.loadError")));
		}
	}, [shouldLoadQuestions, questionsLoaded, dispatch]);

	if (hasCompletedQuiz && !startRetake) {
		return <CompletedDashboard onRetake={() => setStartRetake(true)} />;
	}

	if (!questionsLoaded) {
		return (
			<div className="container max-w-2xl py-10 space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-2.5 w-full rounded-full" />
				<div className="flex gap-2 mt-4">
					{SKELETON_DIMS.map((id) => (
						<Skeleton key={id} className="h-8 w-20 rounded-full" />
					))}
				</div>
				{SKELETON_QUESTIONS.map((id) => (
					<Skeleton key={id} className="h-32 w-full rounded-lg" />
				))}
			</div>
		);
	}

	const totalSteps = dimensions.length;
	const currentDimension = dimensions[currentStep];
	const stepQuestions = currentDimension
		? questions.filter((q) => q.dimensionId === currentDimension.id)
		: [];
	const answeredCount = Object.keys(answers).length;
	const progressPct = (answeredCount / questions.length) * 100;
	const allAnswered = answeredCount === questions.length;
	const stepAnswered = stepQuestions.filter((q) => answers[q.id]).length;

	// Calculate the global question number offset for current step
	const stepStartIndex = dimensions.slice(0, currentStep).reduce(
		(acc, dim) => acc + questions.filter((q) => q.dimensionId === dim.id).length,
		0,
	);

	const handleNext = () => {
		if (currentStep < totalSteps - 1) {
			trackEvent("quiz_next_step", { step: currentStep + 1, dimension: currentDimension?.id });
			dispatch(setCurrentStep(currentStep + 1));
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	const handlePrev = () => {
		if (currentStep > 0) {
			dispatch(setCurrentStep(currentStep - 1));
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	};

	const handleSubmit = async () => {
		dispatch(setSubmitting(true));
		setError(null);
		trackEvent("quiz_submit", { total_questions: questions.length, answered: answeredCount });
		try {
			const payload = Object.entries(answers).map(([questionId, value]) => ({
				questionId,
				value,
			}));
			const result = await api.post<Assessment>("/quiz/submit", {
				answers: payload,
			});
			dispatch(setAssessment(result));
			dispatch(setHasCompletedQuiz(true));
			dispatch(resetQuiz());
			trackEvent("quiz_complete", { overall_score: result.overallScore, diagnosis: result.diagnosis });
			navigate("/results");
		} catch {
			trackEvent("quiz_submit_error");
			setError(t("quiz.submitError"));
		} finally {
			dispatch(setSubmitting(false));
		}
	};

	return (
		<div className="min-h-[calc(100vh-3.5rem)]">
			<div className="container max-w-2xl py-6 sm:py-8" data-testid="quiz-stepper">
				{/* Header + Progress */}
				<div className="mb-6">
					<div className="flex items-end justify-between mb-3">
						<h1 className="text-2xl font-bold">{t("quiz.title")}</h1>
						<span className="text-sm font-mono text-primary tabular-nums">
							{answeredCount}<span className="text-muted-foreground">/{questions.length}</span>
						</span>
					</div>
					<div className="relative h-2 bg-secondary rounded-full overflow-hidden">
						<div
							className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-700 ease-out"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
				</div>

				<DimensionTabs
					dimensions={dimensions}
					questions={questions}
					answers={answers}
					currentStep={currentStep}
					locale={locale}
					onStepChange={(i) => dispatch(setCurrentStep(i))}
				/>

				<DimensionHeader
					dimension={currentDimension}
					stepAnswered={stepAnswered}
					stepTotal={stepQuestions.length}
					locale={locale}
				/>

				{/* Question cards */}
				<AnimatePresence mode="wait">
				<motion.div
					key={currentStep}
					initial={{ opacity: 0, x: 40 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -40 }}
					transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
					className="space-y-3"
				>
					{stepQuestions.map((q, idx) => (
						<QuestionCard
							key={q.id}
							q={q}
							qNum={stepStartIndex + idx + 1}
							isAnswered={!!answers[q.id]}
							selectedValue={answers[q.id]}
							locale={locale}
							idx={idx}
							onAnswer={(questionId, value) => dispatch(setAnswer({ questionId, value }))}
						/>
					))}
				</motion.div>
				</AnimatePresence>

				{/* Error */}
				{error && (
					<div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center animate-scale-in">
						{error}
					</div>
				)}

				<QuizNavigation
					currentStep={currentStep}
					totalSteps={totalSteps}
					allAnswered={allAnswered}
					isSubmitting={isSubmitting}
					onPrev={handlePrev}
					onNext={handleNext}
					onSubmit={handleSubmit}
				/>
			</div>
		</div>
	);
}
