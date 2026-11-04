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

  // If on login page, do not render sidebar
  if (pathname === '/') {
    return null;
  }

  const role = session?.type || 'admin';

  // Navigation Items per role
  let navItems: { name: string; href: string; icon: React.ElementType }[] = [];

  if (role === 'student') {
    navItems = [
      { name: 'Dashboard', href: '/student-dashboard', icon: Home },
      { name: 'My Results', href: '/student-dashboard/results', icon: ClipboardList },
      { name: 'Achievements', href: '/student-dashboard/achievements', icon: Trophy },
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
      : 'Student Account';

  const navContent = (
    <div className="flex flex-col h-full bg-white select-none">
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
            Student Portal
          </p>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' &&
              item.href !== '/student-dashboard' &&
              pathname.startsWith(`${item.href}/`));

          return (
            <NextLink
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-all ${
                isActive
                  ? 'text-[#A22538] border-l-4 border-[#A22538] bg-[#FFF1F3] font-semibold'
                  : 'text-gray-600 hover:text-[#A22538] hover:bg-gray-50 border-l-4 border-transparent'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? 'text-[#A22538]' : 'text-gray-500 group-hover:text-[#A22538]'
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
    </div>
  );

  return (
    <>
      {/* Mobile Top Header with Hamburger */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div>
          <span className="text-xl font-bold text-[#A22538]">Kinford</span>
          <span className="text-xs text-gray-500 ml-2">Student Portal</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Desktop Sidebar (Fixed, ~250px wide) */}
      <aside className="hidden md:flex flex-col w-[250px] fixed inset-y-0 left-0 bg-white border-r border-gray-200 z-30 shadow-sm">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex-1 max-w-[270px] w-full bg-white h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
