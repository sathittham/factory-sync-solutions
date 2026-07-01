import { AdminGuard } from '@/components/guards/AdminGuard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/_admin')({
  component: AdminGuard,
});
