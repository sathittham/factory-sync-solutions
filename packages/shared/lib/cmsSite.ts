const LOCAL_CMS_URL = 'http://localhost:8787';
const DEFAULT_CMS_URL = 'https://factorysyncsolutions.com';
const CMS_ADMIN_PATH = '/admin';
// SSO handover endpoint: web-backoffice POSTs the user's Firebase ID token here
// to start a CMS admin session, then lands on /admin (see apps/web-cms/src/sso/).
const CMS_SSO_PATH = '/sso/handover';

interface CmsUrlOptions {
  readonly isDevelopment?: boolean;
}

function cmsUrl(path: string, cmsBase: string | undefined, isDevelopment: boolean): string {
  const base = isDevelopment ? LOCAL_CMS_URL : cmsBase || DEFAULT_CMS_URL;

  try {
    const url = new URL(base);
    url.pathname = path;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return `${DEFAULT_CMS_URL}${path}`;
  }
}

/** CMS admin dashboard URL. */
export function getCmsAdminUrl(
  cmsBase?: string,
  { isDevelopment = false }: CmsUrlOptions = {},
): string {
  return cmsUrl(CMS_ADMIN_PATH, cmsBase, isDevelopment);
}

/** CMS SSO entry — auto-signs the backoffice user in via Google, then /admin. */
export function getCmsSsoUrl(
  cmsBase?: string,
  { isDevelopment = false }: CmsUrlOptions = {},
): string {
  return cmsUrl(CMS_SSO_PATH, cmsBase, isDevelopment);
}
