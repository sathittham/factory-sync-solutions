import { useEffect, useState, type ReactNode } from 'react';

/**
 * Shared dev-only debug overlay.
 *
 * A floating, collapsible panel that surfaces runtime diagnostics — env/build
 * info, auth/session state, a Redux/store snapshot, and any app-specific data.
 * Drop it once near the app root; it renders nothing in production.
 *
 * Consumed by the React apps via `@shared/ui/DebugPanel` (web-cms is
 * server-rendered, so it is out of scope here).
 *
 *   <DebugPanel
 *     title="web-backoffice"
 *     env={{ mode: import.meta.env.MODE, api: import.meta.env.VITE_API_URL }}
 *     auth={{ uid: user?.uid, email: user?.email, role }}
 *     store={reduxState}
 *     data={{ route: location.pathname }}
 *   />
 *
 * Visibility defaults to the consuming app's dev build (`import.meta.env.DEV`).
 * Override with the `enabled` prop, or force-on in any environment by adding
 * `?debug` to the URL. Toggle open/closed with Ctrl/Cmd+Shift+D.
 */

export interface DebugSection {
  label: string;
  value: unknown;
}

export interface DebugPanelProps {
  /** Panel header label — usually the app name. */
  title?: string;
  /** App / env / build info. Rendered as its own section when non-empty. */
  env?: Record<string, unknown>;
  /** Auth / session state (user, role, token expiry, …). */
  auth?: Record<string, unknown>;
  /** Redux / store snapshot (any serialisable value). */
  store?: unknown;
  /** Arbitrary app-specific key/values. */
  data?: Record<string, unknown>;
  /** Extra named sections beyond the convenience props above. */
  sections?: DebugSection[];
  /** Force visibility. Defaults to `import.meta.env.DEV` or a `?debug` URL flag. */
  enabled?: boolean;
  /** Screen corner. Defaults to `bottom-right`. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Start expanded. Defaults to false (collapsed to a small launcher). */
  defaultOpen?: boolean;
  /** Rendered at the bottom of the panel when expanded. */
  children?: ReactNode;
}

const positionClass: Record<NonNullable<DebugPanelProps['position']>, string> = {
  'bottom-right': 'bottom-3 right-3 items-end',
  'bottom-left': 'bottom-3 left-3 items-start',
  'top-right': 'top-3 right-3 items-end',
  'top-left': 'top-3 left-3 items-start',
};

/** Vite/Astro define `import.meta.env`; guard so non-bundler contexts don't throw. */
function viteEnv(): { DEV?: boolean; MODE?: string } | undefined {
  try {
    return (import.meta as unknown as { env?: { DEV?: boolean; MODE?: string } }).env;
  } catch {
    return undefined;
  }
}

function isDevBuild(): boolean {
  const env = viteEnv();
  if (env?.DEV !== undefined) return env.DEV;
  return env?.MODE === 'development';
}

function hasDebugFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('debug');
}

/** JSON.stringify that tolerates circular refs, bigints, and functions. */
function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const out = JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === 'bigint') return `${val}n`;
      if (typeof val === 'function') return `[Function ${val.name || 'anonymous'}]`;
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '[Circular]';
        seen.add(val);
      }
      return val;
    },
    2,
  );
  return out ?? String(value);
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

function CopyButton({ text }: Readonly<{ text: string }>) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      aria-label="Copy section JSON"
    >
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

function Section({ label, value }: Readonly<DebugSection>) {
  const [open, setOpen] = useState(true);
  const json = safeStringify(value);
  return (
    <div className="border-t border-border/60 first:border-t-0">
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-foreground"
          aria-expanded={open}
        >
          <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
          {label}
        </button>
        <CopyButton text={json} />
      </div>
      {open && (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words px-2 pb-2 text-[11px] leading-snug text-muted-foreground">
          {json}
        </pre>
      )}
    </div>
  );
}

export function DebugPanel({
  title = 'Debug',
  env,
  auth,
  store,
  data,
  sections,
  enabled,
  position = 'bottom-right',
  defaultOpen = false,
  children,
}: Readonly<DebugPanelProps>) {
  const [open, setOpen] = useState(defaultOpen);

  // Ctrl/Cmd+Shift+D toggles the panel.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const visible = enabled ?? (isDevBuild() || hasDebugFlag());
  if (!visible) return null;

  const resolved: DebugSection[] = [
    ...(isEmpty(env) ? [] : [{ label: 'env', value: env }]),
    ...(isEmpty(auth) ? [] : [{ label: 'auth', value: auth }]),
    ...(store === undefined ? [] : [{ label: 'store', value: store }]),
    ...(isEmpty(data) ? [] : [{ label: 'data', value: data }]),
    ...(sections ?? []),
  ];

  return (
    <div className={`fixed z-[9999] flex flex-col gap-2 ${positionClass[position]}`}>
      {open && (
        <div className="w-[min(92vw,22rem)] overflow-hidden rounded-lg border border-border bg-background/95 text-foreground shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-2 py-1.5">
            <span className="text-xs font-semibold">🐞 {title}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Close debug panel"
            >
              ✕
            </button>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {resolved.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">No debug data provided.</p>
            ) : (
              resolved.map((s) => <Section key={s.label} label={s.label} value={s.value} />)
            )}
            {children && <div className="border-t border-border/60 px-2 py-2 text-xs">{children}</div>}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="self-end rounded-full border border-border bg-background/90 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-md backdrop-blur hover:bg-accent hover:text-accent-foreground"
        aria-label={open ? 'Hide debug panel' : 'Show debug panel'}
        title="Toggle debug panel (Ctrl/Cmd+Shift+D)"
      >
        🐞 debug
      </button>
    </div>
  );
}
