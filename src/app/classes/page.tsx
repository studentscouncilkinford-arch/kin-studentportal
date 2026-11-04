'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ClassItem, StudentItem } from '@/types/database';
import Modal from '@/components/Modal';
import {
  GraduationCap,
  Plus,
  Users,
  Pencil,
  Trash2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

interface ClassWithCount extends ClassItem {
  student_count: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);

  const [selectedClass, setSelectedClass] = useState<ClassWithCount | null>(null);
  const [classStudents, setClassStudents] = useState<StudentItem[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    section: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch classes with student count
  const fetchClasses = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (classesError) throw classesError;

      // Fetch students count per class
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('class_id');

      if (studentsError) throw studentsError;

      const counts: Record<string, number> = {};
      ((studentsData as unknown as { class_id: string | null }[]) || []).forEach((s) => {
        if (s.class_id) {
          counts[s.class_id] = (counts[s.class_id] || 0) + 1;
        }
      });

      const classesList = (classesData as unknown as ClassItem[]) || [];
      const classesWithCount: ClassWithCount[] = classesList.map((c) => ({
        ...c,
        student_count: counts[c.id] || 0,
      }));

      setClasses(classesWithCount);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch classes';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // View students in selected class
  const handleViewClassStudents = async (cls: ClassWithCount) => {
    setSelectedClass(cls);
    setIsViewStudentsModalOpen(true);
    setIsLoadingStudents(true);

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', cls.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setClassStudents((data as unknown as StudentItem[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load class students';
      toast.error(message);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({ name: '', section: '' });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (e: React.MouseEvent, cls: ClassWithCount) => {
    e.stopPropagation();
    setSelectedClass(cls);
    setFormData({
      name: cls.name,
      section: cls.section || '',
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (e: React.MouseEvent, cls: ClassWithCount) => {
    e.stopPropagation();
    setSelectedClass(cls);
    setIsDeleteModalOpen(true);
  };

  // Submit Add Class
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Class name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('classes').insert({
        name: formData.name.trim(),
        section: formData.section.trim() || null,
      });

      if (error) throw error;
      toast.success('Class created successfully!');
      setIsAddModalOpen(false);
      fetchClasses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create class';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Class
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;
    if (!formData.name.trim()) {
      toast.error('Class name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: formData.name.trim(),
          section: formData.section.trim() || null,
        })
        .eq('id', selectedClass.id);

      if (error) throw error;
      toast.success('Class updated successfully!');
      setIsEditModalOpen(false);
      fetchClasses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update class';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete Class
  const handleDeleteSubmit = async () => {
    if (!selectedClass) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', selectedClass.id);

      if (error) throw error;
      toast.success('Class deleted successfully!');
      setIsDeleteModalOpen(false);
      fetchClasses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete class';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Classes
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage academic batches, grades, and student enrollments.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Class</span>
        </button>
      </div>

      {/* Grid of Class Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="w-16 h-5 bg-gray-200 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#FFF1F3] text-[#A22538] flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No classes found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Get started by creating your first academic class or section.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((cls) => (
            <div
              key={cls.id}
              onClick={() => handleViewClassStudents(cls)}
              className="group bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[#A22538]/40 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  {/* Gold Circle with Graduation Cap Icon */}
                  <div className="w-12 h-12 rounded-full bg-[#FEF7E8] text-[#EEB540] border border-[#EEB540]/20 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-6 h-6 stroke-[2.2]" />
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleOpenEdit(e, cls)}
                      className="p-1.5 text-gray-400 hover:text-[#A22538] hover:bg-rose-50 rounded-lg transition-colors"
                      title="Edit class"
                      aria-label="Edit class"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleOpenDelete(e, cls)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete class"
                      aria-label="Delete class"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#A22538] transition-colors">
                      {cls.name}
                    </h3>
                    {cls.section && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#FEF7E8] text-[#B8860B] border border-[#EEB540]/30">
                        Sec {cls.section}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Section {cls.section || 'General'}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-sm text-[#A22538]">
                    {cls.student_count}
                  </span>
                  <span>{cls.student_count === 1 ? 'Student' : 'Students'}</span>
                </div>
                <span className="inline-flex items-center text-xs font-medium text-[#A22538] group-hover:translate-x-0.5 transition-transform">
                  View students <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Class Students Modal */}
      <Modal
        isOpen={isViewStudentsModalOpen}
        onClose={() => setIsViewStudentsModalOpen(false)}
        title={
          selectedClass
            ? `${selectedClass.name} ${
                selectedClass.section ? `(Section ${selectedClass.section})` : ''
              }`
            : 'Class Students'
        }
        description="Students currently assigned to this class."
        maxWidth="lg"
      >
        <div className="space-y-4">
          {isLoadingStudents ? (
            <div className="py-8 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 bg-gray-100 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : classStudents.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No students enrolled in this class yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Assign students to this class from the Users page.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[50vh] overflow-y-auto">
              {classStudents.map((student) => (
                <div
                  key={student.id}
                  className="py-3 px-2 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#FFF1F3] text-[#A22538] font-bold text-xs flex items-center justify-center border border-[#A22538]/10">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">
                        Roll: {student.roll_number || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      student.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {student.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => setIsViewStudentsModalOpen(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Class Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Class"
        description="Create an academic class and section."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Class Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Grade 10 or Year 1"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Section (Optional)
            </label>
            <input
              type="text"
              value={formData.section}
              onChange={(e) =>
                setFormData({ ...formData, section: e.target.value })
              }
              placeholder="e.g. Section A, Blue, Science"
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
              {isSubmitting ? 'Creating...' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Class Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Class"
        description="Update class details and section information."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Class Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Section (Optional)
            </label>
            <input
              type="text"
              value={formData.section}
              onChange={(e) =>
                setFormData({ ...formData, section: e.target.value })
              }
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
        title="Delete Class"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="text-xs leading-relaxed">
              Deleting this class will unassign all students belonging to it.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">
              {selectedClass?.name}{' '}
              {selectedClass?.section ? `(${selectedClass.section})` : ''}
            </span>
            ?
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
