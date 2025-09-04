import Sidebar from "./nav/sidebar";
import React from "react";

/**
 * Main application shell that wraps all pages with navigation
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="min-h-full bg-white">
          {children}
        </div>
      </main>
    </div>
  );
}