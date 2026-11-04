'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Please enter the admin password');
      return;
    }

    setIsSubmitting(true);

    const success = login(password);
    if (success) {
      toast.success('Welcome back, Admin!');
      router.push('/dashboard');
    } else {
      setError('Incorrect password');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-12">
      {/* Centered Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8 sm:p-10 transition-all">
        {/* Top Logo / Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FFF1F3] text-[#A22538] mb-4 border border-[#A22538]/10 shadow-sm">
            <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#A22538]">
            Kinford
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Student Portal — Admin Access
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
            >
              Admin Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter password"
                className={`w-full pl-10 pr-11 py-3 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all ${
                  error
                    ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-gray-200 focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15'
                }`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Inline Error */}
            {error && (
              <p className="mt-2 text-xs font-medium text-red-600 animate-in fade-in">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] active:bg-[#721725] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Protected Admin Gate &bull; Kinford Portal
          </p>
        </div>
      </div>
    </div>
  );
}
