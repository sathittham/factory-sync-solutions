import { backofficeApi } from '@/api/backoffice';
import type { AuditEvent } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { Activity, Clock, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AuditActivityDialogProps {
  readonly uid: string;
  readonly title: string;
  readonly description?: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function eventLabel(t: (key: string) => string, eventType: string) {
  const key = `audit.event.${eventType.split('.').join('_')}`;
  const label = t(key);
  return label === key ? eventType : label;
}

function metadataSummary(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) return '';
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
}

function EventRow({ event }: Readonly<{ event: AuditEvent }>) {
  const { t, locale } = useLocale();
  const summary = metadataSummary(event.metadata);
  const actor = event.actorEmail || event.actorName || event.actorUID || '—';
  const target = event.targetUID || event.resourceID || '—';

  return (
    <div className="flex gap-3 border-b px-1 py-3 last:border-0">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Activity aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{eventLabel(t, event.eventType)}</p>
          <Badge variant="secondary">{event.resourceType || 'event'}</Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            {t('audit.actor')}: {actor}
          </span>
          <span>
            {t('audit.target')}: {target}
          </span>
          {event.projectID && (
            <span>
              {t('audit.project')}: {event.projectID}
            </span>
          )}
        </div>
        {summary && <p className="mt-1 truncate text-sm text-muted-foreground">{summary}</p>}
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock aria-hidden="true" />
          {formatDateTime(event.createdAt, locale)}
        </p>
      </div>
    </div>
  );
}

export function AuditActivityDialog({
  uid,
  title,
  description,
  open,
  onOpenChange,
}: AuditActivityDialogProps) {
  const { t } = useLocale();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !uid) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    backofficeApi
      .getUserActivity(uid)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setError(t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, t, uid]);

  const content = (() => {
    if (loading) {
      return (
        <div className="flex flex-col gap-3">
          {['a1', 'a2', 'a3'].map((key) => (
            <div key={key} className="flex gap-3">
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (error) return <p className="text-sm text-destructive">{error}</p>;
    if (events.length === 0) {
      return <p className="py-8 text-center text-sm text-muted-foreground">{t('audit.empty')}</p>;
    }
    return events.map((event) => <EventRow key={event.id} event={event} />);
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEvents([]);
              setLoading(true);
              backofficeApi
                .getUserActivity(uid)
                .then(setEvents)
                .catch(() => setError(t('common.error')))
                .finally(() => setLoading(false));
            }}
            disabled={loading}
          >
            <RefreshCw data-icon="inline-start" />
            {t('audit.refresh')}
          </Button>
        </div>
        <div className="flex flex-col">{content}</div>
      </DialogContent>
    </Dialog>
  );
}
