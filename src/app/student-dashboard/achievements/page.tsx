'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ResultItem } from '@/types/database';
import {
  Trophy,
  Award,
  Sparkles,
  Calendar,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const PRIZE_OPTIONS = [
  'All Prizes',
  '1st Prize',
  '2nd Prize',
  '3rd Prize',
  'Participation',
  'Special Mention',
  'Best Performance',
];

export default function StudentAchievementsPage() {
  const { session } = useAuth();
  const student = session && session.type === 'student' ? session : null;

  const [myResults, setMyResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrizeFilter, setSelectedPrizeFilter] = useState<string>('All Prizes');

  // Fetch student's own results from the results table
  const fetchAchievements = useCallback(async () => {
    if (!student?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('results')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setMyResults((data as unknown as ResultItem[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch achievements';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [student]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Format date nicely (e.g. "29 Sep 2026")
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'N/A';
    try {
      // Adding T00:00:00 prevents timezone shifting
      const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper for prize badge and left border color
  const getPrizeDetails = (prize: string) => {
    switch (prize) {
      case '1st Prize':
        return {
          label: '🏆 1st Prize',
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
          borderColor: 'border-l-[#EEB540]',
        };
      case '2nd Prize':
        return {
          label: '🥈 2nd Prize',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold',
          borderColor: 'border-l-[#A8A8A8]',
        };
      case '3rd Prize':
        return {
          label: '🥉 3rd Prize',
          badgeClass: 'bg-amber-900/10 text-amber-950 border-amber-700/30 font-semibold',
          borderColor: 'border-l-[#CD7F32]',
        };
      case 'Participation':
        return {
          label: '🎖️ Participation',
          badgeClass: 'bg-gray-100 text-gray-700 border-gray-200 font-medium',
          borderColor: 'border-l-[#A22538]',
        };
      case 'Special Mention':
        return {
          label: '⭐ Special Mention',
          badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200 font-medium',
          borderColor: 'border-l-[#A22538]',
        };
      case 'Best Performance':
        return {
          label: '🏅 Best Performance',
          badgeClass: 'bg-[#FFF1F3] text-[#A22538] border-[#A22538]/30 font-bold',
          borderColor: 'border-l-[#A22538]',
        };
      default:
        return {
          label: `🏆 ${prize}`,
          badgeClass: 'bg-gray-100 text-gray-700 border-gray-200 font-medium',
          borderColor: 'border-l-[#A22538]',
        };
    }
  };

  // Stats calculation
  const totalAchievements = myResults.length;
  const firstPrizesCount = useMemo(
    () => myResults.filter((r) => r.prize === '1st Prize').length,
    [myResults]
  );
  const programsCount = useMemo(
    () => new Set(myResults.map((r) => r.program_name.trim().toLowerCase())).size,
    [myResults]
  );

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    if (selectedPrizeFilter === 'All Prizes') return myResults;
    return myResults.filter((r) => r.prize === selectedPrizeFilter);
  }, [myResults, selectedPrizeFilter]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Achievements
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Personal awards, competition rankings, and event milestones.
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="w-full sm:w-56">
          <select
            value={selectedPrizeFilter}
            onChange={(e) => setSelectedPrizeFilter(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 shadow-sm"
          >
            {PRIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3 Stats Summary Boxes (Maroon/Gold Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Achievements */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Achievements
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              {isLoading ? '—' : totalAchievements}
            </h3>
            <p className="text-[11px] text-[#A22538] font-semibold mt-0.5">
              Prizes & recognitions
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#A22538]/10 text-[#A22538] flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* 1st Prizes */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              1st Prizes
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              {isLoading ? '—' : firstPrizesCount}
            </h3>
            <p className="text-[11px] text-[#B8860B] font-semibold mt-0.5">
              Top-tier finishes
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#EEB540] flex items-center justify-center border border-amber-200/60">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Programs Participated */}
        <div className="bg-white border border-gray-200/90 rounded-xl p-4 sm:p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Programs Participated
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
              {isLoading ? '—' : programsCount}
            </h3>
            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
              Distinct competitions
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#FFF1F3] text-[#A22538] flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Achievement Cards (2 columns on desktop, 1 on mobile) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredAchievements.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <Trophy className="w-12 h-12 text-gray-300 stroke-[1.5] mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No achievements yet</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Your prizes and recognitions from programs will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAchievements.map((item) => {
            const { label, badgeClass, borderColor } = getPrizeDetails(item.prize);

            return (
              <div
                key={item.id}
                className={`bg-white border border-gray-200/90 ${borderColor} border-l-4 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group`}
              >
                <div>
                  {/* Prize Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${badgeClass}`}
                    >
                      {label}
                    </span>
                  </div>

                  {/* Program Name */}
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 mt-3 group-hover:text-[#A22538] transition-colors leading-snug">
                    {item.program_name}
                  </h3>
                </div>

                {/* Formatted Date */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDate(item.date || item.created_at)}</span>
                  </span>
                  <span className="text-gray-300 font-bold">&bull;&bull;&bull;</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
