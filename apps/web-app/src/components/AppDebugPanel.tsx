import { useAppSelector } from '@/store';
import { DebugPanel } from '@shared/ui/DebugPanel';

/**
 * web-app's wiring of the shared {@link DebugPanel}. Feeds it real env,
 * auth/session, and the full Redux store. Dev-only by default (add `?debug` to
 * force it on elsewhere; Ctrl/Cmd+Shift+D toggles).
 */
export function AppDebugPanel() {
  const state = useAppSelector((s) => s);
  const { auth } = state;

  return (
    <DebugPanel
      title="web-app"
      env={{
        mode: import.meta.env.MODE,
        apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        firebaseProject: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      }}
      auth={{
        uid: auth.user?.uid,
        email: auth.user?.email,
        role: auth.profile?.role,
        isAuthenticated: auth.isAuthenticated,
        isRegistered: auth.isRegistered,
        isAdmin: auth.isAdmin,
        hasCompletedQuiz: auth.hasCompletedQuiz,
      }}
      store={state}
      data={{ route: window.location.pathname }}
    />
  );
}
