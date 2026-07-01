import { CompanySettingsPage } from '@/pages/CompanySettingsPage';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/_registered/_company/company-settings')({
  component: CompanySettingsPage,
});
