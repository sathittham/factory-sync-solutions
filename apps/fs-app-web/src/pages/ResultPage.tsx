import { FadeIn, ScaleIn, StaggerChildren, StaggerItem } from '@/components/motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trackEvent } from '@/lib/analytics';
import { api } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useAppDispatch, useAppSelector } from '@/store';
import { resetQuiz, setAvailableQuizzes, setQuizId } from '@/store/quizSlice';
import type { QuizDimension, QuizListItem } from '@/store/quizSlice';
import {
  type Assessment,
  type DimensionScore,
  setAssessment,
  setAssessments,
  setLoading,
} from '@/store/resultSlice';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';

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

function getScoreColor(score: number): string {
  if (score >= 4) return 'hsl(152 60% 38%)';
  if (score >= 3) return 'hsl(220 65% 48%)';
  if (score >= 2) return 'hsl(38 92% 50%)';
  return 'hsl(0 72% 51%)';
}

function ScoreRing({ score, size = 140 }: Readonly<{ score: number; size?: number }>) {
  const pct = (score / 5) * 100;
  const strokeW = 10;
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

function DimensionDetail({
  dim,
  isOpen,
  onToggle,
  locale,
  t,
}: Readonly<{
  dim: DimensionScore;
  isOpen: boolean;
  onToggle: () => void;
  locale: string;
  t: (key: string) => string;
}>) {
  const pct = (dim.score / 5) * 100;
  const scoreColor = getScoreColor(dim.score);
  const dimName =
    locale === 'th'
      ? dim.dimensionNameTh || dim.dimensionName
      : dim.dimensionName || dim.dimensionNameTh;

  return (
    <div className="border rounded-lg overflow-hidden transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium truncate mr-2">{dimName}</span>
            <span
              className="text-sm font-mono font-semibold tabular-nums"
              style={{ color: scoreColor }}
            >
              {dim.score.toFixed(2)}
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full animate-score-fill"
              style={{ width: `${pct}%`, background: scoreColor }}
            />
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          className="px-4 pb-4 border-t bg-muted/10 animate-fade-up"
          style={{ animationDelay: '0s' }}
        >
          <div className="pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>{t('result.scoreBreakdown')}</span>
              <span className="font-mono">
                {dim.score.toFixed(2)} / {dim.maxScore.toFixed(2)}
              </span>
            </div>
            {/* Visual score indicator */}
            <div className="grid grid-cols-5 gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div key={level} className="text-center">
                  <div
                    className={`h-8 rounded-md flex items-center justify-center text-xs font-medium transition-colors ${
                      dim.score >= level
                        ? 'bg-primary/15 text-primary'
                        : 'bg-muted/50 text-muted-foreground/40'
                    }`}
                  >
                    {level}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{t('result.levelBeginning')}</span>
              <span>{t('result.levelAdvanced')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Quiz result detail view ---

function QuizResultDetail({
  assessment,
  dimLookup,
  locale,
  t,
  isDark,
}: Readonly<{
  assessment: Assessment;
  dimLookup: Record<string, { th: string; en: string }>;
  locale: string;
  t: (key: string) => string;
  isDark: boolean;
}>) {
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const scores = assessment.scores ?? [];
  const diag = diagnosisConfig[assessment.diagnosis] || diagnosisConfig.Beginning;

  const dimName = useCallback(
    (s: DimensionScore) => {
      const fromConfig = dimLookup[s.dimensionId];
      if (fromConfig) return locale === 'th' ? fromConfig.th : fromConfig.en;
      return locale === 'th'
        ? s.dimensionNameTh || s.dimensionName
        : s.dimensionName || s.dimensionNameTh;
    },
    [dimLookup, locale],
  );

  const radarData = scores.map((s) => ({
    dimension: dimName(s),
    score: s.score,
    fullMark: 5,
  }));

  const nameMap = Object.fromEntries(scores.map((s) => [s.dimensionName, dimName(s)]));

  return (
    <div className="space-y-5">
      {/* Hero score section */}
      <ScaleIn>
        <div className="bg-card rounded-lg border p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <ScoreRing score={assessment.overallScore} size={148} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">
                  {assessment.overallScore.toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground font-mono">/5.00</span>
              </div>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('result.overallScore')}</h1>
              <Badge
                className={`text-sm px-3 py-1 ${diag.bg} ${diag.color} ${diag.border} border font-medium`}
              >
                {t(`diagnosis.${assessment.diagnosis}`)}
              </Badge>
              {assessment.submittedAt && (
                <p className="text-xs text-muted-foreground font-mono mt-3">
                  {new Date(assessment.submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </ScaleIn>

      {/* Radar chart */}
      <FadeIn delay={0.1}>
        <div className="bg-card rounded-lg border p-6" data-testid="result-spider-chart">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            {t('result.dimensionScores')}
          </h2>
          <ResponsiveContainer width="100%" height={280} className="sm:[&]:h-[320px]!">
            <RadarChart data={radarData}>
              <PolarGrid
                stroke={isDark ? 'hsl(220 13% 20%)' : 'hsl(220 13% 91%)'}
                strokeDasharray="3 3"
              />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fontSize: 10, fill: isDark ? 'hsl(220 8% 55%)' : 'hsl(220 8% 46%)' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tick={{ fontSize: 9, fill: isDark ? 'hsl(220 8% 50%)' : 'hsl(220 8% 60%)' }}
              />
              <Radar
                dataKey="score"
                stroke={isDark ? 'hsl(217 65% 55%)' : 'hsl(220 65% 48%)'}
                fill={isDark ? 'hsl(217 65% 55%)' : 'hsl(220 65% 48%)'}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="sr-only">
            {scores.map((s) => (
              <p key={s.dimensionId}>
                {dimName(s)}: {s.score.toFixed(2)} / 5
              </p>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Dimension details — 2 columns */}
      <FadeIn delay={0.15}>
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            {t('result.dimensionDetail')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {scores.map((s) => (
              <DimensionDetail
                key={s.dimensionId}
                dim={s}
                isOpen={expandedDim === s.dimensionId}
                onToggle={() =>
                  setExpandedDim(expandedDim === s.dimensionId ? null : s.dimensionId)
                }
                locale={locale}
                t={t}
              />
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Strengths & Weaknesses */}
      <StaggerChildren stagger={0.1} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {assessment.strengths?.length > 0 && (
          <StaggerItem>
            <div
              className="bg-card rounded-lg border border-emerald-200 dark:border-emerald-800 p-6"
              data-testid="result-strengths-panel"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-md bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-emerald-600 dark:text-emerald-400"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  {t('result.strengths')}
                </h3>
              </div>
              <ul className="space-y-2">
                {assessment.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[13px] leading-relaxed">
                    <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                    <span className="text-foreground/80">{nameMap[s] ?? s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </StaggerItem>
        )}

        {assessment.weaknesses?.length > 0 && (
          <StaggerItem>
            <div
              className="bg-card rounded-lg border border-red-200 dark:border-red-800 p-6"
              data-testid="result-weaknesses-panel"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="h-7 w-7 rounded-md bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-red-500 dark:text-red-400"
                  >
                    <path
                      d="M12 9v2m0 4h.01M5.07 19h13.86c1.1 0 1.8-1.17 1.26-2.12l-6.93-12c-.54-.94-1.9-.94-2.44 0l-6.93 12C4.35 17.83 5.05 19 6.15 19z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                  {t('result.weaknesses')}
                </h3>
              </div>
              <ul className="space-y-2">
                {assessment.weaknesses.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-[13px] leading-relaxed">
                    <span className="text-red-400 mt-0.5 shrink-0">!</span>
                    <span className="text-foreground/80">{nameMap[w] ?? w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </StaggerItem>
        )}
      </StaggerChildren>
    </div>
  );
}

// --- Main ResultPage ---

export function ResultPage() {
  const dispatch = useAppDispatch();
  const { assessment, assessments, loading } = useAppSelector((s) => s.result);
  const { availableQuizzes } = useAppSelector((s) => s.quiz);
  const { t, locale } = useLocale();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const navigate = useNavigate();
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [dimCache, setDimCache] = useState<Record<string, QuizDimension[]>>({});

  // Fetch all assessments
  useEffect(() => {
    if (!assessment && !loading) {
      dispatch(setLoading(true));
      api
        .get<Assessment[]>('/results')
        .then((data) => {
          dispatch(setAssessments(data));
          if (data.length > 0) {
            dispatch(setAssessment(data[0]));
            trackEvent('result_view', {
              overall_score: data[0].overallScore,
              diagnosis: data[0].diagnosis,
            });
          }
        })
        .catch(() => {})
        .finally(() => dispatch(setLoading(false)));
    }
  }, [assessment, loading, dispatch]);

  // Fetch available quizzes for tab names
  useEffect(() => {
    if (availableQuizzes.length === 0) {
      api
        .get<QuizListItem[]>('/quiz/quizzes')
        .then((data) => dispatch(setAvailableQuizzes(data)))
        .catch(() => {});
    }
  }, [availableQuizzes.length, dispatch]);

  // Group assessments by quizId
  const groupedAssessments = useMemo(() => {
    const groups: Record<string, Assessment[]> = {};
    for (const a of assessments) {
      const qid = a.quizId || 'shindan';
      if (!groups[qid]) groups[qid] = [];
      groups[qid].push(a);
    }
    return groups;
  }, [assessments]);

  // All quiz IDs to show as tabs: available quizzes (in order), plus any completed ones not in the list
  const allQuizIds = useMemo(() => {
    const ids = availableQuizzes.map((q) => q.id);
    const idSet = new Set(ids);
    // Add any completed quizzes that aren't in the available list (shouldn't happen, but safety)
    for (const a of assessments) {
      const qid = a.quizId || 'shindan';
      if (!idSet.has(qid)) {
        idSet.add(qid);
        ids.push(qid);
      }
    }
    return ids;
  }, [availableQuizzes, assessments]);

  // Set of quiz IDs that have at least one result
  const completedQuizIdSet = useMemo(() => {
    return new Set(assessments.map((a) => a.quizId || 'shindan'));
  }, [assessments]);

  // Set initial active tab
  useEffect(() => {
    if (!activeQuizId && allQuizIds.length > 0) {
      // Prefer first quiz with results, otherwise first available
      const firstWithResult = allQuizIds.find((qid) => completedQuizIdSet.has(qid));
      setActiveQuizId(firstWithResult ?? allQuizIds[0]);
    }
  }, [activeQuizId, allQuizIds, completedQuizIdSet]);

  // Fetch dimensions for the active quiz
  useEffect(() => {
    if (activeQuizId && !dimCache[activeQuizId]) {
      api
        .get<{ dimensions: QuizDimension[]; questions: unknown[] }>(
          `/quiz/questions?quizId=${activeQuizId}`,
        )
        .then((data) => {
          setDimCache((prev) => ({ ...prev, [activeQuizId]: data.dimensions }));
        })
        .catch(() => {});
    }
  }, [activeQuizId, dimCache]);

  // Quiz name lookup
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

  const handleTabChange = (quizId: string) => {
    setActiveQuizId(quizId);
    const quizAssessments = groupedAssessments[quizId];
    if (quizAssessments?.[0]) {
      dispatch(setAssessment(quizAssessments[0]));
    }
  };

  const handleStartQuiz = (quizId: string) => {
    dispatch(resetQuiz());
    dispatch(setQuizId(quizId));
    navigate('/quiz');
  };

  if (loading) {
    return (
      <div className="container max-w-5xl py-10 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-44 rounded-lg" />
          <Skeleton className="h-44 rounded-lg col-span-2" />
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className="container max-w-5xl py-6 sm:py-8 space-y-5" data-testid="result-summary">
        {allQuizIds.length > 0 && (
          <Tabs value={activeQuizId ?? allQuizIds[0]} onValueChange={handleTabChange}>
            <TabsList className="h-auto w-full justify-start overflow-x-auto scrollbar-none">
              {allQuizIds.map((qid) => {
                const hasResult = completedQuizIdSet.has(qid);
                return (
                  <TabsTrigger key={qid} value={qid} className={hasResult ? '' : 'opacity-50'}>
                    {getQuizName(qid)}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {allQuizIds.map((qid) => {
              const hasResult = completedQuizIdSet.has(qid);
              const quizAssessments = groupedAssessments[qid] ?? [];
              const selectedAssessment =
                assessment && (assessment.quizId || 'shindan') === qid
                  ? assessment
                  : (quizAssessments[0] ?? null);
              const dims = dimCache[qid] ?? [];
              const lookup = Object.fromEntries(
                dims.map((d) => [d.id, { th: d.nameTh, en: d.nameEn }]),
              );

              return (
                <TabsContent key={qid} value={qid} className="mt-5 space-y-5">
                  {hasResult && selectedAssessment ? (
                    <>
                      <QuizResultDetail
                        assessment={selectedAssessment}
                        dimLookup={lookup}
                        locale={locale}
                        t={t}
                        isDark={isDark}
                      />

                      {quizAssessments.length > 1 && (
                        <FadeIn delay={0.3}>
                          <div className="bg-card rounded-lg border p-6">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                              {t('result.previousAssessments')}
                            </h2>
                            <div className="space-y-1">
                              {quizAssessments.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => dispatch(setAssessment(a))}
                                  className={`w-full flex justify-between items-center p-3 rounded-md text-sm transition-colors ${
                                    a.id === selectedAssessment?.id
                                      ? 'bg-primary/5 border border-primary/15'
                                      : 'hover:bg-muted/50 border border-transparent'
                                  }`}
                                >
                                  <span className="text-muted-foreground font-mono text-xs">
                                    {new Date(a.submittedAt).toLocaleDateString()}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold tabular-nums">
                                      {a.overallScore.toFixed(2)}
                                    </span>
                                    <Badge
                                      className={`text-[10px] px-2 py-0.5 border ${(diagnosisConfig[a.diagnosis] || diagnosisConfig.Beginning).bg} ${(diagnosisConfig[a.diagnosis] || diagnosisConfig.Beginning).color} ${(diagnosisConfig[a.diagnosis] || diagnosisConfig.Beginning).border}`}
                                    >
                                      {t(`diagnosis.${a.diagnosis}`)}
                                    </Badge>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </FadeIn>
                      )}
                    </>
                  ) : (
                    <FadeIn>
                      <div className="bg-card rounded-lg border p-10 text-center">
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
                        <h2 className="text-lg font-bold mb-1">{t('result.noResults.title')}</h2>
                        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                          {t('result.noResults.desc')}
                        </p>
                        <Button onClick={() => handleStartQuiz(qid)}>
                          {t('quiz.start')} {getQuizName(qid)}
                        </Button>
                      </div>
                    </FadeIn>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
    </div>
  );
}
