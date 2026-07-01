import { AuthGuard } from '@/components/guards/AuthGuard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed')({
  component: AuthGuard,
});
