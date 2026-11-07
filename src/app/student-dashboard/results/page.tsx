'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ResultItem } from '@/types/database';
import { getPrizeBadgeClass } from '@/lib/utils';
import { Trophy, Calendar, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentResultsPage() {
  const { session } = useAuth();
  const student = session && session.type === 'student' ? session : null;

  const [activeTab, setActiveTab] = useState<'my' | 'general'>('my');
  const [isLoading, setIsLoading] = useState(true);

  // My results
  const [myResults, setMyResults] = useState<ResultItem[]>([]);
  const [myPrizeFilter, setMyPrizeFilter] = useState('');

  // General results (all students)
  const [allResults, setAllResults] = useState<ResultItem[]>([]);
  const [generalSearch, setGeneralSearch] = useState('');
  const [generalPrizeFilter, setGeneralPrizeFilter] = useState('');

  // Fetch results
  const fetchResults = useCallback(async () => {
    if (!student?.id) return;
    setIsLoading(true);

    try {
      // 1. Fetch THIS student's results
      const { data: myData, error: myError } = await supabase
        .from('results')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false });

      if (myError) throw myError;
      setMyResults((myData as unknown as ResultItem[]) || []);

      // 2. Fetch ALL results across all students/programs
      const { data: allData, error: allError } = await supabase
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
        .order('date', { ascending: false });

      if (allError) throw allError;
      setAllResults((allData as unknown as ResultItem[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch results';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [student]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Unique prizes for filter in My Results
  const uniqueMyPrizes = useMemo(() => {
    const set = new Set<string>();
    myResults.forEach((r) => {
      if (r.prize) set.add(r.prize);
    });
    return Array.from(set).sort();
  }, [myResults]);

  // Filtered My Results
  const filteredMyResults = useMemo(() => {
    if (!myPrizeFilter) return myResults;
    return myResults.filter((r) => r.prize === myPrizeFilter);
  }, [myResults, myPrizeFilter]);

  // Filtered General Results (search by program name or student name)
  const filteredGeneralResults = useMemo(() => {
    const q = generalSearch.trim().toLowerCase();
    return allResults.filter((r) => {
      const matchesSearch =
        !q ||
        r.program_name.toLowerCase().includes(q) ||
        (r.students?.name && r.students.name.toLowerCase().includes(q)) ||
        (r.students?.classes?.name && r.students.classes.name.toLowerCase().includes(q));

      const matchesPrize = !generalPrizeFilter || r.prize === generalPrizeFilter;

      return matchesSearch && matchesPrize;
    });
  }, [allResults, generalSearch, generalPrizeFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header + Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Results
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Academic competitions, sports events, and program awards.
          </p>
        </div>

        {/* My Results / General Toggle Tabs (Full width on mobile) */}
        <div className="grid grid-cols-2 w-full sm:w-auto bg-gray-100 p-1 rounded-xl border border-gray-200/80">
          <button
            onClick={() => setActiveTab('my')}
            className={`py-2 px-4 text-xs font-bold rounded-lg text-center transition-all ${
              activeTab === 'my'
                ? 'bg-white text-[#A22538] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Results {myResults.length > 0 && `(${myResults.length})`}
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-4 text-xs font-bold rounded-lg text-center transition-all ${
              activeTab === 'general'
                ? 'bg-white text-[#A22538] shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            General {allResults.length > 0 && `(${allResults.length})`}
          </button>
        </div>
      </div>

      {/* ================= MY RESULTS TAB ================= */}
      {activeTab === 'my' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Optional Filter */}
          {uniqueMyPrizes.length > 0 && (
            <div className="flex items-center justify-end">
              <div className="w-full sm:w-56">
                <select
                  value={myPrizeFilter}
                  onChange={(e) => setMyPrizeFilter(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 shadow-sm"
                >
                  <option value="">All Prizes ({myResults.length})</option>
                  {uniqueMyPrizes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Results Display */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredMyResults.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
              <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
              <h3 className="text-base font-bold text-gray-900">No results published yet</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Program awards and competition results awarded to your profile will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMyResults.map((r) => (
                <div
                  key={r.id}
                  className="bg-white border border-gray-200/90 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPrizeBadgeClass(
                          r.prize
                        )}`}
                      >
                        🏆 {r.prize}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-gray-900 mt-3 group-hover:text-[#A22538] transition-colors leading-snug">
                      {r.program_name}
                    </h3>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {r.date || new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[#EEB540] font-bold">&bull;&bull;&bull;</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= GENERAL TAB ================= */}
      {activeTab === 'general' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Search bar & filter controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name or program name..."
                value={generalSearch}
                onChange={(e) => setGeneralSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 shadow-sm"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={generalPrizeFilter}
                onChange={(e) => setGeneralPrizeFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 shadow-sm"
              >
                <option value="">All Prizes</option>
                <option value="1st Prize">1st Prize</option>
                <option value="2nd Prize">2nd Prize</option>
                <option value="3rd Prize">3rd Prize</option>
                <option value="Participation">Participation</option>
                <option value="Special Mention">Special Mention</option>
                <option value="Best Performance">Best Performance</option>
              </select>
            </div>
          </div>

          {/* Results Count Info */}
          <div className="text-xs text-gray-500 font-medium px-1 flex items-center justify-between">
            <span>Showing {filteredGeneralResults.length} published results</span>
            <span>Sorted by newest</span>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredGeneralResults.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
              <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
              <h3 className="text-base font-bold text-gray-900">No results found</h3>
              <p className="text-xs text-gray-400 mt-1">
                {generalSearch
                  ? 'No results match your search query.'
                  : 'No competition or program results have been posted yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE STACKED CARDS (< 768px) - Clean, full-width, touch-friendly */}
              <div className="space-y-3 md:hidden">
                {filteredGeneralResults.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-white border border-gray-200/90 rounded-xl shadow-sm hover:shadow transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#A22538] truncate">
                          {r.students?.name || 'Student'}
                        </p>
                        {r.students?.classes?.name && (
                          <p className="text-[11px] text-gray-400 font-medium">
                            Class: {r.students.classes.name}
                            {r.students.classes.section ? ` - ${r.students.classes.section}` : ''}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${getPrizeBadgeClass(
                          r.prize
                        )}`}
                      >
                        🏆 {r.prize}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-gray-900 leading-snug">
                      {r.program_name}
                    </h4>

                    <div className="flex items-center text-[11px] text-gray-400 font-medium pt-2 border-t border-gray-100">
                      <Calendar className="w-3 h-3 mr-1" />
                      <span>{r.date || new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE (≥ 768px) */}
              <div className="hidden md:block bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Student Name</th>
                      <th className="px-5 py-3.5">Class</th>
                      <th className="px-5 py-3.5">Program / Event</th>
                      <th className="px-5 py-3.5">Prize</th>
                      <th className="px-5 py-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredGeneralResults.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-gray-900">
                          {r.students?.name || 'Student'}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-600 font-medium">
                          {r.students?.classes?.name ? (
                            <span>
                              {r.students.classes.name}
                              {r.students.classes.section ? ` - ${r.students.classes.section}` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-800">
                          {r.program_name}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getPrizeBadgeClass(
                              r.prize
                            )}`}
                          >
                            🏆 {r.prize}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-gray-500 font-medium">
                          {r.date || new Date(r.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
