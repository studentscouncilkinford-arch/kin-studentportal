'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/';

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
