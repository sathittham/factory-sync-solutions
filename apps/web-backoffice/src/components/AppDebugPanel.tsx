import { useAppSelector } from '@/store';
import { DebugPanel } from '@shared/ui/DebugPanel';

/**
 * web-backoffice's wiring of the shared {@link DebugPanel}. Feeds it real env,
 * auth/session, and Redux state. Dev-only by default (add `?debug` to force it
 * on elsewhere; Ctrl/Cmd+Shift+D toggles).
 */
export function AppDebugPanel() {
  const auth = useAppSelector((s) => s.auth);

  return (
    <DebugPanel
      title="web-backoffice"
      env={{
        mode: import.meta.env.MODE,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        cmsUrl: import.meta.env.VITE_CMS_URL,
        firebaseProject: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      }}
      auth={{
        uid: auth.user?.uid,
        email: auth.user?.email,
        backofficeRole: auth.backofficeRole,
        isAuthenticated: auth.isAuthenticated,
        isBackofficeUser: auth.isBackofficeUser,
        isSuperAdmin: auth.isSuperAdmin,
      }}
      store={auth}
      data={{ route: window.location.pathname }}
    />
  );
}
