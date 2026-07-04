import { Layout } from '@/components/Layout';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { BackofficeGuard } from '@/components/guards/BackofficeGuard';
import { SuperAdminGuard } from '@/components/guards/SuperAdminGuard';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { ApiDocsPage } from '@/pages/ApiDocsPage';
import { AuditPage } from '@/pages/AuditPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
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
              { path: 'analytics', element: <AnalyticsPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'projects', element: <ProjectsPage /> },
              { path: 'projects/:projectID', element: <ProjectDetailPage /> },
              { path: 'users', element: <UsersPage /> },
              { path: 'results', element: <ResultsPage /> },
              {
                element: <SuperAdminGuard />,
                children: [
                  { path: 'staff', element: <StaffPage /> },
                  { path: 'audit', element: <AuditPage /> },
                  { path: 'help/api-docs', element: <ApiDocsPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
