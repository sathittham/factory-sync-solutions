import { QuizPage } from '@/pages/QuizPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/_registered/quiz')({
  component: QuizPage,
});
