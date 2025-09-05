import { ReactNode } from 'react';
import { Sidebar } from './nav/sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-white">{children}</main>
    </div>
  );
}