'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ResultItem } from '@/types/database';
import { getPrizeBadgeClass } from '@/lib/utils';
import { Trophy, Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentResultsPage() {
  const { session } = useAuth();
  const student = session && session.type === 'student' ? session : null;

  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrizeFilter, setSelectedPrizeFilter] = useState('');

  const fetchResults = useCallback(async () => {
    if (!student?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setResults((data as unknown as ResultItem[]) || []);
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

  // Unique prizes in results for filter
  const uniquePrizes = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.prize) set.add(r.prize);
    });
    return Array.from(set).sort();
  }, [results]);

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!selectedPrizeFilter) return results;
    return results.filter((r) => r.prize === selectedPrizeFilter);
  }, [results, selectedPrizeFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            My Results
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Program and event prizes awarded to your profile.
          </p>
        </div>

        {/* Prize Filter Dropdown */}
        {uniquePrizes.length > 0 && (
          <div className="w-full sm:w-56">
            <select
              value={selectedPrizeFilter}
              onChange={(e) => setSelectedPrizeFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 shadow-sm"
            >
              <option value="">All Prizes ({results.length})</option>
              {uniquePrizes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No results published yet</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Competition and program awards will be posted here by faculty.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResults.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${getPrizeBadgeClass(
                      r.prize
                    )}`}
                  >
                    🏆 {r.prize}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-gray-900 mt-4 group-hover:text-[#A22538] transition-colors leading-snug">
                  {r.program_name}
                </h3>
              </div>

              <div className="mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
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
  );
}
