import { AppDebugPanel } from '@/components/AppDebugPanel';
import { useAuth } from '@/hooks/useAuth';
import { LocaleProvider } from '@/lib/i18n';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/lib/theme';
import { router } from '@/router';
import { store } from '@/store';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { Provider } from 'react-redux';

function AuthInitializer({ children }: { readonly children: React.ReactNode }) {
  useAuth();
  return <>{children}</>;
}

export function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
            <AuthInitializer>
              <RouterProvider router={router} />
              <AppDebugPanel />
            </AuthInitializer>
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
}
