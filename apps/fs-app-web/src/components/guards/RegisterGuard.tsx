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
import { Outlet } from 'react-router';

const OFFICIAL_WEB_URL = import.meta.env.VITE_OFFICIAL_WEB_URL ?? '';

export function RegisterGuard() {
  const { isRegistered } = useAppSelector((s) => s.auth);
  const { t } = useLocale();

  const handleCreateCompany = () => {
    const dest = OFFICIAL_WEB_URL ? `${OFFICIAL_WEB_URL}/register` : '/';
    globalThis.location.replace(dest);
  };

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
