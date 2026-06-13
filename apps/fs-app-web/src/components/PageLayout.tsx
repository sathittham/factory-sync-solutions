import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function PageLayout({ children, className, 'data-testid': testId }: PageLayoutProps) {
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

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-6 animate-fade-up', className)}>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
