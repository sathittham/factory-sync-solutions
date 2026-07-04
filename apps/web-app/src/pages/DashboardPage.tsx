import { FadeIn, ScaleIn, StaggerChildren, StaggerItem } from '@/components/motion';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { useAssessmentsQuery, useQuizzesQuery } from '@/lib/queries';
import type { Assessment, DimensionScore } from '@/lib/types';
import { useAppDispatch, useAppSelector } from '@/store';
import { resetQuiz, setQuizId } from '@/store/quizSlice';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

const diagnosisConfig: Record<
  string,
  { color: string; bg: string; border: string; scoreText: string }
> = {
  Beginning: {
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    scoreText: 'text-red-600 dark:text-red-400',
  },
  Developing: {
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    scoreText: 'text-amber-600 dark:text-amber-400',
  },
  Established: {
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    scoreText: 'text-blue-600 dark:text-blue-400',
  },
  Advanced: {
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    scoreText: 'text-emerald-600 dark:text-emerald-400',
  },
};

function getDimBarColor(score: number): string {
  if (score >= 4) return 'bg-emerald-500';
  if (score >= 3) return 'bg-blue-500';
  if (score >= 2) return 'bg-amber-500';
  return 'bg-red-500';
}

function getDimScoreText(score: number): string {
  if (score >= 4) return 'text-emerald-700 dark:text-emerald-400';
  if (score >= 3) return 'text-blue-700 dark:text-blue-400';
  if (score >= 2) return 'text-amber-700 dark:text-amber-400';
  return 'text-red-700 dark:text-red-400';
}

function StatCard({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="bg-card rounded-xl border p-4 sm:p-5">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
        {label}
      </p>
      {children}
    </div>
  );
}

function GhostStatCard({ label }: Readonly<{ label: string }>) {
  return (
    <div className="bg-card rounded-xl border border-dashed p-4 sm:p-5">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
        {label}
      </p>
      <div className="h-9 flex items-center">
        <span className="text-3xl font-bold text-muted-foreground/25 tabular-nums">--</span>
      </div>
    </div>
  );
}

function DimensionRow({ dim, locale }: Readonly<{ dim: DimensionScore; locale: string }>) {
  const pct = Math.min((dim.score / 5) * 100, 100);
  const name =
    locale === 'th'
      ? dim.dimensionNameTh || dim.dimensionName
      : dim.dimensionName || dim.dimensionNameTh;

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm text-foreground/80 w-32 sm:w-40 lg:w-48 shrink-0 truncate" title={name}>
        {name}
      </p>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getDimBarColor(dim.score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-sm font-mono font-semibold tabular-nums w-9 text-right shrink-0 ${getDimScoreText(dim.score)}`}
      >
        {dim.score.toFixed(1)}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((s) => s.auth);
  const { data: assessments = [], isPending: resultLoading } = useAssessmentsQuery();
  const { data: availableQuizzes = [], isPending: quizzesLoading } = useQuizzesQuery();
  const { locale, t } = useLocale();
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);

  const quizGroups = useMemo(() => {
    const groups: Record<string, Assessment[]> = {};
    for (const a of assessments) {
      const qid = a.quizId || 'shindan';
      if (!groups[qid]) groups[qid] = [];
      groups[qid].push(a);
    }
    return groups;
  }, [assessments]);

  const completedQuizIds = useMemo(() => Object.keys(quizGroups), [quizGroups]);

  useEffect(() => {
    if (!activeQuizId && completedQuizIds.length > 0) {
      setActiveQuizId(completedQuizIds[0]);
    }
  }, [activeQuizId, completedQuizIds]);

  const quizNameMap = useMemo(() => {
    const m: Record<string, { th: string; en: string }> = {};
    for (const q of availableQuizzes) {
      m[q.id] = { th: q.nameTh, en: q.nameEn };
    }
    return m;
  }, [availableQuizzes]);

  const getQuizName = (qid: string) => {
    const names = quizNameMap[qid];
    if (names) return locale === 'th' ? names.th : names.en;
    return qid;
  };

  const uncompletedQuizzes = useMemo(
    () => availableQuizzes.filter((q) => !completedQuizIds.includes(q.id)),
    [availableQuizzes, completedQuizIds],
  );

  const activeId = activeQuizId ?? completedQuizIds[0] ?? null;
  const activeAssessments = activeId ? (quizGroups[activeId] ?? []) : [];
  const latest = activeAssessments[0] ?? null;
  const diag = latest ? (diagnosisConfig[latest.diagnosis] ?? diagnosisConfig.Beginning) : null;
  const dimensionScores = latest?.scores ?? [];
  const totalAttempts = activeAssessments.length;

  const handleStartQuiz = (quizId: string) => {
    dispatch(resetQuiz());
    dispatch(setQuizId(quizId));
    navigate({ to: '/quiz' });
  };

  const isLoading = resultLoading && assessments.length === 0;
  const isEmpty = !resultLoading && assessments.length === 0;
  const hasDashboard = !resultLoading && latest !== null && diag !== null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Page header */}
      <div className="bg-linear-to-b from-primary/4 to-transparent border-b">
        <div className="w-full py-6 sm:py-8 px-4 sm:px-6">
          <FadeIn>
            <p className="text-sm text-muted-foreground mb-0.5">{t('quiz.welcomeBack')},</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {profile?.companyName ?? t('quiz.yourCompany')}
            </h1>
          </FadeIn>
        </div>
      </div>

      <div className="w-full py-6 sm:py-8 px-4 sm:px-6 space-y-6">
        {/* ─── LOADING ─── */}
        {isLoading && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        )}

        {/* ─── EMPTY STATE: show ghost dashboard + quiz grid ─── */}
        {isEmpty && (
          <ScaleIn>
            <div className="space-y-6">
              {/* Placeholder KPI row — shows what will appear after first quiz */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <GhostStatCard label={t('result.overallScore')} />
                <GhostStatCard label={t('dashboard.level')} />
                <GhostStatCard label={t('dashboard.assessmentCount')} />
                <GhostStatCard label={t('quiz.assessedOn')} />
              </div>

              {/* Onboarding call-to-action banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <svg
                    aria-hidden="true"
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
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {t('quiz.noResults.title')}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{t('quiz.noResults.desc')}</p>
                </div>
              </div>

              {/* Available quizzes — card grid */}
              {quizzesLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                  ))}
                </div>
              )}

              {!quizzesLoading && availableQuizzes.length > 0 && (
                <StaggerChildren
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  stagger={0.07}
                >
                  {availableQuizzes.map((q) => (
                    <StaggerItem key={q.id}>
                      <button
                        type="button"
                        onClick={() => handleStartQuiz(q.id)}
                        className="group w-full h-full bg-card rounded-xl border p-5 text-left hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all duration-200 flex flex-col"
                      >
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4 group-hover:bg-emerald-100/70 dark:group-hover:bg-emerald-900/30 transition-colors">
                          <svg
                            aria-hidden="true"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="text-emerald-600 dark:text-emerald-400"
                          >
                            <path
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-foreground mb-1">
                          {locale === 'th' ? q.nameTh : q.nameEn}
                        </h3>
                        <p className="text-sm text-muted-foreground flex-1">
                          {t('quiz.startNewAssessment')}
                        </p>
                        <div className="flex items-center gap-1 mt-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {t('quiz.start')}
                          <svg
                            aria-hidden="true"
                            width="14"
                            height="14"
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
                  ))}
                </StaggerChildren>
              )}
            </div>
          </ScaleIn>
        )}

        {/* ─── FILLED DASHBOARD (has completed assessments) ─── */}
        {hasDashboard && latest && diag && (
          <FadeIn>
            <div className="space-y-5">
              {/* Quiz selector tabs — only when multiple quizzes completed */}
              {completedQuizIds.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
                  {completedQuizIds.map((qid) => (
                    <button
                      key={qid}
                      type="button"
                      onClick={() => setActiveQuizId(qid)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        qid === activeId
                          ? 'bg-primary text-white'
                          : 'bg-card border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {getQuizName(qid)}
                    </button>
                  ))}
                </div>
              )}

              {/* KPI stat cards */}
              <StaggerChildren className="grid grid-cols-2 sm:grid-cols-4 gap-3" stagger={0.06}>
                <StaggerItem>
                  <StatCard label={t('result.overallScore')}>
                    <p
                      className={`text-3xl font-bold tabular-nums tracking-tight ${diag.scoreText}`}
                    >
                      {latest.overallScore.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">/ 5.00</p>
                  </StatCard>
                </StaggerItem>

                <StaggerItem>
                  <StatCard label={t('dashboard.level')}>
                    <Badge
                      className={`text-sm px-2.5 py-1 mt-1 ${diag.bg} ${diag.color} ${diag.border} border font-medium`}
                    >
                      {t(`diagnosis.${latest.diagnosis}`)}
                    </Badge>
                  </StatCard>
                </StaggerItem>

                <StaggerItem>
                  <StatCard label={t('dashboard.assessmentCount')}>
                    <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                      {totalAttempts}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.times')}</p>
                  </StatCard>
                </StaggerItem>

                <StaggerItem>
                  <StatCard label={t('quiz.assessedOn')}>
                    <p className="text-base font-semibold text-foreground mt-1 leading-snug">
                      {formatDateTime(latest.submittedAt, locale)}
                    </p>
                  </StatCard>
                </StaggerItem>
              </StaggerChildren>

              {/* Dimension breakdown + Quick actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Dimension scores panel */}
                <FadeIn delay={0.15} className="lg:col-span-2">
                  <div className="bg-card rounded-xl border p-5 h-full">
                    <h2 className="text-sm font-semibold text-foreground mb-4">
                      {t('result.dimensionScores')}
                    </h2>
                    {dimensionScores.length > 0 ? (
                      <div className="space-y-3">
                        {dimensionScores.map((dim) => (
                          <DimensionRow key={dim.dimensionId} dim={dim} locale={locale} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('quiz.noResults.desc')}</p>
                    )}
                  </div>
                </FadeIn>

                {/* Quick actions */}
                <FadeIn delay={0.2}>
                  <div className="flex flex-col gap-3 h-full">
                    <button
                      type="button"
                      onClick={() => navigate({ to: '/results' })}
                      className="group w-full bg-card rounded-xl border p-5 text-left hover:border-primary/40 hover:shadow-sm transition-all duration-200 flex-1"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                          <svg
                            aria-hidden="true"
                            width="18"
                            height="18"
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
                        <h3 className="text-base font-semibold text-foreground">
                          {t('quiz.viewResults')}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {t('quiz.viewResultsDesc')}
                      </p>
                      <div className="flex items-center gap-1 text-sm font-medium text-primary">
                        {t('quiz.viewResultsAction')}
                        <svg
                          aria-hidden="true"
                          width="14"
                          height="14"
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

                    <button
                      type="button"
                      onClick={() => handleStartQuiz(activeId ?? 'shindan')}
                      className="group w-full bg-card rounded-xl border p-5 text-left hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-sm transition-all duration-200 flex-1"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center group-hover:bg-amber-100/70 dark:group-hover:bg-amber-900/30 transition-colors">
                          <svg
                            aria-hidden="true"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="text-amber-600 dark:text-amber-400"
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
                        <h3 className="text-base font-semibold text-foreground">
                          {t('quiz.retake')}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                        {t('quiz.retakeDesc')}
                      </p>
                      <div className="flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                        {t('quiz.retakeAction')}
                        <svg
                          aria-hidden="true"
                          width="14"
                          height="14"
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
                  </div>
                </FadeIn>
              </div>

              {/* Other available (uncompleted) quizzes — compact list */}
              {uncompletedQuizzes.length > 0 && (
                <FadeIn delay={0.3}>
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground">
                      {t('quiz.otherAssessments')}
                    </h2>
                    {uncompletedQuizzes.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleStartQuiz(q.id)}
                        className="group w-full bg-card rounded-xl border p-5 text-left hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                            <svg
                              aria-hidden="true"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="text-emerald-600 dark:text-emerald-400"
                            >
                              <path
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-base font-semibold text-foreground">
                              {locale === 'th' ? q.nameTh : q.nameEn}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {t('quiz.startNewAssessment')}
                            </p>
                          </div>
                          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                            {t('quiz.start')}
                            <svg
                              aria-hidden="true"
                              width="14"
                              height="14"
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
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </FadeIn>
              )}
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
