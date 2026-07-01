import { ResultPage } from '@/pages/ResultPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/_registered/results')({
  component: ResultPage,
});
