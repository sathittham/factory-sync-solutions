import { DashboardPage } from '@/pages/DashboardPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/_registered/dashboard')({
  component: DashboardPage,
});
