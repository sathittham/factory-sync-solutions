const LOCAL_OFFICIAL_WEB_URL = 'http://localhost:4321';
const DEFAULT_OFFICIAL_WEB_URL = 'https://www.factorysyncsolutions.com';

interface OfficialWebUrlOptions {
  readonly isDevelopment?: boolean;
}

export function getOfficialWebUrl(
  officialWebUrl?: string,
  { isDevelopment = false }: OfficialWebUrlOptions = {},
): string {
  if (isDevelopment) return LOCAL_OFFICIAL_WEB_URL;

  try {
    const url = new URL(officialWebUrl || DEFAULT_OFFICIAL_WEB_URL);
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return DEFAULT_OFFICIAL_WEB_URL;
  }
}
