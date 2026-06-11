import type { ReactNode } from 'react';

interface LoginPageLayoutProps {
  logo: string;
  appName: string;
  appHref: string;
  backgroundImage: string;
  imageClassName?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export function LoginPageLayout({
  logo,
  appName,
  appHref,
  backgroundImage,
  imageClassName = 'object-center',
  footer,
  children,
}: LoginPageLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center md:justify-start">
          <a href={appHref} target="_blank" rel="noreferrer" className="flex items-center gap-3">
            <img
              src={logo}
              alt=""
              aria-hidden="true"
              className="h-9 w-9 shrink-0 rounded-md object-cover"
            />
            <span className="text-sm font-semibold">{appName}</span>
          </a>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">{children}</div>
        </div>

        {footer && <p className="text-center text-xs text-muted-foreground">{footer}</p>}
      </div>

      <div className="relative hidden bg-muted lg:block">
        <img
          src={backgroundImage}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
        />
        <div className="absolute inset-0 dark:bg-gradient-to-br dark:from-background/60 dark:via-background/30 dark:to-transparent" />
      </div>
    </div>
  );
}
