/**
 * FactorySync branding constants for the SonicJS CMS.
 *
 * SonicJS renders its auth/admin HTML internally and exposes no branding hook,
 * so we re-skin those pages by rewriting the HTML response (see
 * brand-middleware.ts). Everything visual the rebrand needs lives here.
 */

/** Product name shown in page titles and headers. */
export const BRAND_NAME = 'FactorySync'
/** Longer name used for the admin shell title. */
export const BRAND_NAME_ADMIN = 'FactorySync CMS'
/** Public site, used to repoint SonicJS attribution links. */
export const BRAND_URL = 'https://factorysyncsolutions.com'

/** Static-asset paths served from public/brand (Cloudflare Static Assets). */
export const ASSET_LOGO_LIGHT = '/brand/fs-light.png'
export const ASSET_LOGO_DARK = '/brand/fs-dark.png'
export const ASSET_FAVICON = '/brand/favicon.png'

/**
 * Brand stylesheet injected into every server-rendered page.
 *
 * Strategy:
 * - Define `--fs-primary` (FactorySync blue) for light and dark.
 * - Recolor SonicJS's cyan accent to brand blue everywhere.
 * - Theme the swapped-in logo images (show the variant matching the theme).
 * - Skin the auth pages, which hardcode dark utilities (`bg-zinc-950`, no
 *   `dark:` variants), so they also render correctly in light mode. Scoped to
 *   `body.bg-zinc-950` so the admin (which already uses `dark:` variants) is
 *   untouched.
 */
export const BRAND_CSS = `
:root{--fs-primary:220 65% 48%;--fs-primary-hover:220 65% 42%;}
html.dark{--fs-primary:217 65% 55%;--fs-primary-hover:217 65% 48%;}

/* Recolor the default cyan accent to FactorySync blue */
.text-cyan-400,.text-cyan-700,.dark\\:text-cyan-400{color:hsl(var(--fs-primary))!important}
.bg-cyan-50,.bg-cyan-500\\/10,.dark\\:bg-cyan-500\\/10{background-color:hsl(var(--fs-primary)/0.12)!important}
.ring-cyan-500\\/20,.ring-cyan-700\\/10,.dark\\:ring-cyan-500\\/20{--tw-ring-color:hsl(var(--fs-primary)/0.30)!important}

/* Dashboard stat strip: core hardcodes it dark in BOTH themes
   (bg-zinc-800/75 dark:bg-zinc-800/75), so in light mode it reads dark-on-light.
   Restore a light surface in light mode; dark mode is already correct. */
html:not(.dark) .bg-zinc-800\\/75{background-color:#fff!important}

/* Logo: show only the variant matching the active theme.
   Keep display off the base rule so the hide rules below aren't outranked.
   Pin an explicit height (the FactorySync mark is square, unlike the original
   wide wordmark, so its sizing classes — h-8 w-auto, w-64 — would blow it up). */
img.fs-logo{height:2.5rem;width:auto;object-fit:contain}
.fs-logo-light{display:block}
.fs-logo-dark{display:none}
html.dark .fs-logo-light{display:none}
html.dark .fs-logo-dark{display:block}

/* Auth pages (identified by body.bg-zinc-950) — larger, centered logo. */
body.bg-zinc-950 .fs-logo{height:4.5rem;width:auto;margin-inline:auto}
body.bg-zinc-950 button[type="submit"]{background-color:hsl(var(--fs-primary));color:#fff}
body.bg-zinc-950 button[type="submit"]:hover{background-color:hsl(var(--fs-primary-hover))}
html:not(.dark) body.bg-zinc-950{background-color:#eef2f7}
html:not(.dark) body.bg-zinc-950 .bg-zinc-900{background-color:#fff!important;box-shadow:0 1px 3px rgb(15 23 42/.08),0 1px 2px rgb(15 23 42/.04)}
html:not(.dark) body.bg-zinc-950 .bg-zinc-800{background-color:#f1f5f9!important}
html:not(.dark) body.bg-zinc-950 .text-white{color:#0f172a!important}
html:not(.dark) body.bg-zinc-950 .text-zinc-300{color:#334155!important}
html:not(.dark) body.bg-zinc-950 .text-zinc-400{color:#475569!important}
html:not(.dark) body.bg-zinc-950 .ring-white\\/10{--tw-ring-color:rgb(15 23 42/.12)!important}
html:not(.dark) body.bg-zinc-950 .placeholder\\:text-zinc-500::placeholder{color:#94a3b8!important}

/* "Continue with Google" button + divider (auth pages) */
.fs-oauth{margin-bottom:1.5rem}
.fs-google-btn{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:.625rem;border-radius:.5rem;padding:.625rem 1rem;font-size:.875rem;font-weight:600;cursor:pointer;border:1px solid rgb(15 23 42/.15);background:#fff;color:#1f2937;transition:background .15s ease}
.fs-google-btn:hover{background:#f8fafc}
.fs-google-btn:disabled{opacity:.6;cursor:default}
html.dark .fs-google-btn{background:#27272a;color:#fafafa;border-color:rgb(255 255 255/.14)}
html.dark .fs-google-btn:hover{background:#3f3f46}
.fs-google-btn svg{width:1.125rem;height:1.125rem}
.fs-oauth-divider{display:flex;align-items:center;text-align:center;margin-top:1.25rem;color:#94a3b8;font-size:.75rem;text-transform:uppercase;letter-spacing:.05em}
.fs-oauth-divider::before,.fs-oauth-divider::after{content:"";flex:1;border-top:1px solid rgb(148 163 184/.35)}
.fs-oauth-divider span{padding:0 .75rem}

/* Floating theme toggle */
#fs-theme-toggle{position:fixed;z-index:9999;top:1rem;right:1rem;display:inline-flex;align-items:center;justify-content:center;width:2.5rem;height:2.5rem;border-radius:9999px;border:1px solid rgb(15 23 42/.12);background:#fff;color:#0f172a;box-shadow:0 2px 8px rgb(15 23 42/.18);cursor:pointer;transition:transform .15s ease}
html.dark #fs-theme-toggle{background:#18181b;color:#fafafa;border-color:rgb(255 255 255/.14)}
#fs-theme-toggle:hover{transform:scale(1.08)}
#fs-theme-toggle svg{width:1.25rem;height:1.25rem}
#fs-theme-toggle .fs-moon{display:none}
html.dark #fs-theme-toggle .fs-moon{display:block}
html.dark #fs-theme-toggle .fs-sun{display:none}
`.trim()

/**
 * No-FOUC theme init. Runs in <head> before paint. Resolves the theme from an
 * explicit user choice (`fs-theme`), otherwise follows the OS preference.
 * SonicJS hardcodes `class="dark"` on <html>; this corrects it immediately.
 */
export const THEME_INIT_SCRIPT = `
(function(){try{
var t=localStorage.getItem('fs-theme');
var dark=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.classList[dark?'add':'remove']('dark');
}catch(e){}})();
`.trim()

/**
 * "Continue with Google" block, injected above the email/password form on the
 * auth pages — but only when Google credentials are configured (see the
 * middleware's `googleEnabled` gate).
 *
 * SonicJS's auth runs on better-auth, which auto-enables the Google social
 * provider when GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET are set. The default
 * login page renders no social button, so we add one here. It POSTs to
 * better-auth's social endpoint and follows the returned authorize URL. (CSRF
 * is not enforced for unauthenticated requests, so no token is needed here.)
 */
export const GOOGLE_SIGNIN_HTML = `
<div class="fs-oauth">
<button type="button" id="fs-google-btn" class="fs-google-btn">
<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
<span>Continue with Google</span>
</button>
<div class="fs-oauth-divider"><span>or</span></div>
</div>
<script>
(function(){var b=document.getElementById('fs-google-btn');if(!b)return;
b.addEventListener('click',async function(){b.disabled=true;
try{var r=await fetch('/auth/sign-in/social',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({provider:'google',callbackURL:'/admin'})});var d=await r.json();if(d&&d.url){window.location.href=d.url;return;}}catch(e){}
b.disabled=false;});})();
</script>
`.trim()

/** Floating toggle button markup + behavior, injected before </body>. */
export const THEME_TOGGLE_HTML = `
<button id="fs-theme-toggle" type="button" aria-label="Toggle light and dark theme" title="Toggle theme">
<svg class="fs-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
<svg class="fs-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
</button>
<script>
(function(){var b=document.getElementById('fs-theme-toggle');if(!b)return;
b.addEventListener('click',function(){var e=document.documentElement;var d=!e.classList.contains('dark');e.classList.toggle('dark',d);try{localStorage.setItem('fs-theme',d?'dark':'light');localStorage.setItem('darkMode',d?'true':'false');}catch(x){}});})();
</script>
`.trim()
