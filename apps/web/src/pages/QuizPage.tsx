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
			<div className="min-h-[calc(100vh-10rem)] flex items-center justify-center p-4">
				<div className="w-full max-w-md bg-white rounded-2xl shadow-lg border p-8 text-center animate-fade-up">
					<div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
						<svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary">
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
				<Skeleton className="h-2 w-full rounded-full" />
				<div className="flex gap-2 mt-4">
					{Array.from({ length: 7 }).map((_, i) => (
						<Skeleton key={i} className="h-8 w-20 rounded-full" />
					))}
				</div>
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-28 w-full rounded-xl" />
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
		<div className="bg-dots min-h-[calc(100vh-4rem)]">
			<div className="container max-w-2xl py-8 sm:py-10" data-testid="quiz-stepper">
				<div className="mb-8">
					<h1 className="text-2xl sm:text-3xl font-extrabold mb-4">{t("quiz.title")}</h1>
					<div className="flex items-center gap-3 mb-1">
						<div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
							<div
								className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
								style={{ width: `${progressPct}%` }}
							/>
						</div>
						<span className="text-sm font-mono font-medium text-muted-foreground tabular-nums">
							{answeredCount}/{questions.length}
						</span>
					</div>
				</div>

				<div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 -mx-2 px-2">
					{dimensions.map((dim, i) => {
						const dimQuestions = questions.filter((q) => q.dimensionId === dim.id);
						const dimAnswered = dimQuestions.filter((q) => answers[q.id]).length;
						const isComplete = dimAnswered === dimQuestions.length;

						return (
							<button
								key={dim.id}
								type="button"
								onClick={() => dispatch(setCurrentStep(i))}
								className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
									i === currentStep
										? "bg-primary text-white shadow-sm shadow-primary/25"
										: isComplete
											? "bg-green-50 text-green-700 border border-green-200"
											: "bg-white text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground"
								}`}
							>
								{isComplete && i !== currentStep && (
									<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
										<path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
									</svg>
								)}
								{locale === "th" ? dim.nameTh : dim.nameEn}
							</button>
						);
					})}
				</div>

				{currentDimension && (
					<div className="flex items-center justify-between mb-5">
						<div>
							<h2 className="text-lg font-bold">
								{locale === "th" ? currentDimension.nameTh : currentDimension.nameEn}
							</h2>
							<p className="text-sm text-muted-foreground">
								{locale === "th" ? currentDimension.nameEn : currentDimension.nameTh}
							</p>
						</div>
						<span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
							{stepAnswered}/{stepQuestions.length}
						</span>
					</div>
				)}

				<div className="space-y-3">
					{stepQuestions.map((q, idx) => {
						const qNum = currentStep * QUESTIONS_PER_STEP + idx + 1;
						const isAnswered = !!answers[q.id];

						return (
							<div
								key={q.id}
								data-testid="quiz-question-card"
								className={`bg-white rounded-xl border p-5 transition-all duration-200 animate-fade-up ${
									isAnswered
										? "border-primary/20 shadow-sm"
										: "border-border hover:border-border/80"
								}`}
								style={{ animationDelay: `${idx * 0.05}s` }}
							>
								<div className="mb-4">
									<div className="flex items-start gap-3">
										<span className={`flex-shrink-0 h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center ${
											isAnswered
												? "bg-primary text-white"
												: "bg-muted text-muted-foreground"
										}`}>
											{qNum}
										</span>
										<div className="flex-1 min-w-0">
											<p className="font-medium text-foreground leading-snug">
												{getQuestionText(q)}
											</p>
											<p className="text-sm text-muted-foreground mt-0.5 leading-snug">
												{getSecondaryText(q)}
											</p>
										</div>
									</div>
								</div>

								<div className="flex items-center gap-1 sm:gap-2 ml-10">
									{[1, 2, 3, 4, 5].map((val) => (
										<button
											key={val}
											type="button"
											onClick={() => dispatch(setAnswer({ questionId: q.id, value: val }))}
											className={`flex-1 h-10 sm:h-11 rounded-lg text-sm font-semibold transition-all duration-150 ${
												answers[q.id] === val
													? "bg-primary text-white shadow-sm shadow-primary/25 scale-105"
													: "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border"
											}`}
										>
											{val}
										</button>
									))}
								</div>
								<div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 ml-10">
									<span>{t("quiz.stronglyDisagree")}</span>
									<span>{t("quiz.stronglyAgree")}</span>
								</div>
							</div>
						);
					})}
				</div>

				{error && (
					<div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
						{error}
					</div>
				)}

				<div className="flex items-center justify-between mt-8 pt-6 border-t">
					<Button
						variant="outline"
						onClick={handlePrev}
						disabled={currentStep === 0}
						data-testid="quiz-prev-btn"
						className="gap-1"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
						{t("quiz.previous")}
					</Button>

					{currentStep < totalSteps - 1 ? (
						<Button onClick={handleNext} data-testid="quiz-next-btn" className="gap-1">
							{t("quiz.next")}
							<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
								<path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						</Button>
					) : (
						<Button
							onClick={handleSubmit}
							disabled={!allAnswered || isSubmitting}
							data-testid="quiz-submit-btn"
							className="gap-2 shadow-md shadow-primary/20"
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
