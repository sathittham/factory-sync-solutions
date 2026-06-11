import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch } from '@/store';
import { logout } from '@/store/authSlice';
import { signOut } from 'firebase/auth';
import { ShieldOff } from 'lucide-react';

export function UnauthorizedPage() {
  const { t } = useLocale();
  const dispatch = useAppDispatch();

  const handleSignOut = async () => {
    await signOut(auth);
    dispatch(logout());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldOff className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">{t('unauthorized.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('unauthorized.message')}</p>
          <Button variant="outline" onClick={handleSignOut}>
            {t('unauthorized.signOut')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
