import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { Outlet, useNavigate } from '@tanstack/react-router';

export function RegisterGuard() {
  const { isRegistered } = useAppSelector((s) => s.auth);
  const { t } = useLocale();
  const navigate = useNavigate();

  const handleCreateCompany = () => navigate({ to: '/register' });
  const handleSignOut = () => auth.signOut();

  if (isRegistered) return <Outlet />;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('noProfile.title')}</DialogTitle>
          <DialogDescription>{t('noProfile.desc')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleSignOut}>
            {t('noProfile.signOut')}
          </Button>
          <Button onClick={handleCreateCompany}>{t('noProfile.create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
