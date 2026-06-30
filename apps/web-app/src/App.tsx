import { useAuth } from '@/hooks/useAuth';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { router } from '@/router';
import { store } from '@/store';
import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router';

function AuthInitializer({ children }: { readonly children: React.ReactNode }) {
  useAuth();
  return <>{children}</>;
}

export function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <LocaleProvider>
          <AuthInitializer>
            <RouterProvider router={router} />
          </AuthInitializer>
        </LocaleProvider>
      </ThemeProvider>
    </Provider>
  );
}
