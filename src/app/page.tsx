'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'admin' | 'user'>('admin');

  // Admin form state
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminError, setAdminError] = useState('');

  // User form state
  const [email, setEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [userError, setUserError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { loginAdmin, loginUser } = useAuth();
  const router = useRouter();

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    if (!adminPassword.trim()) {
      setAdminError('Please enter the admin password');
      return;
    }

    setIsSubmitting(true);
    const success = loginAdmin(adminPassword);
    if (success) {
      toast.success('Welcome back, Admin!');
      router.push('/dashboard');
    } else {
      setAdminError('Incorrect password');
      setIsSubmitting(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!email.trim()) {
      setUserError('Please enter your Kinford email');
      return;
    }
    if (!userPassword) {
      setUserError('Please enter your password');
      return;
    }

    setIsSubmitting(true);
    const res = await loginUser(email, userPassword);
    if (res.success) {
      toast.success('Logged in successfully!');
      router.push('/dashboard');
    } else {
      setUserError(res.error || 'Login failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 py-12">
      {/* Centered Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8 sm:p-10 transition-all">
        {/* Top Logo / Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FFF1F3] text-[#A22538] mb-4 border border-[#A22538]/10 shadow-sm">
            <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#A22538]">
            Kinford
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            Student & Staff Portal
          </p>
        </div>

        {/* Login Role Tabs */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setAdminError('');
              setUserError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'admin'
                ? 'bg-white text-[#A22538] shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Admin Gate
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('user');
              setAdminError('');
              setUserError('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'user'
                ? 'bg-white text-[#A22538] shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Student / Staff
          </button>
        </div>

        {/* Admin Login Form */}
        {activeTab === 'admin' ? (
          <form onSubmit={handleAdminSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2"
              >
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (adminError) setAdminError('');
                  }}
                  placeholder="Enter admin password (kinkin99)"
                  className={`w-full pl-10 pr-11 py-3 bg-white border rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all ${
                    adminError
                      ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-200 focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                >
                  {showAdminPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {adminError && (
                <p className="mt-2 text-xs font-medium text-red-600 animate-in fade-in">
                  {adminError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] active:bg-[#721725] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Logging in...' : 'Login as Admin'}
            </button>
          </form>
        ) : (
          /* User Login Form (Student / Staff) */
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="user-email"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Kinford Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (userError) setUserError('');
                  }}
                  placeholder="e.g. sabitrahmankinford@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="user-pwd"
                className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="user-pwd"
                  type={showUserPassword ? 'text' : 'password'}
                  value={userPassword}
                  onChange={(e) => {
                    setUserPassword(e.target.value);
                    if (userError) setUserError('');
                  }}
                  placeholder="Enter your 8-character password"
                  className="w-full pl-10 pr-11 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowUserPassword(!showUserPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showUserPassword ? 'Hide password' : 'Show password'}
                >
                  {showUserPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {userError && (
                <p className="mt-2 text-xs font-medium text-red-600 animate-in fade-in">
                  {userError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] active:bg-[#721725] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Kinford Student Portal &bull; Secure Authentication
          </p>
        </div>
      </div>
    </div>
  );
}
