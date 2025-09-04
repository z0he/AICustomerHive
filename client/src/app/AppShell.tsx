import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/app/nav/sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user } = useAuth();

  // Don't show sidebar on auth pages or for non-authenticated users
  const showSidebar = user && !window.location.pathname.startsWith('/auth');

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}