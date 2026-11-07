'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Star } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/student-dashboard') {
      return pathname === '/student-dashboard';
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden">
      <div className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        {/* Dashboard */}
        <Link
          href="/student-dashboard"
          className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] min-w-[44px] py-1 transition-colors select-none"
        >
          <Home
            className={`w-6 h-6 transition-colors ${
              isActive('/student-dashboard') ? 'text-[#A22538]' : 'text-gray-400'
            }`}
          />
          <span
            className={`text-xs leading-none transition-colors ${
              isActive('/student-dashboard')
                ? 'text-[#A22538] font-semibold'
                : 'text-gray-400'
            }`}
          >
            Dashboard
          </span>
        </Link>

        {/* Results */}
        <Link
          href="/student-dashboard/results"
          className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] min-w-[44px] py-1 transition-colors select-none"
        >
          <Trophy
            className={`w-6 h-6 transition-colors ${
              isActive('/student-dashboard/results') ? 'text-[#A22538]' : 'text-gray-400'
            }`}
          />
          <span
            className={`text-xs leading-none transition-colors ${
              isActive('/student-dashboard/results')
                ? 'text-[#A22538] font-semibold'
                : 'text-gray-400'
            }`}
          >
            Results
          </span>
        </Link>

        {/* Achievements */}
        <Link
          href="/student-dashboard/achievements"
          className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] min-w-[44px] py-1 transition-colors select-none"
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              isActive('/student-dashboard/achievements')
                ? 'text-[#A22538]'
                : 'text-gray-400'
            }`}
          />
          <span
            className={`text-xs leading-none transition-colors ${
              isActive('/student-dashboard/achievements')
                ? 'text-[#A22538] font-semibold'
                : 'text-gray-400'
            }`}
          >
            Achievements
          </span>
        </Link>
      </div>
    </nav>
  );
}
