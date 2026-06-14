import { backofficeApi } from '@/api/backoffice';
import type { ApiDocsMetadata, ApiDocsVersion, OpenApiSpec } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { Download, FileJson, RefreshCw } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = lazy(() => import('swagger-ui-react'));

function downloadText(filename: string, text: string, contentType: string) {
  const blob = new Blob([text], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ApiDocsPage() {
  const { locale, t } = useLocale();

  const [versions, setVersions] = useState<ApiDocsVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [metadata, setMetadata] = useState<ApiDocsMetadata | null>(null);
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [yaml, setYaml] = useState('');
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    backofficeApi
      .listApiDocVersions()
      .then((data) => {
        if (cancelled) return;
        setVersions(data.versions);
        const current = data.versions.find((version) => version.isCurrent);
        const fallback = data.versions[0];
        setSelectedVersion(current?.apiVersion || fallback?.apiVersion || '');
      })
      .catch((err) => {
        if (!cancelled) setError(getApiDocsErrorMessage(err, t));
      })
      .finally(() => {
        if (!cancelled) setLoadingVersions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const loadDocs = useCallback(
    async (apiVersion: string) => {
      if (!apiVersion) return;
      setLoadingDocs(true);
      setError('');
      try {
        const [nextMetadata, jsonResult, yamlResult] = await Promise.all([
          backofficeApi.getApiDocsMetadata(apiVersion),
          backofficeApi.getApiDocsJson(apiVersion),
          backofficeApi.getApiDocsYaml(apiVersion),
        ]);
        setMetadata(nextMetadata);
        setSpec(jsonResult.spec);
        setYaml(yamlResult.yaml);
      } catch (err) {
        setMetadata(null);
        setSpec(null);
        setYaml('');
        setError(getApiDocsErrorMessage(err, t));
      } finally {
        setLoadingDocs(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadDocs(selectedVersion);
  }, [loadDocs, selectedVersion]);

  const formattedJson = useMemo(() => {
    if (!spec) return '';
    return JSON.stringify(spec, null, 2);
  }, [spec]);

  function handleDownloadJSON() {
    if (!formattedJson || !selectedVersion) return;
    downloadText(`factorysync-openapi-${selectedVersion}.json`, formattedJson, 'application/json');
  }

  function handleDownloadYAML() {
    if (!yaml || !selectedVersion) return;
    downloadText(`factorysync-openapi-${selectedVersion}.yaml`, yaml, 'application/yaml');
  }

  function renderMetadata() {
    if (loadingDocs || loadingVersions) {
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['environment', 'api-version', 'generated-at', 'git-sha'].map((item) => (
            <Skeleton key={item} className="h-16" />
          ))}
        </div>
      );
    }

    if (!metadata) {
      return <p className="text-sm text-muted-foreground">{t('apiDocs.noMetadata')}</p>;
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">{t('apiDocs.environment')}</p>
          <p className="font-medium">{metadata.environment}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">{t('apiDocs.apiVersion')}</p>
          <p className="font-medium">{metadata.apiVersion}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">{t('apiDocs.generatedAt')}</p>
          <p className="font-medium">{formatDateTime(metadata.generatedAt, locale)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-sm text-muted-foreground">{t('apiDocs.gitSha')}</p>
          <p className="truncate font-mono text-sm">{metadata.gitSHA.slice(0, 12)}</p>
        </div>
      </div>
    );
  }

  function renderSwaggerViewer() {
    if (loadingDocs || loadingVersions) {
      return (
        <div className="space-y-3 p-4">
          {['viewer-row-1', 'viewer-row-2', 'viewer-row-3', 'viewer-row-4'].map((item) => (
            <Skeleton key={item} className="h-12" />
          ))}
        </div>
      );
    }

    if (!spec) {
      return (
        <div className="p-6 text-center text-sm text-muted-foreground">{t('common.noData')}</div>
      );
    }

    return (
      <div className="api-docs-swagger min-w-[48rem] bg-background">
        <Suspense fallback={<SwaggerSkeleton />}>
          <SwaggerUI
            spec={spec}
            deepLinking
            docExpansion="list"
            defaultModelsExpandDepth={1}
            persistAuthorization={false}
          />
        </Suspense>
      </div>
    );
  }

  const title = spec?.info?.title || t('apiDocs.title');
  const versionText = spec?.info?.version || selectedVersion;
  const canDownload = Boolean(spec && yaml);

  return (
    <PageLayout fluid>
      <PageHeader
        title={t('apiDocs.title')}
        description={t('apiDocs.description')}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void loadDocs(selectedVersion)}
              disabled={loadingDocs || !selectedVersion}
            >
              <RefreshCw data-icon="inline-start" />
              {t('apiDocs.refresh')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadJSON}
              disabled={!canDownload}
            >
              <FileJson data-icon="inline-start" />
              {t('apiDocs.downloadJson')}
            </Button>
            <Button size="sm" onClick={handleDownloadYAML} disabled={!canDownload}>
              <Download data-icon="inline-start" />
              {t('apiDocs.downloadYaml')}
            </Button>
          </div>
        }
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('apiDocs.versionSelector')}</CardTitle>
            <CardDescription>{t('apiDocs.versionSelectorDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full md:max-w-xs">
              <Select
                value={selectedVersion}
                onValueChange={setSelectedVersion}
                disabled={loadingVersions || versions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('apiDocs.selectVersion')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {versions.map((version) => (
                      <SelectItem key={version.apiVersion} value={version.apiVersion}>
                        {version.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 text-sm text-muted-foreground">
              <p className="truncate">
                {title} {versionText ? `(${versionText})` : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('apiDocs.metadata')}</CardTitle>
          </CardHeader>
          <CardContent>{renderMetadata()}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('apiDocs.viewer')}</CardTitle>
            <CardDescription>{t('apiDocs.viewerDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">{renderSwaggerViewer()}</div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

function SwaggerSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {['swagger-ui-load-1', 'swagger-ui-load-2', 'swagger-ui-load-3'].map((item) => (
        <Skeleton key={item} className="h-12" />
      ))}
    </div>
  );
}

function getApiDocsErrorMessage(err: unknown, t: (key: string) => string) {
  if (err instanceof Error && err.message.toLowerCase().includes('api docs not found')) {
    return t('apiDocs.missingDocs');
  }
  return t('common.error');
}
