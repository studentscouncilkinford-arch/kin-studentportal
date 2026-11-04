'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { AchievementItem, AchievementCategory } from '@/types/database';
import Modal from '@/components/Modal';
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function StudentAchievementsPage() {
  const { session } = useAuth();
  const student = session && session.type === 'student' ? session : null;

  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

  // Forms
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: 'academic' as AchievementCategory,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Open Add Modal
  const handleOpenAdd = () => {
    setForm({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      category: 'academic',
    });
    setIsAddOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ach: AchievementItem) => {
    setSelectedAchievement(ach);
    setForm({
      title: ach.title,
      description: ach.description || '',
      date: ach.date || new Date().toISOString().split('T')[0],
      category: ach.category,
    });
    setIsEditOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (ach: AchievementItem) => {
    setSelectedAchievement(ach);
    setIsDeleteOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id) return;
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('achievements').insert({
        student_id: student.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        date: form.date,
        category: form.category,
      });

      if (error) throw error;
      toast.success('Achievement added!');
      setIsAddOpen(false);
      fetchAchievements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add achievement';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAchievement) return;
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('achievements')
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          date: form.date,
          category: form.category,
        })
        .eq('id', selectedAchievement.id);

      if (error) throw error;
      toast.success('Achievement updated!');
      setIsEditOpen(false);
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
      toast.success('Achievement removed');
      setIsDeleteOpen(false);
      fetchAchievements();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete achievement';
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            My Achievements
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Personal certificates, athletic medals, arts, and leadership milestones.
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

      {/* Grid of Achievement Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : achievements.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No achievements recorded yet</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            You can add any academic, sports, arts, or community milestones you have achieved.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Achievement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(ach)}
                      className="p-1 text-gray-400 hover:text-[#A22538] hover:bg-rose-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDelete(ach)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-base text-gray-900 mt-3 group-hover:text-[#A22538] transition-colors">
                  {ach.title}
                </h3>
                {ach.description && (
                  <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
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

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Achievement"
        description="Share a personal accomplishment or milestone."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
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
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as AchievementCategory })
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
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
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

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Achievement"
        description="Update achievement details."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Title *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as AchievementCategory })
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
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
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
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Achievement"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="text-xs leading-relaxed">
              Are you sure you want to delete this achievement?
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Title: <span className="font-semibold text-gray-900">{selectedAchievement?.title}</span>
          </p>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
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
