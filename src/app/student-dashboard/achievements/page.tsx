'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { AchievementItem, AchievementCategory } from '@/types/database';
import { Trophy, Calendar, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentAchievementsPage() {
  const { session } = useAuth();
  const student = session && session.type === 'student' ? session : null;

  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchAchievements = useCallback(async () => {
    if (!student?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('student_id', student.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setAchievements((data as unknown as AchievementItem[]) || []);
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

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') return achievements;
    return achievements.filter((a) => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            My Achievements
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Personal certificates, athletic medals, arts, and leadership milestones.
          </p>
        </div>

        {/* Category Filter */}
        {achievements.length > 0 && (
          <div className="w-full sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 shadow-sm"
            >
              <option value="all">All Categories ({achievements.length})</option>
              <option value="academic">Academic</option>
              <option value="sports">Sports</option>
              <option value="arts">Arts</option>
              <option value="leadership">Leadership</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
      </div>

      {/* Grid of Achievement Cards (Full width on mobile, grid on desktop, read-only) */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredAchievements.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
          <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-2.5" />
          <h3 className="text-base font-bold text-gray-900">No achievements recorded yet</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Official academic, sports, arts, and leadership milestones are awarded and recorded by school faculty.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredAchievements.map((ach) => (
            <div
              key={ach.id}
              className="bg-white border border-gray-200/90 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getCategoryBadgeClass(
                      ach.category
                    )}`}
                  >
                    {ach.category}
                  </span>
                  <Sparkles className="w-4 h-4 text-[#EEB540]/60" />
                </div>

                <h3 className="font-bold text-base text-gray-900 mt-3 group-hover:text-[#A22538] transition-colors leading-snug">
                  {ach.title}
                </h3>
                {ach.description && (
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                    {ach.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {ach.date}
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
