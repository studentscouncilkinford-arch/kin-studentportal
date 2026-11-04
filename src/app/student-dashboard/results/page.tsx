'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { ResultItem } from '@/types/database';
import DataTable, { Column } from '@/components/DataTable';
import { ClipboardList, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentResultsPage() {
  const { session } = useAuth();
  const student = session && session.type === 'student' ? session : null;

  const [results, setResults] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('');

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

  // Unique subjects for filter
  const subjects = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.subject) set.add(r.subject);
    });
    return Array.from(set).sort();
  }, [results]);

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!selectedSubject) return results;
    return results.filter(
      (r) => r.subject.toLowerCase() === selectedSubject.toLowerCase()
    );
  }, [results, selectedSubject]);

  const columns: Column<ResultItem>[] = [
    {
      header: 'Subject',
      render: (r) => (
        <span className="font-semibold text-gray-900">{r.subject}</span>
      ),
    },
    {
      header: 'Score',
      render: (r) => (
        <span className="font-mono font-bold text-gray-800">
          {r.score !== null ? `${r.score}%` : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Grade',
      render: (r) => {
        const grade = r.grade || '-';
        const isHigh = grade === 'A+' || grade === 'A';
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isHigh
                ? 'bg-[#FEF7E8] text-[#B8860B] border border-[#EEB540]/30'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {grade}
          </span>
        );
      },
    },
    {
      header: 'Date',
      render: (r) => (
        <span className="text-xs text-gray-500">
          {r.date || new Date(r.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            My Results
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Official record of your published examination scores and grades.
          </p>
        </div>

        {/* Filter by Subject */}
        {subjects.length > 0 && (
          <div className="w-full sm:w-60">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 shadow-sm"
            >
              <option value="">All Subjects ({results.length})</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Results Data Table */}
      <DataTable
        columns={columns}
        data={filteredResults}
        isLoading={isLoading}
        emptyMessage={
          selectedSubject
            ? `No results recorded for ${selectedSubject}.`
            : 'No examination results published for your profile yet.'
        }
        keyExtractor={(item) => item.id}
      />
    </div>
  );
}
