import type { ReactNode } from 'react';

function cn(...inputs: Array<string | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function PageLayout({
  children,
  className,
  'data-testid': testId,
}: Readonly<PageLayoutProps>) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <div className={cn('container max-w-5xl py-6 sm:py-8', className)} data-testid={testId}>
        {children}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: Readonly<PageHeaderProps>) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3 animate-fade-up sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
