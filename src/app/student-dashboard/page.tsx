'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ResultItem, AchievementItem, AchievementCategory } from '@/types/database';
import StatCard from '@/components/StatCard';
import { getPrizeBadgeClass } from '@/lib/utils';
import {
  ClipboardList,
  Trophy,
  ArrowRight,
  Calendar,
  Sparkles,
  Users,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { session } = useAuth();
  const student = session && session.type === 'student' ? session : null;

  const [activeTab, setActiveTab] = useState<'personal' | 'overall'>('personal');
  const [isLoading, setIsLoading] = useState(true);

  // Personal data
  const [myResults, setMyResults] = useState<ResultItem[]>([]);
  const [myAchievements, setMyAchievements] = useState<AchievementItem[]>([]);

  // Overall data (Latest 10 across all students)
  const [overallResults, setOverallResults] = useState<ResultItem[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!student?.id) return;
    setIsLoading(true);

    try {
      // 1. Fetch student's own program results
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false });

      if (resultsError) throw resultsError;
      setMyResults((resultsData as unknown as ResultItem[]) || []);

      // 2. Fetch student's own achievements
      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false });

      if (achievementsError) throw achievementsError;
      setMyAchievements((achievementsData as unknown as AchievementItem[]) || []);

      // 3. Fetch Overall Recent Results across ALL students (latest 10)
      const { data: allResultsData, error: allResultsError } = await supabase
        .from('results')
        .select(`
          id,
          student_id,
          program_name,
          prize,
          date,
          created_at,
          students:users (
            id,
            name,
            email,
            class_id,
            classes (
              id,
              name,
              section
            )
          )
        `)
        .order('date', { ascending: false })
        .limit(10);

      if (allResultsError) throw allResultsError;
      setOverallResults((allResultsData as unknown as ResultItem[]) || []);
    } catch (err: unknown) {
      console.error('Error fetching student dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [student]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getCategoryBadgeClass = (category: AchievementCategory) => {
    switch (category) {
      case 'academic':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'sports':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'arts':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'leadership':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome Header */}
      <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Welcome, {student?.name || 'Student'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Class: <span className="text-[#A22538] font-semibold">{student?.className || 'Assigned Class'}</span>
          </p>
        </div>

        {/* View Tabs: Personal | Overall (full width pills on mobile) */}
        <div className="grid grid-cols-2 w-full sm:w-auto bg-gray-100 p-1 rounded-xl border border-gray-200/80">
          <button
            onClick={() => setActiveTab('personal')}
            className={`py-2 px-4 text-xs font-bold rounded-lg text-center transition-all ${
              activeTab === 'personal'
                ? 'bg-white text-[#A22538] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Personal
          </button>
          <button
            onClick={() => setActiveTab('overall')}
            className={`py-2 px-4 text-xs font-bold rounded-lg text-center transition-all ${
              activeTab === 'overall'
                ? 'bg-white text-[#A22538] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overall
          </button>
        </div>
      </div>

      {/* ================= PERSONAL TAB ================= */}
      {activeTab === 'personal' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* 2 Stat Cards (stack vertically 1-per-row on mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              label="My Results"
              value={myResults.length}
              icon={ClipboardList}
              subtext="Program & competition prizes"
              isLoading={isLoading}
            />
            <StatCard
              label="My Achievements"
              value={myAchievements.length}
              icon={Trophy}
              subtext="Awards & milestones awarded"
              isLoading={isLoading}
            />
          </div>

          {/* Section: My Recent Results (last 5, as cards) */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4 text-[#A22538]" />
                <h2 className="text-base font-bold text-gray-900">My Recent Results</h2>
              </div>
              <Link
                href="/student-dashboard/results"
                className="text-xs font-semibold text-[#A22538] hover:underline inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : myResults.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No results published yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myResults.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-white hover:shadow-sm transition-all"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{r.program_name}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>{r.date || new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="self-start sm:self-auto flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPrizeBadgeClass(
                            r.prize
                          )}`}
                        >
                          🏆 {r.prize}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section: My Achievements (last 5, as cards, read-only) */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 text-[#EEB540]" />
                <h2 className="text-base font-bold text-gray-900">My Achievements</h2>
              </div>
              <Link
                href="/student-dashboard/achievements"
                className="text-xs font-semibold text-[#A22538] hover:underline inline-flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : myAchievements.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No achievements recorded yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Achievements are awarded and recorded by school faculty.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {myAchievements.slice(0, 5).map((ach) => (
                    <div
                      key={ach.id}
                      className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm text-gray-900 leading-snug">{ach.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex-shrink-0 ${getCategoryBadgeClass(
                              ach.category
                            )}`}
                          >
                            {ach.category}
                          </span>
                        </div>
                        {ach.description && (
                          <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
                            {ach.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center text-[11px] text-gray-400 font-medium">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>{ach.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= OVERALL TAB ================= */}
      {activeTab === 'overall' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="pb-4 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#A22538]" />
                <div>
                  <h2 className="text-base font-bold text-gray-900">Recent Results Across All Students</h2>
                  <p className="text-xs text-gray-500">Latest 10 competition and program awards published</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                Latest 10
              </span>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : overallResults.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No results recorded yet across students.</p>
                </div>
              ) : (
                <>
                  {/* Mobile stacked card layout (< 768px) */}
                  <div className="space-y-3 md:hidden">
                    {overallResults.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-2 hover:bg-white hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-[#A22538]">
                              {item.students?.name || 'Student'}
                            </p>
                            {item.students?.classes?.name && (
                              <p className="text-[11px] text-gray-400 font-medium">
                                Class: {item.students.classes.name}
                                {item.students.classes.section ? ` - ${item.students.classes.section}` : ''}
                              </p>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPrizeBadgeClass(
                              item.prize
                            )}`}
                          >
                            🏆 {item.prize}
                          </span>
                        </div>
                        <div className="pt-1 flex items-baseline justify-between gap-2">
                          <h4 className="text-sm font-semibold text-gray-900 leading-snug">
                            {item.program_name}
                          </h4>
                        </div>
                        <div className="flex items-center text-[11px] text-gray-400 font-medium pt-1 border-t border-gray-100">
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>{item.date || new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table layout (≥ 768px) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Student Name</th>
                          <th className="px-4 py-3">Program / Event</th>
                          <th className="px-4 py-3">Prize</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {overallResults.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {item.students?.name || 'Student'}
                              {item.students?.classes?.name && (
                                <span className="ml-2 text-xs font-normal text-gray-400">
                                  ({item.students.classes.name}
                                  {item.students.classes.section ? ` - ${item.students.classes.section}` : ''})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-800 font-medium">{item.program_name}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPrizeBadgeClass(
                                  item.prize
                                )}`}
                              >
                                🏆 {item.prize}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {item.date || new Date(item.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
