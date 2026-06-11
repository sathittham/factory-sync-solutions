import { useEffect, useRef, useState } from 'react';

export type Locale = 'th' | 'en';

interface LocaleSwitcherProps {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

export function LocaleSwitcher({ locale, setLocale, t }: Readonly<LocaleSwitcherProps>) {
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
        className="h-8 px-2.5 flex items-center gap-1.5 text-xs font-medium rounded-md border bg-background hover:bg-secondary transition-colors text-muted-foreground"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('locale.label')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        {locale.toUpperCase()}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 min-w-[140px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="p-1">
            {([
              { value: 'th' as const, label: `TH ${t('locale.th')}` },
              { value: 'en' as const, label: `EN ${t('locale.en')}` },
            ]).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="menuitem"
                onClick={() => { setLocale(value); setOpen(false); }}
                className={`flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground cursor-default ${
                  locale === value ? 'font-medium text-primary' : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
