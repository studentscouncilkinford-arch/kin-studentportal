'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { UserItem } from '@/types/database';

export interface AuthUser {
  id?: string;
  name: string;
  email?: string;
  role: 'admin' | 'staff' | 'student';
  access_classes?: boolean;
  access_results?: boolean;
  class_id?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  loginAdmin: (password: string) => boolean;
  loginUser: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_PASSWORD = 'kinkin99';
const AUTH_KEY = 'kinford_admin_auth';
const USER_KEY = 'kinford_user_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const authStatus = localStorage.getItem(AUTH_KEY);
    const sessionData = localStorage.getItem(USER_KEY);

    if (authStatus === 'true') {
      setIsAuthenticated(true);
      if (sessionData) {
        try {
          setUser(JSON.parse(sessionData));
        } catch {
          setUser({ name: 'Portal Admin', role: 'admin' });
        }
      } else {
        setUser({ name: 'Portal Admin', role: 'admin' });
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);

    // Route protection logic
    if (authStatus !== 'true' && pathname !== '/') {
      router.replace('/');
    } else if (authStatus === 'true' && pathname === '/') {
      router.replace('/dashboard');
    }
  }, [pathname, router]);

  const loginAdmin = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      const adminUser: AuthUser = {
        name: 'Portal Admin',
        role: 'admin',
        access_classes: true,
        access_results: true,
      };
      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(USER_KEY, JSON.stringify(adminUser));
      document.cookie = `${AUTH_KEY}=true; path=/; max-age=86400; SameSite=Lax`;
      setIsAuthenticated(true);
      setUser(adminUser);
      return true;
    }
    return false;
  };

  const loginUser = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error || !data) {
        return { success: false, error: 'User not found with this email' };
      }

      const userRecord = data as unknown as UserItem;
      const isMatch = bcrypt.compareSync(password, userRecord.password_hash);
      if (!isMatch) {
        return { success: false, error: 'Incorrect password' };
      }

      const sessionUser: AuthUser = {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        role: userRecord.user_type,
        access_classes: userRecord.user_type === 'staff' ? userRecord.access_classes : false,
        access_results: userRecord.user_type === 'staff' ? userRecord.access_results : true,
        class_id: userRecord.class_id,
      };

      localStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
      document.cookie = `${AUTH_KEY}=true; path=/; max-age=86400; SameSite=Lax`;
      setIsAuthenticated(true);
      setUser(sessionUser);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = `${AUTH_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    setIsAuthenticated(false);
    setUser(null);
    router.replace('/');
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, user, loginAdmin, loginUser, logout }}
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
