import { RegisterGuard } from '@/components/guards/RegisterGuard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/_registered')({
  component: RegisterGuard,
});
