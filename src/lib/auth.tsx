'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { Session, UserItem } from '@/types/database';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_PASSWORD = 'kinkin99';
const SESSION_KEY = 'kinford_session';
const LEGACY_AUTH_KEY = 'kinford_admin_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Read session synchronously from localStorage on mount
    const savedSessionRaw = localStorage.getItem(SESSION_KEY);
    let parsedSession: Session | null = null;

    if (savedSessionRaw) {
      try {
        parsedSession = JSON.parse(savedSessionRaw);
      } catch {
        parsedSession = null;
      }
    } else if (localStorage.getItem(LEGACY_AUTH_KEY) === 'true') {
      parsedSession = { type: 'admin' };
    }

    if (parsedSession) {
      setSession(parsedSession);
      setIsAuthenticated(true);

      // Route checks
      if (pathname === '/') {
        if (parsedSession.type === 'student') {
          router.replace('/student-dashboard');
        } else {
          router.replace('/dashboard');
        }
      } else if (parsedSession.type === 'student') {
        // Students cannot access admin routes
        if (
          pathname === '/dashboard' ||
          pathname.startsWith('/users') ||
          pathname.startsWith('/classes') ||
          (pathname.startsWith('/results') && !pathname.startsWith('/student-dashboard'))
        ) {
          router.replace('/student-dashboard');
        }
      } else if (parsedSession.type === 'staff') {
        // Staff cannot access student dashboard or users module or unauthorized modules
        if (pathname.startsWith('/student-dashboard')) {
          router.replace('/dashboard');
        } else if (pathname.startsWith('/users')) {
          router.replace('/dashboard');
        } else if (pathname.startsWith('/classes') && !parsedSession.accessClasses) {
          router.replace('/dashboard');
        } else if (pathname.startsWith('/results') && !parsedSession.accessResults) {
          router.replace('/dashboard');
        }
      } else if (parsedSession.type === 'admin') {
        // Admin shouldn't land on student dashboard directly
        if (pathname.startsWith('/student-dashboard')) {
          router.replace('/dashboard');
        }
      }
    } else {
      setSession(null);
      setIsAuthenticated(false);
      if (pathname !== '/') {
        router.replace('/');
      }
    }
  }, [pathname, router]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Admin shortcut: Email is empty
    if (!trimmedEmail) {
      if (password === ADMIN_PASSWORD) {
        const adminSession: Session = { type: 'admin' };
        localStorage.setItem(SESSION_KEY, JSON.stringify(adminSession));
        localStorage.setItem(LEGACY_AUTH_KEY, 'true');
        document.cookie = `${LEGACY_AUTH_KEY}=true; path=/; max-age=86400; SameSite=Lax`;
        setSession(adminSession);
        setIsAuthenticated(true);
        router.replace('/dashboard');
        return { success: true };
      } else {
        return { success: false, error: 'Invalid password' };
      }
    }

    // 2. Email is filled: Look up in Supabase users table
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          password_hash,
          user_type,
          class_id,
          access_classes,
          access_results,
          classes (
            id,
            name,
            section
          )
        `)
        .eq('email', trimmedEmail)
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: 'Invalid email or password' };
      }

      const userRecord = data as unknown as UserItem;
      const isMatch = bcrypt.compareSync(password, userRecord.password_hash);
      if (!isMatch) {
        return { success: false, error: 'Invalid email or password' };
      }

      if (userRecord.user_type === 'staff') {
        const staffSession: Session = {
          type: 'staff',
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          accessClasses: !!userRecord.access_classes,
          accessResults: !!userRecord.access_results,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(staffSession));
        localStorage.setItem(LEGACY_AUTH_KEY, 'true');
        document.cookie = `${LEGACY_AUTH_KEY}=true; path=/; max-age=86400; SameSite=Lax`;
        setSession(staffSession);
        setIsAuthenticated(true);
        router.replace('/dashboard');
        return { success: true };
      } else if (userRecord.user_type === 'student') {
        const className = userRecord.classes
          ? `${userRecord.classes.name}${userRecord.classes.section ? ` - ${userRecord.classes.section}` : ''}`
          : 'General';

        const studentSession: Session = {
          type: 'student',
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          classId: userRecord.class_id,
          className,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(studentSession));
        localStorage.setItem(LEGACY_AUTH_KEY, 'true');
        document.cookie = `${LEGACY_AUTH_KEY}=true; path=/; max-age=86400; SameSite=Lax`;
        setSession(studentSession);
        setIsAuthenticated(true);
        router.replace('/student-dashboard');
        return { success: true };
      } else {
        return { success: false, error: 'Invalid email or password' };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_AUTH_KEY);
    localStorage.removeItem('kinford_user_session');
    document.cookie = `${LEGACY_AUTH_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    setSession(null);
    setIsAuthenticated(false);
    router.replace('/');
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, session, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
