'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ADMIN_PASSWORD = 'kinkin99';
const AUTH_KEY = 'kinford_admin_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check localStorage and cookie on mount
    const authStatus = localStorage.getItem(AUTH_KEY);
    const hasAuth = authStatus === 'true';
    setIsAuthenticated(hasAuth);
    setIsLoading(false);

    // Route protection logic
    if (!hasAuth && pathname !== '/') {
      router.replace('/');
    } else if (hasAuth && pathname === '/') {
      router.replace('/dashboard');
    }
  }, [pathname, router]);

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true');
      document.cookie = `${AUTH_KEY}=true; path=/; max-age=86400; SameSite=Lax`;
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    document.cookie = `${AUTH_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    setIsAuthenticated(false);
    router.replace('/');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
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
