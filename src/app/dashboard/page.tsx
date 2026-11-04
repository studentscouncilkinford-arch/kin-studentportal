'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/StatCard';
import {
  Users,
  GraduationCap,
  ClipboardList,
  Clock,
  RefreshCw,
  PlusCircle,
  ArrowRight,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    resultsPublished: 0,
    pendingReviews: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsRes, classesRes, resultsRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('user_type', 'student'),
        supabase.from('classes').select('*', { count: 'exact', head: true }),
        supabase.from('results').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalStudents: studentsRes.count ?? 0,
        totalClasses: classesRes.count ?? 0,
        resultsPublished: resultsRes.count ?? 0,
        pendingReviews: 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Welcome, Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of students, academic classes, and published results.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 Stat Cards in a row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          icon={Users}
          subtext="Enrolled student profiles"
          isLoading={isLoading}
        />
        <StatCard
          label="Total Classes"
          value={stats.totalClasses}
          icon={GraduationCap}
          subtext="Active academic sections"
          isLoading={isLoading}
        />
        <StatCard
          label="Results Published"
          value={stats.resultsPublished}
          icon={ClipboardList}
          subtext="Program prizes awarded"
          isLoading={isLoading}
        />
        <StatCard
          label="Pending Reviews"
          value={stats.pendingReviews}
          icon={Clock}
          subtext="Items awaiting review"
          isLoading={isLoading}
        />
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/users"
          className="group p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#A22538]/40 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF1F3] text-[#A22538] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#A22538] transition-colors">
                Manage Students
              </h3>
              <p className="text-xs text-gray-500">Add or edit student records</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#A22538] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/classes"
          className="group p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#A22538]/40 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF1F3] text-[#A22538] flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#A22538] transition-colors">
                Manage Classes
              </h3>
              <p className="text-xs text-gray-500">Configure grades & sections</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#A22538] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/results"
          className="group p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#A22538]/40 hover:shadow-md transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#FFF1F3] text-[#A22538] flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#A22538] transition-colors">
                Publish Results
              </h3>
              <p className="text-xs text-gray-500">Award competition & program prizes</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#A22538] group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-[#A22538]" />
            <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
          </div>
          <span className="text-xs text-gray-400 font-medium">Real-time log</span>
        </div>

        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-gray-600">No recent activity</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm">
            Activity logs for new student additions, class updates, and published marks will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
