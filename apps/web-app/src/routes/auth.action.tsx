import { AuthActionPage } from '@/pages/AuthActionPage';
import { createFileRoute } from '@tanstack/react-router';

interface AuthActionSearch {
  mode?: string;
  oobCode?: string;
}

function validateSearch(search: Record<string, unknown>): AuthActionSearch {
  return {
    mode: typeof search.mode === 'string' ? search.mode : undefined,
    oobCode: typeof search.oobCode === 'string' ? search.oobCode : undefined,
  };
}

export const Route = createFileRoute('/auth/action')({
  validateSearch,
  component: AuthActionPage,
});
