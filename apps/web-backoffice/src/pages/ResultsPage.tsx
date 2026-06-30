import { backofficeApi } from '@/api/backoffice';
import type { Assessment } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useEffect, useState } from 'react';

const DIAGNOSES = ['Beginning', 'Developing', 'Established', 'Advanced'] as const;

function diagnosisBadge(d: string) {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Beginning: 'destructive',
    Developing: 'secondary',
    Established: 'outline',
    Advanced: 'default',
  };
  return <Badge variant={map[d] ?? 'secondary'}>{d}</Badge>;
}

function scoreColor(score: number): string {
  if (score >= 4) return 'text-emerald-600 font-semibold';
  if (score >= 3) return 'text-blue-600 font-semibold';
  if (score >= 2) return 'text-amber-600 font-semibold';
  return 'text-red-600 font-semibold';
}

export function ResultsPage() {
  const { t, locale } = useLocale();

  const [results, setResults] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [diagnosisFilter, setDiagnosisFilter] = useState('all');
  const [expandedID, setExpandedID] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    backofficeApi
      .listResults()
      .then(setResults)
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  const filtered =
    diagnosisFilter === 'all' ? results : results.filter((r) => r.diagnosis === diagnosisFilter);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await backofficeApi.exportCSV();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backoffice-results-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(t('common.error'));
    } finally {
      setExporting(false);
    }
  }

  function renderBody() {
    if (loading) {
      return ['r1', 'r2', 'r3', 'r4', 'r5'].map((k) => (
        <tr key={k} className="border-b">
          {['w-32', 'w-24', 'w-16', 'w-24', 'w-24'].map((w) => (
            <td key={w} className="px-4 py-3">
              <Skeleton className={`h-4 ${w}`} />
            </td>
          ))}
          <td className="px-4 py-3" />
        </tr>
      ));
    }
    if (filtered.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
            {t('common.noData')}
          </td>
        </tr>
      );
    }
    return filtered.map((r) => {
      const expanded = expandedID === r.id;
      const toggleExpanded = () => setExpandedID(expanded ? null : r.id);
      return [
        <tr key={r.id} className="border-b hover:bg-muted/30">
          <td className="px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 justify-start px-2"
              onClick={toggleExpanded}
            >
              {expanded ? (
                <ChevronDown data-icon="inline-start" />
              ) : (
                <ChevronRight data-icon="inline-start" />
              )}
              {r.companyName || '—'}
            </Button>
          </td>
          <td className="hidden px-4 py-3 md:table-cell">{r.quizId}</td>
          <td className={`px-4 py-3 ${scoreColor(r.overallScore)}`}>{r.overallScore.toFixed(2)}</td>
          <td className="px-4 py-3">{diagnosisBadge(r.diagnosis)}</td>
          <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
            {formatDateTime(r.submittedAt, locale, false)}
          </td>
        </tr>,
        expanded && (
          <tr key={`${r.id}-detail`} className="bg-muted/20">
            <td colSpan={5} className="px-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {r.scores?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                      {t('results.dimensions')}
                    </p>
                    <div className="flex flex-col gap-1">
                      {r.scores.map((s) => (
                        <div key={s.dimensionID} className="flex justify-between text-sm">
                          <span>{s.dimensionName || s.dimensionID}</span>
                          <span className={scoreColor(s.score)}>{s.score.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {r.strengths?.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                        {t('results.strengths')}
                      </p>
                      <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm">
                        {r.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {r.weaknesses?.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                        {t('results.weaknesses')}
                      </p>
                      <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm">
                        {r.weaknesses.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </td>
          </tr>
        ),
      ];
    });
  }

  return (
    <PageLayout fluid>
      <PageHeader
        title={t('results.title')}
        description={t('results.subtitle')}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download data-icon="inline-start" />
            {t('common.export')}
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="flex gap-3">
          <Select value={diagnosisFilter} onValueChange={setDiagnosisFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('results.filterAll')}</SelectItem>
              {DIAGNOSES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium">{t('results.company')}</th>
                    <th className="hidden px-4 py-3 text-left font-medium md:table-cell">
                      {t('results.quizId')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium">{t('results.score')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('results.diagnosis')}</th>
                    <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">
                      {t('results.date')}
                    </th>
                  </tr>
                </thead>
                <tbody>{renderBody()}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
