import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/authSlice';
import { signOut } from 'firebase/auth';
import { ShieldOff } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router';

export function UnauthorizedPage() {
  const { t } = useLocale();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const isBackofficeUser = useAppSelector((s) => s.auth.isBackofficeUser);
  const navigate = useNavigate();

  if (isBackofficeUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignOut = async () => {
    await signOut(auth);
    dispatch(logout());
    navigate('/sign-in', { replace: true });
  };

  const initials =
    user?.displayName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?';

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <ShieldOff className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="text-xl">{t('unauthorized.title')}</CardTitle>
          <CardDescription className="mt-1">{t('unauthorized.message')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-3 py-2.5 text-left">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{user.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t('unauthorized.hint')}</p>
          <Button variant="outline" onClick={handleSignOut}>
            {t('unauthorized.signOut')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
