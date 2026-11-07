'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { AchievementItem, UserItem, ClassItem, AchievementCategory } from '@/types/database';
import DataTable, { Column } from '@/components/DataTable';
import Modal from '@/components/Modal';
import StatCard from '@/components/StatCard';
import {
  Trophy,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Calendar,
  Sparkles,
  Award,
  Medal,
  GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES: { value: AchievementCategory; label: string }[] = [
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'arts', label: 'Arts' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'other', label: 'Other' },
];

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [students, setStudents] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

  // Form states
  const today = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState<{
    student_id: string;
    title: string;
    description: string;
    category: AchievementCategory;
    date: string;
  }>({
    student_id: '',
    title: '',
    description: '',
    category: 'academic',
    date: today,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all achievements
  const fetchAchievements = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select(`
          id,
          student_id,
          title,
          description,
          category,
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
      setAchievements((data as unknown as AchievementItem[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch achievements';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch students and classes for dropdowns and filters
  const fetchMetadata = useCallback(async () => {
    try {
      const [studentsRes, classesRes] = await Promise.all([
        supabase
          .from('users')
          .select(`
            id,
            name,
            email,
            password_hash,
            user_type,
            class_id,
            access_classes,
            access_results,
            created_at,
            classes (
              id,
              name,
              section
            )
          `)
          .eq('user_type', 'student')
          .order('name', { ascending: true }),
        supabase.from('classes').select('*').order('name', { ascending: true }),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (classesRes.error) throw classesRes.error;

      setStudents((studentsRes.data as unknown as UserItem[]) || []);
      setClasses((classesRes.data as ClassItem[]) || []);
    } catch (err: unknown) {
      console.error('Error fetching students and classes:', err);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
    fetchMetadata();
  }, [fetchAchievements, fetchMetadata]);

  // Category badge colors
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

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    return achievements.filter((item) => {
      // Class filter
      if (selectedClassFilter) {
        const studentClassId = item.students?.class_id || item.users?.class_id;
        if (studentClassId !== selectedClassFilter) return false;
      }
      // Student filter
      if (selectedStudentFilter) {
        if (item.student_id !== selectedStudentFilter) return false;
      }
      // Category filter
      if (selectedCategoryFilter) {
        if (item.category !== selectedCategoryFilter) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studentName = (item.students?.name || item.users?.name || '').toLowerCase();
        const title = item.title.toLowerCase();
        const desc = (item.description || '').toLowerCase();
        if (!studentName.includes(q) && !title.includes(q) && !desc.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [achievements, selectedClassFilter, selectedStudentFilter, selectedCategoryFilter, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      student_id: students.length > 0 ? students[0].id : '',
      title: '',
      description: '',
      category: 'academic',
      date: today,
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ach: AchievementItem) => {
    setSelectedAchievement(ach);
    setFormData({
      student_id: ach.student_id,
      title: ach.title,
      description: ach.description || '',
      category: ach.category,
      date: ach.date || today,
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (ach: AchievementItem) => {
    setSelectedAchievement(ach);
    setIsDeleteModalOpen(true);
  };

  // Submit Add Achievement
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) {
      toast.error('Please select a student');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('achievements').insert({
        student_id: formData.student_id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        date: formData.date || today,
      });

      if (error) throw error;
      toast.success('Achievement recorded successfully!');
      setIsAddModalOpen(false);
      fetchAchievements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save achievement';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Achievement
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAchievement) return;
    if (!formData.student_id) {
      toast.error('Please select a student');
      return;
    }
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('achievements')
        .update({
          student_id: formData.student_id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          date: formData.date || today,
        })
        .eq('id', selectedAchievement.id);

      if (error) throw error;
      toast.success('Achievement updated successfully!');
      setIsEditModalOpen(false);
      fetchAchievements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update achievement';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedAchievement) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('achievements')
        .delete()
        .eq('id', selectedAchievement.id);

      if (error) throw error;
      toast.success('Achievement deleted');
      setIsDeleteModalOpen(false);
      fetchAchievements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete achievement';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Columns for DataTable
  const columns: Column<AchievementItem>[] = [
    {
      header: 'Student',
      render: (row) => {
        const studentObj = row.students || row.users;
        const className = studentObj?.classes
          ? `${studentObj.classes.name}${studentObj.classes.section ? ` - ${studentObj.classes.section}` : ''}`
          : '—';

        return (
          <div>
            <span className="font-semibold text-gray-900 block">
              {studentObj?.name || 'Unknown Student'}
            </span>
            <span className="text-xs text-gray-400 font-medium">Class: {className}</span>
          </div>
        );
      },
    },
    {
      header: 'Category',
      render: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getCategoryBadgeClass(
            row.category
          )}`}
        >
          {row.category}
        </span>
      ),
    },
    {
      header: 'Achievement Title & Details',
      render: (row) => (
        <div className="max-w-md">
          <p className="font-bold text-gray-900 text-sm leading-snug">{row.title}</p>
          {row.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {row.description}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Date',
      render: (row) => (
        <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
          {row.date || new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-gray-500 hover:text-[#A22538] hover:bg-rose-50 rounded-lg transition-colors"
            title="Edit achievement"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenDelete(row)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete achievement"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Achievements
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage, record, and recognize student accomplishments across academics, sports, and arts.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Achievement</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label="Total Achievements"
          value={achievements.length}
          icon={Trophy}
          subtext="Total milestones awarded"
          isLoading={isLoading}
        />
        <StatCard
          label="Academic"
          value={achievements.filter((a) => a.category === 'academic').length}
          icon={GraduationCap}
          subtext="Exams, quizzes & olympiads"
          isLoading={isLoading}
        />
        <StatCard
          label="Sports"
          value={achievements.filter((a) => a.category === 'sports').length}
          icon={Medal}
          subtext="Athletics & tournaments"
          isLoading={isLoading}
        />
        <StatCard
          label="Arts & Leadership"
          value={
            achievements.filter((a) => a.category === 'arts' || a.category === 'leadership').length
          }
          icon={Sparkles}
          subtext="Creative & council roles"
          isLoading={isLoading}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title or student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          {/* Filter by Category */}
          <div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Class */}
          <div>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section ? `(${cls.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Student */}
          <div>
            <select
              value={selectedStudentFilter}
              onChange={(e) => setSelectedStudentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="">All Students</option>
              {students.map((std) => (
                <option key={std.id} value={std.id}>
                  {std.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredAchievements}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No achievements found matching your filters."
      />

      {/* Add Achievement Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Student Achievement"
        description="Record an official milestone or award for a student."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Select Student *
            </label>
            <select
              required
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="" disabled>
                -- Choose a student --
              </option>
              {students.map((std) => (
                <option key={std.id} value={std.id}>
                  {std.name} {std.classes ? `(${std.classes.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Achievement Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. 1st Place in Regional Science Bowl"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as AchievementCategory })
                }
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Provide context, event details, or specific honor details..."
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
              {isSubmitting ? 'Saving...' : 'Add Achievement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Achievement Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Achievement"
        description="Update achievement details or reassign to another student."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Select Student *
            </label>
            <select
              required
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              {students.map((std) => (
                <option key={std.id} value={std.id}>
                  {std.name} {std.classes ? `(${std.classes.name})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Achievement Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as AchievementCategory })
                }
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        title="Delete Achievement"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="text-xs leading-relaxed">
              Are you sure you want to delete this achievement? This action cannot be undone.
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-1">
            <p className="text-gray-600 text-xs font-medium">Achievement:</p>
            <p className="font-bold text-gray-900">{selectedAchievement?.title}</p>
            <p className="text-xs text-gray-500">
              Student: {selectedAchievement?.students?.name || selectedAchievement?.users?.name || '—'}
            </p>
          </div>

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
