'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/lib/auth';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session } = useAuth();
  const isLoginPage = pathname === '/';
  const isStudent = session?.type === 'student' || pathname.startsWith('/student-dashboard');

  // Login page layout
  if (isLoginPage) {
    return <main className="min-h-screen bg-white">{children}</main>;
  }

  // Protected pages layout
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Sidebar />
      <main
        className={`md:pl-[250px] min-h-screen flex flex-col bg-white ${
          isStudent ? 'pb-24 md:pb-8' : 'pb-8'
        }`}
      >
        <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
