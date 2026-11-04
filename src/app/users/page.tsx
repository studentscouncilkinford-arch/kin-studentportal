'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { StudentItem, ClassItem, StudentStatus } from '@/types/database';
import DataTable, { Column } from '@/components/DataTable';
import Modal from '@/components/Modal';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { toast } from 'sonner';

export default function UsersPage() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    class_id: '',
    roll_number: '',
    status: 'active' as StudentStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch students with class join
  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          class_id,
          roll_number,
          status,
          created_at,
          classes (
            id,
            name,
            section
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents((data as unknown as StudentItem[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch students';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch classes for dropdown
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
    fetchStudents();
    fetchClasses();
  }, [fetchStudents, fetchClasses]);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.roll_number && s.roll_number.toLowerCase().includes(q)) ||
        (s.classes && s.classes.name.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      class_id: classes.length > 0 ? classes[0].id : '',
      roll_number: '',
      status: 'active',
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (student: StudentItem) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      class_id: student.class_id || '',
      roll_number: student.roll_number || '',
      status: student.status,
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (student: StudentItem) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Student name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('students').insert({
        name: formData.name.trim(),
        class_id: formData.class_id ? formData.class_id : null,
        roll_number: formData.roll_number.trim() || null,
        status: formData.status,
      });

      if (error) throw error;
      toast.success('Student added successfully!');
      setIsAddModalOpen(false);
      fetchStudents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add student';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!formData.name.trim()) {
      toast.error('Student name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: formData.name.trim(),
          class_id: formData.class_id ? formData.class_id : null,
          roll_number: formData.roll_number.trim() || null,
          status: formData.status,
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;
      toast.success('Student updated successfully!');
      setIsEditModalOpen(false);
      fetchStudents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update student';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete
  const handleDeleteSubmit = async () => {
    if (!selectedStudent) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', selectedStudent.id);

      if (error) throw error;
      toast.success('Student removed successfully!');
      setIsDeleteModalOpen(false);
      fetchStudents();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete student';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Table Columns
  const columns: Column<StudentItem>[] = [
    {
      header: 'Name',
      render: (student) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FFF1F3] text-[#A22538] font-bold text-xs flex items-center justify-center border border-[#A22538]/10 flex-shrink-0">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{student.name}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Class',
      render: (student) => {
        if (!student.classes) {
          return <span className="text-gray-400 italic">Unassigned</span>;
        }
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
            {student.classes.name}
            {student.classes.section ? ` - ${student.classes.section}` : ''}
          </span>
        );
      },
    },
    {
      header: 'Roll Number',
      render: (student) => (
        <span className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
          {student.roll_number || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (student) => {
        const isActive = student.status === 'active';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-emerald-600' : 'bg-gray-400'
              }`}
            />
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (student) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleOpenEdit(student)}
            className="p-1.5 text-gray-500 hover:text-[#A22538] hover:bg-rose-50 rounded-lg transition-colors"
            title="Edit student"
            aria-label="Edit student"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenDelete(student)}
            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete student"
            aria-label="Delete student"
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
            Users
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage students and roll numbers.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, or class..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 transition-all"
          />
        </div>
      </div>

      {/* Students Data Table */}
      <DataTable
        columns={columns}
        data={filteredStudents}
        isLoading={isLoading}
        emptyMessage={
          searchQuery
            ? `No students found matching "${searchQuery}".`
            : 'No students enrolled yet. Click "Add User" to create one.'
        }
        keyExtractor={(item) => item.id}
      />

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student"
        description="Enter the student's details to enroll them in Kinford Portal."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Eleanor Vance"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Class
            </label>
            <select
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="">Select a class...</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section ? `(${cls.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Roll Number
            </label>
            <input
              type="text"
              value={formData.roll_number}
              onChange={(e) =>
                setFormData({ ...formData, roll_number: e.target.value })
              }
              placeholder="e.g. KIN-2026-042"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={() => setFormData({ ...formData, status: 'active' })}
                  className="text-[#A22538] focus:ring-[#A22538]"
                />
                <span className="text-sm text-gray-700 font-medium">Active</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={formData.status === 'inactive'}
                  onChange={() => setFormData({ ...formData, status: 'inactive' })}
                  className="text-[#A22538] focus:ring-[#A22538]"
                />
                <span className="text-sm text-gray-700 font-medium">Inactive</span>
              </label>
            </div>
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
              {isSubmitting ? 'Saving...' : 'Add Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student"
        description="Update student details and class assignment."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Full Name *
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
              Class
            </label>
            <select
              value={formData.class_id}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="">Select a class...</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section ? `(${cls.section})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Roll Number
            </label>
            <input
              type="text"
              value={formData.roll_number}
              onChange={(e) =>
                setFormData({ ...formData, roll_number: e.target.value })
              }
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="edit-status"
                  value="active"
                  checked={formData.status === 'active'}
                  onChange={() => setFormData({ ...formData, status: 'active' })}
                  className="text-[#A22538] focus:ring-[#A22538]"
                />
                <span className="text-sm text-gray-700 font-medium">Active</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="edit-status"
                  value="inactive"
                  checked={formData.status === 'inactive'}
                  onChange={() => setFormData({ ...formData, status: 'inactive' })}
                  className="text-[#A22538] focus:ring-[#A22538]"
                />
                <span className="text-sm text-gray-700 font-medium">Inactive</span>
              </label>
            </div>
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
        title="Confirm Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <p className="text-xs leading-relaxed">
              This will permanently delete the student and their associated academic results.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">
              {selectedStudent?.name}
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
