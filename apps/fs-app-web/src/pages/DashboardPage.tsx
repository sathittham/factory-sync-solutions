import { FadeIn, ScaleIn, StaggerChildren, StaggerItem } from '@/components/motion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store';
import { resetQuiz, setAvailableQuizzes, setQuizId } from '@/store/quizSlice';
import type { QuizListItem } from '@/store/quizSlice';
import {
  type Assessment,
  setAssessment,
  setAssessments,
  setLoading as setResultLoading,
} from '@/store/resultSlice';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

const diagnosisConfig: Record<string, { color: string; bg: string; border: string }> = {
  Beginning: {
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
  },
  Developing: {
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
  },
  Established: {
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
  },
  Advanced: {
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
};

function MiniScoreRing({ score, size = 64 }: Readonly<{ score: number; size?: number }>) {
  const pct = (score / 5) * 100;
  const strokeW = 5;
  const r = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={strokeW}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((s) => s.auth);
  const { assessments, loading: resultLoading } = useAppSelector((s) => s.result);
  const { availableQuizzes } = useAppSelector((s) => s.quiz);
  const { locale, t } = useLocale();
  const [quizzesLoading, setQuizzesLoading] = useState(false);

  useEffect(() => {
    if (assessments.length === 0 && !resultLoading) {
      dispatch(setResultLoading(true));
      api
        .get<Assessment[]>('/results')
        .then((data) => {
          dispatch(setAssessments(data));
          if (data.length > 0) dispatch(setAssessment(data[0]));
        })
        .catch(() => {})
        .finally(() => dispatch(setResultLoading(false)));
    }
  }, [assessments.length, dispatch]);

  useEffect(() => {
    if (availableQuizzes.length === 0) {
      setQuizzesLoading(true);
      api
        .get<QuizListItem[]>('/quiz/quizzes')
        .then((data) => dispatch(setAvailableQuizzes(data)))
        .catch(() => {})
        .finally(() => setQuizzesLoading(false));
    }
  }, [availableQuizzes.length, dispatch]);

  // Group assessments by quizId — latest first
  const quizGroups: Record<string, Assessment[]> = {};
  for (const a of assessments) {
    const qid = a.quizId || 'shindan';
    if (!quizGroups[qid]) quizGroups[qid] = [];
    quizGroups[qid].push(a);
  }

  // Build quiz name map
  const quizNameMap: Record<string, { th: string; en: string }> = {};
  for (const q of availableQuizzes) {
    quizNameMap[q.id] = { th: q.nameTh, en: q.nameEn };
  }
  const getQuizName = (qid: string) => {
    const names = quizNameMap[qid];
    if (names) return locale === 'th' ? names.th : names.en;
    return qid;
  };

  const completedQuizIds = new Set(assessments.map((a) => a.quizId || 'shindan'));
  const uncompletedQuizzes = availableQuizzes.filter((q) => !completedQuizIds.has(q.id));

  // Most recent assessment's quizId, falling back to 'shindan'
  const lastQuizId = assessments.length > 0 ? assessments[0].quizId || 'shindan' : 'shindan';

  const handleStartQuiz = (quizId: string) => {
    dispatch(resetQuiz());
    dispatch(setQuizId(quizId));
    navigate('/quiz');
  };

  const uncompletedSection = (() => {
    if (quizzesLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      );
    }
    if (uncompletedQuizzes.length > 0) {
      return (
        <FadeIn delay={0.25}>
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('quiz.otherAssessments')}
            </h2>
            {uncompletedQuizzes.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => handleStartQuiz(q.id)}
                className="w-full group bg-card rounded-xl border p-6 text-left hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0 group-hover:bg-emerald-100/70 dark:group-hover:bg-emerald-900/30 transition-colors">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-emerald-600 dark:text-emerald-400"
                    >
                      <path
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M9 14l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-foreground mb-0.5">
                      {locale === 'th' ? q.nameTh : q.nameEn}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('quiz.startNewAssessment')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {t('quiz.start')}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="group-hover:translate-x-0.5 transition-transform"
                    >
                      <path
                        d="M6 4l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </FadeIn>
      );
    }
    return null;
  })();

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="bg-linear-to-b from-primary/4 to-transparent border-b">
        <div className="container max-w-5xl py-8 sm:py-10 px-4 sm:px-6">
          <FadeIn>
            <p className="text-base text-muted-foreground mb-1">{t('quiz.welcomeBack')},</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {profile?.companyName ?? t('quiz.yourCompany')}
            </h1>
          </FadeIn>
        </div>
      </div>

      <div className="container max-w-5xl py-6 sm:py-8 px-4 sm:px-6 space-y-6">
        {/* Loading state */}
        {resultLoading && assessments.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-xl" />
            ))}
          </div>
        )}

        {/* Completed quiz cards */}
        {Object.keys(quizGroups).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('quiz.latestScore')}
            </h2>
            <StaggerChildren
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              stagger={0.08}
            >
              {Object.entries(quizGroups).map(([qid, quizAssessments]) => {
                const latest = quizAssessments[0];
                const diag = diagnosisConfig[latest.diagnosis] || diagnosisConfig.Beginning;
                return (
                  <StaggerItem key={qid}>
                    <button
                      type="button"
                      onClick={() => navigate('/results')}
                      className="w-full bg-card rounded-xl border p-5 text-left hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <MiniScoreRing score={latest.overallScore} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold tabular-nums">
                              {latest.overallScore.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground truncate mb-1">
                            {getQuizName(qid)}
                          </h3>
                          <Badge
                            className={`text-[10px] px-2 py-0.5 ${diag.bg} ${diag.color} ${diag.border} border font-medium`}
                          >
                            {t(`diagnosis.${latest.diagnosis}`)}
                          </Badge>
                          <p className="text-[11px] text-muted-foreground font-mono mt-2">
                            {formatDateTime(latest.submittedAt, locale)}
                          </p>
                          {quizAssessments.length > 1 && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {t('quiz.totalAssessments').replace(
                                '{count}',
                                String(quizAssessments.length),
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </StaggerItem>
                );
              })}
            </StaggerChildren>
          </div>
        )}

        {/* Action cards */}
        <StaggerChildren className="grid grid-cols-1 sm:grid-cols-2 gap-4" stagger={0.1}>
          <StaggerItem>
            <button
              type="button"
              onClick={() => navigate('/results')}
              className="w-full group bg-card rounded-xl border p-6 text-left hover:border-primary/30 hover:shadow-md transition-all duration-200"
            >
              <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-primary"
                >
                  <path
                    d="M16 8v8M12 11v5M8 14v2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{t('quiz.viewResults')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('quiz.viewResultsDesc')}
              </p>
              <div className="flex items-center gap-1 mt-3 text-sm font-medium text-primary">
                {t('quiz.viewResultsAction')}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="group-hover:translate-x-0.5 transition-transform"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          </StaggerItem>

          <StaggerItem>
            <button
              type="button"
              onClick={() => handleStartQuiz(lastQuizId)}
              className="w-full group bg-card rounded-xl border p-6 text-left hover:border-primary/30 hover:shadow-md transition-all duration-200"
            >
              <div className="h-11 w-11 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-4 group-hover:bg-amber-100/70 dark:group-hover:bg-amber-900/30 transition-colors">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-amber-600"
                >
                  <path
                    d="M1 4v6h6M23 20v-6h-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">{t('quiz.retake')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('quiz.retakeDesc')}
              </p>
              <div className="flex items-center gap-1 mt-3 text-sm font-medium text-amber-600">
                {t('quiz.retakeAction')}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="group-hover:translate-x-0.5 transition-transform"
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          </StaggerItem>
        </StaggerChildren>

        {/* Uncompleted quizzes / loading skeleton */}
        {uncompletedSection}

        {/* No quizzes completed yet */}
        {!resultLoading && assessments.length === 0 && (
          <ScaleIn>
            <div className="text-center py-12">
              <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-muted-foreground"
                >
                  <path
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-lg font-bold mb-1">{t('quiz.noResults.title')}</p>
              <p className="text-sm text-muted-foreground mb-6">{t('quiz.noResults.desc')}</p>
            </div>
          </ScaleIn>
        )}
      </div>
    </div>
  );
}
