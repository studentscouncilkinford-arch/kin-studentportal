'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAuth();
  const isLoginPage = pathname === '/';

  // If loading auth state on protected route, show a minimal clean loading state
  if (isLoading && !isLoginPage) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#A22538] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium tracking-wide">Loading Kinford Portal...</p>
        </div>
      </div>
    );
  }

  // Login page layout
  if (isLoginPage) {
    return <main className="min-h-screen bg-white">{children}</main>;
  }

  // Protected pages layout with left sidebar
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Sidebar />
      <main className="md:pl-[250px] min-h-screen flex flex-col bg-white">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
