import { Layout } from '@/components/Layout';
import { AdminGuard } from '@/components/guards/AdminGuard';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { RegisterGuard } from '@/components/guards/RegisterGuard';
import { AdminPage } from '@/pages/AdminPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { QuizPage } from '@/pages/QuizPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResultPage } from '@/pages/ResultPage';
import { SignInPage } from '@/pages/SignInPage';
import { createBrowserRouter } from 'react-router';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <SignInPage /> },
      {
        element: <AuthGuard />,
        children: [
          { path: 'register', element: <RegisterPage /> },
          {
            element: <RegisterGuard />,
            children: [
              { path: 'quiz', element: <QuizPage /> },
              { path: 'results', element: <ResultPage /> },
              { path: 'dashboard', element: <DashboardPage /> },
            ],
          },
          {
            element: <AdminGuard />,
            children: [{ path: 'admin', element: <AdminPage /> }],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
