import { Layout } from '@/components/Layout';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { BackofficeGuard } from '@/components/guards/BackofficeGuard';
import { SuperAdminGuard } from '@/components/guards/SuperAdminGuard';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProjectDetailPage } from '@/pages/ProjectDetailPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ResultsPage } from '@/pages/ResultsPage';
import { SignInPage } from '@/pages/SignInPage';
import { StaffPage } from '@/pages/StaffPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { UsersPage } from '@/pages/UsersPage';
import { Navigate, createBrowserRouter } from 'react-router';

export const router = createBrowserRouter([
  { index: true, element: <Navigate to="/dashboard" replace /> },
  { path: 'sign-in', element: <SignInPage /> },
  { path: 'unauthorized', element: <UnauthorizedPage /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <BackofficeGuard />,
        children: [
          {
            element: <Layout />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'projects', element: <ProjectsPage /> },
              { path: 'projects/:projectID', element: <ProjectDetailPage /> },
              { path: 'users', element: <UsersPage /> },
              { path: 'results', element: <ResultsPage /> },
              {
                element: <SuperAdminGuard />,
                children: [{ path: 'staff', element: <StaffPage /> }],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
