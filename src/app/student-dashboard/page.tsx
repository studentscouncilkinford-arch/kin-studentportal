'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ResultItem, AchievementItem, AchievementCategory } from '@/types/database';
import StatCard from '@/components/StatCard';
import Modal from '@/components/Modal';
import {
  ClipboardList,
  Trophy,
  ArrowRight,
  Plus,
  Calendar,
  Sparkles,
  BookOpen,
  Award,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface ClassAggregatedOverview {
  className: string;
  subject: string;
  avgScore: number;
  maxScore: number;
  count: number;
}

interface LeaderboardEntry {
  rank: number;
  studentId: string;
  name: string;
  avgScore: number;
}

export default function StudentDashboardPage() {
  const { session } = useAuth();
  const student = session && session.type === 'student' ? session : null;

  const [activeTab, setActiveTab] = useState<'personal' | 'overall'>('personal');
  const [isLoading, setIsLoading] = useState(true);

  // Personal data
  const [myResults, setMyResults] = useState<ResultItem[]>([]);
  const [myAchievements, setMyAchievements] = useState<AchievementItem[]>([]);

  // Overall data
  const [overallOverview, setOverallOverview] = useState<ClassAggregatedOverview[]>([]);
  const [topAchievements, setTopAchievements] = useState<AchievementItem[]>([]);
  const [classLeaderboard, setClassLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Add Achievement Modal
  const [isAddAchievementOpen, setIsAddAchievementOpen] = useState(false);
  const [achievementForm, setAchievementForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: 'academic' as AchievementCategory,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!student?.id) return;
    setIsLoading(true);

    try {
      // 1. Fetch student's own results
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

      // 3. Fetch Overall Data: All results with class & student info for aggregated views
      const { data: allResultsData } = await supabase
        .from('results')
        .select(`
          id,
          subject,
          score,
          student_id,
          students:users (
            id,
            name,
            class_id,
            classes (
              id,
              name,
              section
            )
          )
        `);

      if (allResultsData) {
        // Group by class and subject
        const classSubjectMap = new Map<string, { total: number; count: number; max: number; className: string; subject: string }>();
        const studentScoresMap = new Map<string, { total: number; count: number; name: string; classId: string | null }>();

        allResultsData.forEach((r: any) => {
          if (r.score !== null && r.score !== undefined) {
            const cls = r.students?.classes;
            const clsName = cls ? `${cls.name}${cls.section ? ` - ${cls.section}` : ''}` : 'General';
            const key = `${clsName}:::${r.subject}`;

            const current = classSubjectMap.get(key) || {
              total: 0,
              count: 0,
              max: -Infinity,
              className: clsName,
              subject: r.subject,
            };

            current.total += Number(r.score);
            current.count += 1;
            current.max = Math.max(current.max, Number(r.score));
            classSubjectMap.set(key, current);

            // Student leaderboard tracking
            if (r.students?.id) {
              const stId = r.students.id;
              const stEntry = studentScoresMap.get(stId) || {
                total: 0,
                count: 0,
                name: r.students.name,
                classId: r.students.class_id,
              };
              stEntry.total += Number(r.score);
              stEntry.count += 1;
              studentScoresMap.set(stId, stEntry);
            }
          }
        });

        // Convert class aggregations to array
        const aggregated: ClassAggregatedOverview[] = [];
        classSubjectMap.forEach((val) => {
          aggregated.push({
            className: val.className,
            subject: val.subject,
            avgScore: Math.round((val.total / val.count) * 10) / 10,
            maxScore: val.max,
            count: val.count,
          });
        });
        setOverallOverview(aggregated.sort((a, b) => a.className.localeCompare(b.className)));

        // Filter leaderboard for the student's own class
        if (student.classId) {
          const classStudents: LeaderboardEntry[] = [];
          studentScoresMap.forEach((val, id) => {
            if (val.classId === student.classId && val.count > 0) {
              classStudents.push({
                rank: 0,
                studentId: id,
                name: val.name,
                avgScore: Math.round((val.total / val.count) * 10) / 10,
              });
            }
          });

          classStudents.sort((a, b) => b.avgScore - a.avgScore);
          const ranked = classStudents.slice(0, 5).map((entry, idx) => ({
            ...entry,
            rank: idx + 1,
          }));
          setClassLeaderboard(ranked);
        }
      }

      // 4. Fetch Top Achievements school-wide
      const { data: allAchievementsData } = await supabase
        .from('achievements')
        .select(`
          id,
          student_id,
          title,
          description,
          category,
          date,
          created_at,
          users (
            id,
            name,
            email
          )
        `)
        .order('date', { ascending: false })
        .limit(10);

      setTopAchievements((allAchievementsData as unknown as AchievementItem[]) || []);
    } catch (err: unknown) {
      console.error('Error fetching student dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [student]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Add Achievement
  const handleAddAchievementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id) return;
    if (!achievementForm.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('achievements').insert({
        student_id: student.id,
        title: achievementForm.title.trim(),
        description: achievementForm.description.trim() || null,
        date: achievementForm.date || new Date().toISOString().split('T')[0],
        category: achievementForm.category,
      });

      if (error) throw error;

      toast.success('Achievement added!');
      setIsAddAchievementOpen(false);
      setAchievementForm({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category: 'academic',
      });
      fetchDashboardData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add achievement';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="space-y-8 animate-in fade-in duration-200">
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

        {/* View Tabs: Personal | Overall */}
        <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto border border-gray-200/80">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'personal'
                ? 'bg-white text-[#A22538] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Personal
          </button>
          <button
            onClick={() => setActiveTab('overall')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
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
        <div className="space-y-8 animate-in fade-in">
          {/* 2 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <StatCard
              label="My Results"
              value={myResults.length}
              icon={ClipboardList}
              subtext="Published term scores"
              isLoading={isLoading}
            />
            <StatCard
              label="My Achievements"
              value={myAchievements.length}
              icon={Trophy}
              subtext="Personal awards & recognitions"
              isLoading={isLoading}
            />
          </div>

          {/* Section: My Recent Results */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
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
                <div className="space-y-3 py-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : myResults.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No results published yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Grade</th>
                        <th className="px-4 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {myResults.slice(0, 5).map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{r.subject}</td>
                          <td className="px-4 py-3 font-mono font-medium text-gray-700">
                            {r.score !== null ? `${r.score}%` : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#FEF7E8] text-[#B8860B] border border-[#EEB540]/30">
                              {r.grade || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            {r.date || new Date(r.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Section: My Achievements */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-4 h-4 text-[#EEB540]" />
                <h2 className="text-base font-bold text-gray-900">My Achievements</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAddAchievementOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Achievement</span>
                </button>
                <Link
                  href="/student-dashboard/achievements"
                  className="text-xs font-semibold text-[#A22538] hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="mt-5">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : myAchievements.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No achievements yet.</p>
                  <button
                    onClick={() => setIsAddAchievementOpen(true)}
                    className="mt-3 text-xs font-semibold text-[#A22538] hover:underline"
                  >
                    Add your first achievement &rarr;
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myAchievements.slice(0, 4).map((ach) => (
                    <div
                      key={ach.id}
                      className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl hover:bg-white hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-gray-900">{ach.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                            ach.category
                          )}`}
                        >
                          {ach.category}
                        </span>
                      </div>
                      {ach.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ach.description}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-3 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {ach.date}
                      </p>
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
        <div className="space-y-8 animate-in fade-in">
          {/* Class Results Overview */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <BarChart3 className="w-4 h-4 text-[#A22538]" />
              <div>
                <h2 className="text-base font-bold text-gray-900">Class Results Overview</h2>
                <p className="text-xs text-gray-500">Average and top scores across academic classes</p>
              </div>
            </div>

            <div className="mt-4">
              {overallOverview.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No aggregated scores available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Average Score</th>
                        <th className="px-4 py-3">Highest Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {overallOverview.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{item.className}</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{item.subject}</td>
                          <td className="px-4 py-3 font-mono font-bold text-gray-900">{item.avgScore}%</td>
                          <td className="px-4 py-3">
                            <span className="font-mono font-bold text-[#A22538] bg-[#FFF1F3] px-2 py-0.5 rounded border border-[#A22538]/20 text-xs">
                              {item.maxScore}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Class Leaderboard */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <TrendingUp className="w-4 h-4 text-[#EEB540]" />
              <div>
                <h2 className="text-base font-bold text-gray-900">Class Leaderboard</h2>
                <p className="text-xs text-gray-500">Top students by average score in your class</p>
              </div>
            </div>

            <div className="mt-4">
              {classLeaderboard.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  Not enough results to show rankings.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 w-16">Rank</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Average Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {classLeaderboard.map((entry) => {
                        const isTop = entry.rank === 1;
                        return (
                          <tr key={entry.studentId} className="hover:bg-gray-50/70 transition-colors">
                            <td className="px-4 py-3">
                              <span
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isTop
                                    ? 'bg-[#FEF7E8] text-[#B8860B] border border-[#EEB540]'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                #{entry.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
                              <span>{entry.name}</span>
                              {entry.studentId === student?.id && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                  You
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-[#A22538]">{entry.avgScore}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Top Achievements School-wide */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <div>
                <h2 className="text-base font-bold text-gray-900">Top Achievements</h2>
                <p className="text-xs text-gray-500">Recent student achievements across Kinford</p>
              </div>
            </div>

            <div className="mt-4">
              {topAchievements.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No achievements recorded yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {topAchievements.map((ach) => (
                    <div key={ach.id} className="py-3 px-2 flex items-start justify-between gap-3 hover:bg-gray-50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#A22538]">{ach.users?.name || 'Student'}</p>
                          <span className="text-xs text-gray-400">&bull;</span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[10px] font-bold uppercase border ${getCategoryBadgeClass(
                              ach.category
                            )}`}
                          >
                            {ach.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900 mt-1">{ach.title}</h4>
                        {ach.description && <p className="text-xs text-gray-500 mt-0.5">{ach.description}</p>}
                      </div>
                      <span className="text-[11px] text-gray-400 flex-shrink-0 mt-1">{ach.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Achievement Modal */}
      <Modal
        isOpen={isAddAchievementOpen}
        onClose={() => setIsAddAchievementOpen(false)}
        title="Add Achievement"
        description="Record an academic, sports, art, or leadership milestone."
      >
        <form onSubmit={handleAddAchievementSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Title *
            </label>
            <input
              type="text"
              required
              value={achievementForm.title}
              onChange={(e) => setAchievementForm({ ...achievementForm, title: e.target.value })}
              placeholder="e.g. Won Science Quiz"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={achievementForm.category}
              onChange={(e) =>
                setAchievementForm({ ...achievementForm, category: e.target.value as AchievementCategory })
              }
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="academic">Academic</option>
              <option value="sports">Sports</option>
              <option value="arts">Arts</option>
              <option value="leadership">Leadership</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={achievementForm.description}
              onChange={(e) => setAchievementForm({ ...achievementForm, description: e.target.value })}
              placeholder="e.g. 1st place in inter-school science quiz"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={achievementForm.date}
              onChange={(e) => setAchievementForm({ ...achievementForm, date: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddAchievementOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Achievement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
