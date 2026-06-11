import { useEffect, useRef, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const themeIcons: Record<Theme, ReactNode> = {
  light: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  ),
  dark: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  ),
  system: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" strokeLinecap="round" />
    </svg>
  ),
};

const themeOrder: Theme[] = ['light', 'dark', 'system'];

interface ThemeSwitcherProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: (key: string) => string;
}

export function ThemeSwitcher({ theme, setTheme, t }: Readonly<ThemeSwitcherProps>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-8 flex items-center justify-center rounded-md border bg-background hover:bg-secondary transition-colors text-muted-foreground"
        aria-label={t('theme.label')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {themeIcons[theme]}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[140px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="p-1">
            {themeOrder.map((value) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => { setTheme(value); setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-default ${
                  theme === value ? 'font-medium text-primary' : ''
                }`}
              >
                <span className="shrink-0">{themeIcons[value]}</span>
                {t(`theme.${value}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
