import { AnimatePresence, motion } from '@/components/motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { trackEvent } from '@/lib/analytics';
import { api } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store';
import { setHasCompletedQuiz } from '@/store/authSlice';
import {
  resetQuiz,
  setAnswer,
  setCurrentStep,
  setQuestions,
  setSubmitting,
} from '@/store/quizSlice';
import { setAssessment } from '@/store/resultSlice';
import type { Assessment } from '@/store/resultSlice';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

const SKELETON_DIMS = Array.from({ length: 8 }, (_, i) => `dim-skel-${i}`);
const SKELETON_QUESTIONS = Array.from({ length: 6 }, (_, i) => `q-skel-${i}`);

const GRADE_LABELS: Record<number, string> = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'F' };

function getDimTabClass(isCurrent: boolean, isComplete: boolean): string {
  if (isCurrent) return 'bg-primary text-white';
  if (isComplete)
    return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
  return 'bg-card text-muted-foreground border hover:text-foreground';
}

function DimensionTabs({
  dimensions,
  questions,
  answers,
  currentStep,
  locale,
  onStepChange,
}: Readonly<{
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
                <path
                  d="M3 6l2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {locale === 'th' ? dim.nameTh : dim.nameEn}
          </button>
        );
      })}
    </div>
  );
}

function QuestionCard({
  q,
  qNum,
  isAnswered,
  selectedValue,
  locale,
  idx,
  useGradeLabels,
  onAnswer,
}: Readonly<{
  q: {
    id: string;
    textTh: string;
    textEn: string;
    descriptionTh?: string;
    descriptionEn?: string;
    rubric?: Record<string, { th: string; en: string }>;
  };
  qNum: number;
  isAnswered: boolean;
  selectedValue: number | undefined;
  locale: string;
  idx: number;
  useGradeLabels: boolean;
  onAnswer: (questionId: string, value: number) => void;
}>) {
  const questionText = locale === 'th' ? q.textTh : q.textEn;
  const secondaryText = locale === 'th' ? q.textEn : q.textTh;
  const descriptionText = locale === 'th' ? q.descriptionTh : q.descriptionEn;
  const hasRubric = q.rubric && Object.keys(q.rubric).length > 0;
  // For factory quiz: render from 5 (A) to 1 (F) — best to worst
  const rubricOrder = useGradeLabels ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];

  return (
    <motion.div
      key={q.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}
      data-testid="quiz-question-card"
      className={`bg-card rounded-lg border p-5 transition-colors ${isAnswered ? 'border-primary/20' : ''}`}
    >
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <span
            className={`shrink-0 h-7 w-7 rounded-md text-xs font-bold flex items-center justify-center transition-colors ${
              isAnswered ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
            }`}
          >
            {qNum}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground leading-snug text-[15px]">{questionText}</p>
            <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{secondaryText}</p>
            {descriptionText && (
              <p className="text-[13px] text-foreground/70 mt-2 leading-relaxed bg-muted/40 rounded-md px-3 py-2">
                {descriptionText}
              </p>
            )}
          </div>
        </div>
      </div>
      {hasRubric ? (
        <div className="space-y-1.5 ml-10">
          {rubricOrder.map((val) => {
            const isSelected = selectedValue === val;
            const rubricText = q.rubric?.[String(val)];
            const label = rubricText ? (locale === 'th' ? rubricText.th : rubricText.en) : '';
            const displayLabel = useGradeLabels ? GRADE_LABELS[val] : String(val);
            return (
              <button
                key={val}
                type="button"
                onClick={() => onAnswer(q.id, val)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-secondary/40 text-foreground hover:bg-secondary/70'
                }`}
              >
                <span
                  className={`shrink-0 h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-card text-muted-foreground border'
                  }`}
                >
                  {displayLabel}
                </span>
                <span
                  className={`text-[13px] sm:text-sm leading-snug ${
                    isSelected ? 'text-white/90' : 'text-foreground/80'
                  }`}
                >
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
                    ? 'bg-primary text-white'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground'
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

function DimensionHeader({
  dimension,
  stepAnswered,
  stepTotal,
  locale,
}: Readonly<{
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
              {locale === 'th' ? dimension.nameTh : dimension.nameEn}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === 'th' ? dimension.nameEn : dimension.nameTh}
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

function QuizNavigation({
  currentStep,
  totalSteps,
  allAnswered,
  isSubmitting,
  onPrev,
  onNext,
  onSubmit,
}: Readonly<{
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
          <path
            d="M10 4l-4 4 4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {t('quiz.previous')}
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
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {t('quiz.submitting')}
            </>
          ) : (
            t('quiz.submit')
          )}
        </Button>
      ) : (
        <Button onClick={onNext} data-testid="quiz-next-btn" className="gap-1.5">
          {t('quiz.next')}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      )}
    </div>
  );
}

export function QuizPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { quizId, questions, dimensions, answers, currentStep, isSubmitting, questionsLoaded } =
    useAppSelector((s) => s.quiz);
  const { locale, t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const useGradeLabels = quizId === 'factory';

  useEffect(() => {
    if (!questionsLoaded) {
      api
        .get<{
          questions: typeof questions;
          dimensions: typeof dimensions;
        }>(`/quiz/questions?quizId=${quizId}`)
        .then((data) => dispatch(setQuestions(data)))
        .catch(() => setError(t('quiz.loadError')));
    }
  }, [questionsLoaded, quizId, dispatch]);

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
  const stepStartIndex = dimensions
    .slice(0, currentStep)
    .reduce((acc, dim) => acc + questions.filter((q) => q.dimensionId === dim.id).length, 0);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      trackEvent('quiz_next_step', { step: currentStep + 1, dimension: currentDimension?.id });
      dispatch(setCurrentStep(currentStep + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      dispatch(setCurrentStep(currentStep - 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleExit = () => {
    dispatch(resetQuiz());
    navigate('/');
  };

  const handleSubmit = async () => {
    dispatch(setSubmitting(true));
    setError(null);
    trackEvent('quiz_submit', {
      quiz_id: quizId,
      total_questions: questions.length,
      answered: answeredCount,
    });
    try {
      const payload = Object.entries(answers).map(([questionId, value]) => ({
        questionId,
        value,
      }));
      const result = await api.post<Assessment>('/quiz/submit', {
        quizId,
        answers: payload,
      });
      dispatch(setAssessment(result));
      dispatch(setHasCompletedQuiz(true));
      dispatch(resetQuiz());
      trackEvent('quiz_complete', {
        quiz_id: quizId,
        overall_score: result.overallScore,
        diagnosis: result.diagnosis,
      });
      navigate('/results');
    } catch {
      trackEvent('quiz_submit_error');
      setError(t('quiz.submitError'));
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
            <h1 className="text-2xl font-bold">{t('quiz.title')}</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-primary tabular-nums">
                {answeredCount}
                <span className="text-muted-foreground">/{questions.length}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExitDialog(true)}
                className="text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                {t('quiz.exit')}
              </Button>
            </div>
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
                useGradeLabels={useGradeLabels}
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

      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('quiz.exitConfirm.title')}</DialogTitle>
            <DialogDescription>{t('quiz.exitConfirm.desc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              {t('quiz.exitConfirm.stay')}
            </Button>
            <Button variant="destructive" onClick={handleExit}>
              {t('quiz.exitConfirm.leave')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
