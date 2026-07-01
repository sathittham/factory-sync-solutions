import { SignInPage } from '@/pages/SignInPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: SignInPage,
});
