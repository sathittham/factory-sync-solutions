import { NotFoundPage } from '@/pages/NotFoundPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/$')({
  component: NotFoundPage,
});
