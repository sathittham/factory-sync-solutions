import { CompanySettingsGuard } from '@/components/guards/CompanySettingsGuard';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/_registered/_company')({
  component: CompanySettingsGuard,
});
