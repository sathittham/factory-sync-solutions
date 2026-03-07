import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store";
import {
	setQuestions,
	setAnswer,
	setCurrentStep,
	setSubmitting,
	resetQuiz,
} from "@/store/quizSlice";
import { setAssessment } from "@/store/resultSlice";
import { setHasCompletedQuiz } from "@/store/authSlice";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Assessment } from "@/store/resultSlice";

const QUESTIONS_PER_STEP = 5;

const likertLabels = {
	th: ["", "ไม่เห็นด้วย\nอย่างยิ่ง", "ไม่เห็นด้วย", "เฉยๆ", "เห็นด้วย", "เห็นด้วย\nอย่างยิ่ง"],
	en: ["", "Strongly\nDisagree", "Disagree", "Neutral", "Agree", "Strongly\nAgree"],
};

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
		return (
			<div className="min-h-[calc(100vh-7rem)] flex items-center justify-center p-4">
				<div className="w-full max-w-md bg-white rounded-lg border p-8 text-center animate-fade-up">
					<div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary">
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
					</div>
					<h2 className="text-xl font-bold mb-2">{t("quiz.completed.title")}</h2>
					<p className="text-muted-foreground text-sm mb-6">{t("quiz.completed.desc")}</p>
					<div className="flex gap-3">
						<Button className="flex-1" onClick={() => navigate("/results")}>
							{t("quiz.viewResults")}
						</Button>
						<Button variant="outline" className="flex-1" onClick={() => setStartRetake(true)}>
							{t("quiz.retake")}
						</Button>
					</div>
				</div>
			</div>
		);
	}

	if (!questionsLoaded) {
		return (
			<div className="container max-w-2xl py-10 space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-2.5 w-full rounded-full" />
				<div className="flex gap-2 mt-4">
					{Array.from({ length: 7 }).map((_, i) => (
						<Skeleton key={`dim-${i}`} className="h-8 w-20 rounded-full" />
					))}
				</div>
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={`q-${i}`} className="h-32 w-full rounded-lg" />
				))}
			</div>
		);
	}

	const totalSteps = Math.ceil(questions.length / QUESTIONS_PER_STEP);
	const stepQuestions = questions.slice(
		currentStep * QUESTIONS_PER_STEP,
		(currentStep + 1) * QUESTIONS_PER_STEP,
	);
	const currentDimension = dimensions.find(
		(d) => d.id === stepQuestions[0]?.dimensionId,
	);
	const answeredCount = Object.keys(answers).length;
	const progressPct = (answeredCount / questions.length) * 100;
	const allAnswered = answeredCount === questions.length;
	const stepAnswered = stepQuestions.filter((q) => answers[q.id]).length;

	const handleNext = () => {
		if (currentStep < totalSteps - 1) {
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
			navigate("/results");
		} catch {
			setError(t("quiz.submitError"));
		} finally {
			dispatch(setSubmitting(false));
		}
	};

	const getQuestionText = (q: (typeof questions)[number]) =>
		locale === "th" ? q.textTh : q.textEn;

	const getSecondaryText = (q: (typeof questions)[number]) =>
		locale === "th" ? q.textEn : q.textTh;

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

				{/* Dimension tabs */}
				<div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none">
					{dimensions.map((dim, i) => {
						const dimQuestions = questions.filter((q) => q.dimensionId === dim.id);
						const dimAnswered = dimQuestions.filter((q) => answers[q.id]).length;
						const isComplete = dimAnswered === dimQuestions.length;

						return (
							<button
								key={dim.id}
								type="button"
								onClick={() => dispatch(setCurrentStep(i))}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
									i === currentStep
										? "bg-primary text-white"
										: isComplete
											? "bg-emerald-50 text-emerald-700 border border-emerald-200"
											: "bg-white text-muted-foreground border hover:text-foreground"
								}`}
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

				{/* Current dimension header */}
				{currentDimension && (
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-lg font-bold leading-tight">
								{locale === "th" ? currentDimension.nameTh : currentDimension.nameEn}
							</h2>
							<p className="text-xs text-muted-foreground mt-0.5">
								{locale === "th" ? currentDimension.nameEn : currentDimension.nameTh}
							</p>
						</div>
						<span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md">
							{stepAnswered}/{stepQuestions.length}
						</span>
					</div>
				)}

				{/* Question cards */}
				<div className="space-y-3">
					{stepQuestions.map((q, idx) => {
						const qNum = currentStep * QUESTIONS_PER_STEP + idx + 1;
						const isAnswered = !!answers[q.id];

						return (
							<div
								key={q.id}
								data-testid="quiz-question-card"
								className={`bg-white rounded-lg border p-5 transition-colors animate-fade-up ${
									isAnswered ? "border-primary/20" : ""
								}`}
								style={{ animationDelay: `${idx * 0.05}s` }}
							>
								<div className="mb-4">
									<div className="flex items-start gap-3">
										<span className={`flex-shrink-0 h-7 w-7 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${
											isAnswered
												? "bg-primary text-white"
												: "bg-muted text-muted-foreground"
										}`}>
											{qNum}
										</span>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-foreground leading-snug text-[15px]">
												{getQuestionText(q)}
											</p>
											<p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
												{getSecondaryText(q)}
											</p>
										</div>
									</div>
								</div>

								{/* Likert scale */}
								<div className="flex items-stretch gap-1.5 sm:gap-2 ml-10">
									{[1, 2, 3, 4, 5].map((val) => {
										const isSelected = answers[q.id] === val;
										return (
											<button
												key={val}
												type="button"
												onClick={() => dispatch(setAnswer({ questionId: q.id, value: val }))}
												className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 sm:py-2.5 rounded-md text-sm font-semibold transition-colors ${
													isSelected
														? "bg-primary text-white"
														: "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
												}`}
											>
												<span className="text-sm sm:text-base">{val}</span>
												<span className={`text-[8px] sm:text-[9px] leading-tight text-center whitespace-pre-line font-normal hidden sm:block ${
													isSelected ? "text-white/70" : "text-muted-foreground/60"
												}`}>
													{likertLabels[locale][val]}
												</span>
											</button>
										);
									})}
								</div>
								{/* Mobile-only labels */}
								<div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 ml-10 sm:hidden">
									<span>{t("quiz.stronglyDisagree")}</span>
									<span>{t("quiz.stronglyAgree")}</span>
								</div>
							</div>
						);
					})}
				</div>

				{/* Error */}
				{error && (
					<div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center animate-scale-in">
						{error}
					</div>
				)}

				{/* Navigation */}
				<div className="flex items-center justify-between mt-6 pt-5 border-t">
					<Button
						variant="outline"
						onClick={handlePrev}
						disabled={currentStep === 0}
						data-testid="quiz-prev-btn"
						className="gap-1.5"
					>
						<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
							<path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
						{t("quiz.previous")}
					</Button>

					{currentStep < totalSteps - 1 ? (
						<Button onClick={handleNext} data-testid="quiz-next-btn" className="gap-1.5">
							{t("quiz.next")}
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
								<path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						</Button>
					) : (
						<Button
							onClick={handleSubmit}
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
					)}
				</div>
			</div>
		</div>
	);
}
