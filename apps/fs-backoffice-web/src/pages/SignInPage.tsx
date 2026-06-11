import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth, googleProvider } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { mapFirebaseError } from '@shared/lib/firebaseErrors';
import { GoogleSignInButton } from '@shared/ui/GoogleSignInButton';
import { signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { Navigate } from 'react-router';

export function SignInPage() {
  const { t } = useLocale();
  const { isAuthenticated, loading } = useAppSelector((s) => s.auth);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(mapFirebaseError(code, t));
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('auth.signIn')}</CardTitle>
          <CardDescription>{t('auth.backofficeOnly')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <GoogleSignInButton onClick={handleGoogleSignIn} disabled={signingIn}>
            {signingIn ? t('common.loading') : t('auth.signInWithGoogle')}
          </GoogleSignInButton>
        </CardContent>
      </Card>
    </div>
  );
}
