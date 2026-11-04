'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { ResultItem, UserItem, ClassItem } from '@/types/database';
import DataTable, { Column } from '@/components/DataTable';
import Modal from '@/components/Modal';
import { calculateGrade } from '@/lib/utils';
import {
  ClipboardList,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Upload,
  Calendar,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ResultsPage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [students, setStudents] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);

  // Form states
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    student_id: '',
    subject: '',
    score: '' as string | number,
    grade: '',
    date: today,
  });
  const [isGradeManual, setIsGradeManual] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch results with students (users) & classes join
  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('results')
        .select(`
          id,
          student_id,
          subject,
          score,
          grade,
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

      if (error) throw error;
      setResults((data as unknown as ResultItem[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch results';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch students for dropdown
  const fetchStudents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          class_id,
          user_type,
          created_at,
          classes (
            id,
            name,
            section
          )
        `)
        .eq('user_type', 'student')
        .order('name', { ascending: true });

      if (error) throw error;
      setStudents((data as unknown as UserItem[]) || []);
    } catch (err: unknown) {
      console.error('Failed to fetch students:', err);
    }
  }, []);

  // Fetch classes for filter
  const fetchClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, section, created_at')
        .order('name', { ascending: true });

      if (error) throw error;
      setClasses((data as unknown as ClassItem[]) || []);
    } catch (err: unknown) {
      console.error('Failed to fetch classes:', err);
    }
  }, []);

  useEffect(() => {
    fetchResults();
    fetchStudents();
    fetchClasses();
  }, [fetchResults, fetchStudents, fetchClasses]);

  // Extract unique subjects for the filter dropdown
  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.subject) set.add(r.subject);
    });
    return Array.from(set).sort();
  }, [results]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter((res) => {
      // Class filter
      if (selectedClassFilter) {
        const studentClassId = res.students?.class_id;
        if (studentClassId !== selectedClassFilter) return false;
      }
      // Subject filter
      if (selectedSubjectFilter) {
        if (res.subject.toLowerCase() !== selectedSubjectFilter.toLowerCase()) {
          return false;
        }
      }
      // Search query (student name or roll number)
      if (searchStudentQuery.trim()) {
        const q = searchStudentQuery.toLowerCase();
        const studentName = res.students?.name?.toLowerCase() || '';
        const email = res.students?.email?.toLowerCase() || '';
        const subject = res.subject.toLowerCase();
        if (!studentName.includes(q) && !email.includes(q) && !subject.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [results, selectedClassFilter, selectedSubjectFilter, searchStudentQuery]);

  // Score change handler to auto-calculate grade
  const handleScoreChange = (val: string) => {
    const num = val === '' ? '' : parseFloat(val);
    const updated = {
      ...formData,
      score: val,
      grade: isGradeManual
        ? formData.grade
        : typeof num === 'number' && !isNaN(num)
        ? calculateGrade(num)
        : '',
    };
    setFormData(updated);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setIsGradeManual(false);
    setFormData({
      student_id: students.length > 0 ? students[0].id : '',
      subject: '',
      score: '',
      grade: '',
      date: today,
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (result: ResultItem) => {
    setSelectedResult(result);
    setIsGradeManual(true);
    setFormData({
      student_id: result.student_id,
      subject: result.subject,
      score: result.score !== null ? result.score : '',
      grade: result.grade || '',
      date: result.date || today,
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (result: ResultItem) => {
    setSelectedResult(result);
    setIsDeleteModalOpen(true);
  };

  // Submit Add Result
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) {
      toast.error('Please select a student');
      return;
    }
    if (!formData.subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedScore =
        formData.score === '' ? null : parseFloat(String(formData.score));

      const { error } = await supabase.from('results').insert({
        student_id: formData.student_id,
        subject: formData.subject.trim(),
        score: parsedScore,
        grade: formData.grade.trim() || null,
        date: formData.date || today,
      });

      if (error) throw error;
      toast.success('Result published successfully!');
      setIsAddModalOpen(false);
      fetchResults();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish result';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Result
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResult) return;
    if (!formData.subject.trim()) {
      toast.error('Subject is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedScore =
        formData.score === '' ? null : parseFloat(String(formData.score));

      const { error } = await supabase
        .from('results')
        .update({
          student_id: formData.student_id,
          subject: formData.subject.trim(),
          score: parsedScore,
          grade: formData.grade.trim() || null,
          date: formData.date || today,
        })
        .eq('id', selectedResult.id);

      if (error) throw error;
      toast.success('Result updated successfully!');
      setIsEditModalOpen(false);
      fetchResults();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update result';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete Result
  const handleDeleteSubmit = async () => {
    if (!selectedResult) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('results')
        .delete()
        .eq('id', selectedResult.id);

      if (error) throw error;
      toast.success('Result record deleted!');
      setIsDeleteModalOpen(false);
      fetchResults();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete result';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Columns definition
  const columns: Column<ResultItem>[] = [
    {
      header: 'Student Name',
      render: (res) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FFF1F3] text-[#A22538] font-bold text-xs flex items-center justify-center border border-[#A22538]/10 flex-shrink-0">
            {res.students?.name ? res.students.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {res.students?.name || 'Unknown Student'}
            </p>
            {res.students?.email && (
              <p className="text-[11px] text-gray-400 font-mono">
                {res.students.email}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Class',
      render: (res) => {
        const cls = res.students?.classes;
        if (!cls) return <span className="text-gray-400 italic">Unassigned</span>;
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {cls.name} {cls.section ? `(${cls.section})` : ''}
          </span>
        );
      },
    },
    {
      header: 'Subject',
      render: (res) => (
        <span className="font-medium text-gray-900">{res.subject}</span>
      ),
    },
    {
      header: 'Score',
      render: (res) => (
        <span className="font-mono font-semibold text-gray-800">
          {res.score !== null ? `${res.score}%` : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Grade',
      render: (res) => {
        const grade = res.grade || '-';
        const isHigh = grade === 'A+' || grade === 'A';
        const isPass = grade === 'B' || grade === 'C' || grade === 'D';
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isHigh
                ? 'bg-[#FEF7E8] text-[#B8860B] border border-[#EEB540]/30'
                : isPass
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {grade}
          </span>
        );
      },
    },
    {
      header: 'Date',
      render: (res) => (
        <span className="text-xs text-gray-500">
          {res.date || new Date(res.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (res) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenEdit(res)}
            className="p-1.5 text-gray-500 hover:text-[#A22538] hover:bg-rose-50 rounded-lg transition-colors"
            title="Edit result"
            aria-label="Edit result"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenDelete(res)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete result"
            aria-label="Delete result"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Results
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Publish, edit, and review academic test scores and grades.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Disabled Bulk Upload button */}
          <button
            disabled
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed shadow-none"
            title="Bulk CSV / Excel upload coming soon"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Upload — Coming Soon</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Result</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchStudentQuery}
            onChange={(e) => setSearchStudentQuery(e.target.value)}
            placeholder="Search student, roll number, or subject..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 transition-all"
          />
        </div>

        {/* Filter by Class */}
        <div className="w-full md:w-52">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 transition-all"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.section ? `(${c.section})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Subject */}
        <div className="w-full md:w-48">
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 transition-all"
          >
            <option value="">All Subjects</option>
            {uniqueSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Table */}
      <DataTable
        columns={columns}
        data={filteredResults}
        isLoading={isLoading}
        emptyMessage={
          selectedClassFilter || selectedSubjectFilter || searchStudentQuery
            ? 'No results match the selected filters.'
            : 'No published results yet. Click "Add Result" to post a score.'
        }
        keyExtractor={(item) => item.id}
      />

      {/* Add Result Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Publish Result"
        description="Record score and grade for a student."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Student *
            </label>
            <select
              required
              value={formData.student_id}
              onChange={(e) =>
                setFormData({ ...formData, student_id: e.target.value })
              }
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="">Select a student...</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.email}) - {st.classes?.name || 'No Class'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Subject *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="e.g. Mathematics, English Literature, Biology"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.score}
                onChange={(e) => handleScoreChange(e.target.value)}
                placeholder="e.g. 88.5"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Grade
                </label>
                <button
                  type="button"
                  onClick={() => setIsGradeManual(!isGradeManual)}
                  className="text-[10px] text-[#A22538] hover:underline"
                >
                  {isGradeManual ? 'Auto Calc' : 'Manual'}
                </button>
              </div>
              <input
                type="text"
                value={formData.grade}
                onChange={(e) => {
                  setIsGradeManual(true);
                  setFormData({ ...formData, grade: e.target.value });
                }}
                placeholder="e.g. A+"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm uppercase focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Result'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Result Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Result"
        description="Update student mark, grade, or assessment date."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Student *
            </label>
            <select
              required
              value={formData.student_id}
              onChange={(e) =>
                setFormData({ ...formData, student_id: e.target.value })
              }
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="">Select a student...</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Subject *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Score (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.score}
                onChange={(e) => handleScoreChange(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Grade
              </label>
              <input
                type="text"
                value={formData.grade}
                onChange={(e) =>
                  setFormData({ ...formData, grade: e.target.value })
                }
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm uppercase focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Result Record"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="text-xs leading-relaxed">
              Are you sure you want to delete this result entry?
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Subject:{' '}
            <span className="font-semibold text-gray-900">
              {selectedResult?.subject}
            </span>
            <br />
            Student:{' '}
            <span className="font-semibold text-gray-900">
              {selectedResult?.students?.name || 'Selected Student'}
            </span>
          </p>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
