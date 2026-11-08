'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardList,
  Trophy,
  Star,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Home,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // If on login page, do not render sidebar/nav
  if (pathname === '/') {
    return null;
  }

  const role = session?.type || 'admin';
  const isStudent = role === 'student';

  // Navigation Items per role
  let navItems: { name: string; href: string; icon: React.ElementType }[] = [];

  if (isStudent) {
    navItems = [
      { name: 'Dashboard', href: '/student-dashboard', icon: Home },
      { name: 'Results', href: '/student-dashboard/results', icon: Trophy },
      { name: 'Achievements', href: '/student-dashboard/achievements', icon: Star },
    ];
  } else if (role === 'staff') {
    navItems = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      ...(session && 'accessClasses' in session && session.accessClasses
        ? [{ name: 'Classes', href: '/classes', icon: GraduationCap }]
        : []),
      ...(session && 'accessResults' in session && session.accessResults
        ? [{ name: 'Results', href: '/results', icon: ClipboardList }]
        : []),
    ];
  } else {
    // Admin
    navItems = [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Classes', href: '/classes', icon: GraduationCap },
      { name: 'Results', href: '/results', icon: ClipboardList },
    ];
  }

  const roleBadge = {
    admin: { label: 'Admin', color: 'bg-[#FEF7E8] text-[#B8860B] border-[#EEB540]/30' },
    staff: { label: 'Staff', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    student: { label: 'Student', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }[role];

  const userName =
    session && 'name' in session ? session.name : role === 'admin' ? 'Portal Administrator' : 'User';

  const userSubtitle =
    role === 'admin'
      ? 'Full Access'
      : role === 'staff'
      ? 'Staff Account'
      : (session && 'className' in session && session.className)
      ? `Class: ${session.className}`
      : 'Student Account';

  // Check if link is active
  const isLinkActive = (href: string) => {
    if (href === '/student-dashboard' || href === '/dashboard') {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* ================= MOBILE TOP HEADER (< 768px, ~56px height) ================= */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between shadow-sm">
        {isStudent ? (
          /* Student Mobile Top Bar: Left Kinford, Right Hamburger */
          <>
            <span className="text-xl font-bold tracking-tight text-[#A22538]">
              Kinford
            </span>
            <button
              onClick={() => setMobileOpen(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-700 hover:text-[#A22538] hover:bg-gray-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </>
        ) : (
          /* Admin / Staff Mobile Top Bar */
          <>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#A22538]">Kinford</span>
              <span className="text-xs text-gray-500 font-medium">Portal</span>
            </div>
            <button
              onClick={() => setMobileOpen(true)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </>
        )}
      </header>

      {/* ================= DESKTOP SIDEBAR (≥ 768px, hidden md:flex) ================= */}
      <aside className="hidden md:flex flex-col w-[250px] fixed inset-y-0 left-0 bg-white border-r border-gray-200 z-30 shadow-sm select-none">
        {/* Brand Header */}
        <div className="px-6 py-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#A22538]">
                Kinford
              </h1>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${roleBadge.color}`}
              >
                {roleBadge.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5 tracking-wide">
              {isStudent ? 'Student Portal' : 'Admin Panel'}
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isLinkActive(item.href);

            return (
              <NextLink
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-all ${
                  active
                    ? 'text-[#A22538] border-l-4 border-[#A22538] bg-[#FFF1F3] font-semibold'
                    : 'text-gray-600 hover:text-[#A22538] hover:bg-gray-50 border-l-4 border-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    active ? 'text-[#A22538]' : 'text-gray-500'
                  }`}
                />
                <span>{item.name}</span>
              </NextLink>
            );
          })}
        </nav>

        {/* User Session Status Pill */}
        <div className="px-6 py-3">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
            {role === 'admin' ? (
              <ShieldCheck className="w-4 h-4 text-[#EEB540] flex-shrink-0" />
            ) : role === 'staff' ? (
              <Briefcase className="w-4 h-4 text-blue-600 flex-shrink-0" />
            ) : (
              <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            )}
            <div className="truncate">
              <p className="font-semibold text-gray-800 truncate">{userName}</p>
              <p className="text-[11px] text-gray-500 capitalize">{userSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-[#A22538] hover:bg-red-50/50 transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-500" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ================= MOBILE SLIDE-OUT DRAWER (< 768px) ================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay (click to close) */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          />

          {/* White Drawer Panel (~280px wide, sliding from the right) */}
          <div className="fixed top-0 bottom-0 right-0 z-50 w-[280px] bg-white shadow-2xl flex flex-col justify-between transition-transform duration-300 ease-in-out animate-in slide-in-from-right">
            <div>
              {/* Drawer Top Header with close button */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between">
                <div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${roleBadge.color} mb-1.5`}
                  >
                    {roleBadge.label}
                  </span>
                  <p className="font-bold text-gray-900 text-base leading-tight truncate">
                    {userName}
                  </p>
                  {isStudent && session && 'className' in session && session.className && (
                    <p className="text-xs text-[#A22538] font-semibold mt-0.5">
                      Class: {session.className}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="min-w-[44px] min-h-[44px] -mr-2 -mt-2 flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                  aria-label="Close navigation"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isLinkActive(item.href);

                  return (
                    <NextLink
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3.5 px-5 py-3 text-sm font-medium transition-colors ${
                        active
                          ? 'text-[#A22538] bg-[#FFF1F3] font-semibold border-l-4 border-[#A22538]'
                          : 'text-gray-600 hover:text-[#A22538] hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          active ? 'text-[#A22538]' : 'text-gray-500'
                        }`}
                      />
                      <span>{item.name}</span>
                    </NextLink>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Bottom: Logout */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="w-full min-h-[44px] flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-[#A22538] hover:bg-red-50/50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-gray-400" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
