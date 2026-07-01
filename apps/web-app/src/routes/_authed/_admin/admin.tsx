import { AdminPage } from '@/pages/AdminPage';
import { createFileRoute } from '@tanstack/react-router';

interface AdminSearch {
  tab?: string;
}

function validateSearch(search: Record<string, unknown>): AdminSearch {
  return {
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  };
}

export const Route = createFileRoute('/_authed/_admin/admin')({
  validateSearch,
  component: AdminPage,
});
