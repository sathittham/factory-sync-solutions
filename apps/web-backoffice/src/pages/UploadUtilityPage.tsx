import { backofficeApi } from '@/api/backoffice';
import type { UploadedFile } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { Check, Copy, FileUp, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

const GENERAL_UPLOAD_MAX_BYTES = 50 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadedFileRowProps {
  readonly file: UploadedFile;
  readonly onCopy: (url: string) => void;
  readonly copied: boolean;
}

function UploadedFileRow({ file, onCopy, copied }: UploadedFileRowProps) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/30 p-3">
      <FileUp aria-hidden="true" className="size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.originalFilename}</p>
        <p className="truncate text-xs text-muted-foreground">
          {file.contentType} · {formatBytes(file.fileSizeBytes)}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => onCopy(file.fileURL)}
      >
        {copied ? (
          <>
            <Check className="size-3.5" />
            {t('uploadUtility.copied')}
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            {t('uploadUtility.copyUrl')}
          </>
        )}
      </Button>
    </div>
  );
}

export function UploadUtilityPage() {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [copiedURL, setCopiedURL] = useState<string | null>(null);

  const handleChooseFile = () => inputRef.current?.click();

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedURL(url);
      setTimeout(() => setCopiedURL((current) => (current === url ? null : current)), 2000);
    } catch {
      // Clipboard API unavailable — user can still select the link text manually.
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;

    setError(null);

    if (file.size > GENERAL_UPLOAD_MAX_BYTES) {
      setError(t('uploadUtility.errorGeneric'));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await backofficeApi.uploadFile(formData);
      setUploads((prev) => [uploaded, ...prev]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('uploadUtility.errorGeneric'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageLayout fluid>
      <PageHeader title={t('uploadUtility.title')} description={t('uploadUtility.subtitle')} />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload aria-hidden="true" className="size-4 text-primary" />
              {t('uploadUtility.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
              <Upload aria-hidden="true" className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">{t('uploadUtility.dropLabel')}</p>
              <p className="text-xs text-muted-foreground">{t('uploadUtility.constraints')}</p>
              <Button type="button" onClick={handleChooseFile} disabled={uploading}>
                {uploading ? t('uploadUtility.uploading') : t('uploadUtility.chooseFile')}
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {uploads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('uploadUtility.recentTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {uploads.map((file) => (
                <UploadedFileRow
                  key={file.fileURL}
                  file={file}
                  onCopy={handleCopy}
                  copied={copiedURL === file.fileURL}
                />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
