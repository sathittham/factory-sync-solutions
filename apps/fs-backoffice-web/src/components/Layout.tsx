import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Outlet } from 'react-router';
import { AppSidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="h-svh overflow-hidden">
      <SidebarProvider className="h-full min-h-0">
        <AppSidebar />
        <SidebarInset className="overflow-auto">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mx-1 h-4" />
          </header>
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
