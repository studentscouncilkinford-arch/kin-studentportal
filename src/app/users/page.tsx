'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { UserItem, ClassItem, UserType } from '@/types/database';
import DataTable, { Column } from '@/components/DataTable';
import Modal from '@/components/Modal';
import BulkUploadModal from '@/components/BulkUploadModal';
import { generateUserEmail, generateUserPassword } from '@/lib/utils';
import {
  Plus,
  Upload,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Copy,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

interface CredentialsModalData {
  title: string;
  name: string;
  userType: UserType;
  email: string;
  plainPassword: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'student' | 'staff'>('all');

  // Password visibility tracking per user row
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Credentials success modal state
  const [credentialsData, setCredentialsData] = useState<CredentialsModalData | null>(null);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);

  // Add Form state
  const [addForm, setAddForm] = useState<{
    user_type: UserType;
    name: string;
    class_id: string;
    access_classes: boolean;
    access_results: boolean;
  }>({
    user_type: 'student',
    name: '',
    class_id: '',
    access_classes: false,
    access_results: false,
  });

  // Edit Form state
  const [editForm, setEditForm] = useState<{
    name: string;
    class_id: string;
    access_classes: boolean;
    access_results: boolean;
  }>({
    name: '',
    class_id: '',
    access_classes: false,
    access_results: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toggle password visibility for a row
  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Copy helpers
  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success('Email copied!');
  };

  const copyPassword = (password: string | null | undefined) => {
    if (!password) {
      toast.error('No password available to copy');
      return;
    }
    navigator.clipboard.writeText(password);
    toast.success('Password copied!');
  };

  const copyAllCredentials = (email: string, password: string | null | undefined) => {
    const text = `Email: ${email}\nPassword: ${password || 'N/A'}`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied!');
  };

  // Fetch users with class information and plain_password
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          password_hash,
          plain_password,
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as unknown as UserItem[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
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
    fetchUsers();
    fetchClasses();
  }, [fetchUsers, fetchClasses]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (typeFilter !== 'all' && u.user_type !== typeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = u.name.toLowerCase().includes(q);
        const matchesEmail = u.email.toLowerCase().includes(q);
        const matchesClass = u.classes?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesClass) {
          return false;
        }
      }
      return true;
    });
  }, [users, typeFilter, searchQuery]);

  // Open Add User Modal
  const handleOpenAdd = () => {
    setAddForm({
      user_type: 'student',
      name: '',
      class_id: classes.length > 0 ? classes[0].id : '',
      access_classes: false,
      access_results: false,
    });
    setIsAddModalOpen(true);
  };

  // Open Edit User Modal
  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      class_id: user.class_id || (classes.length > 0 ? classes[0].id : ''),
      access_classes: !!user.access_classes,
      access_results: !!user.access_results,
    });
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const handleOpenDelete = (user: UserItem) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  // Submit Add User
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast.error('Full Name is required');
      return;
    }

    if (addForm.user_type === 'student' && !addForm.class_id) {
      toast.error('Please assign a class to the student');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Fetch existing emails
      const { data: existingData } = await supabase.from('users').select('email');
      const existingEmails = (existingData || []).map((u) => u.email);

      // 2. Auto-generate email and plain password
      const generatedEmail = generateUserEmail(addForm.name.trim(), existingEmails);
      const plainPassword = generateUserPassword(addForm.name.trim());
      const passwordHash = bcrypt.hashSync(plainPassword, 10);

      // 3. Save both password_hash and plain_password to Supabase
      const { error } = await supabase.from('users').insert({
        name: addForm.name.trim(),
        email: generatedEmail,
        password_hash: passwordHash,
        plain_password: plainPassword,
        user_type: addForm.user_type,
        class_id: addForm.user_type === 'student' ? addForm.class_id : null,
        access_classes: addForm.user_type === 'staff' ? addForm.access_classes : false,
        access_results: addForm.user_type === 'staff' ? addForm.access_results : false,
      });

      if (error) throw error;

      setIsAddModalOpen(false);
      fetchUsers();

      // Show credentials popup
      setCredentialsData({
        title: 'User Created Successfully',
        name: addForm.name.trim(),
        userType: addForm.user_type,
        email: generatedEmail,
        plainPassword: plainPassword,
      });
      setIsCredentialsModalOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editForm.name.trim()) {
      toast.error('Full Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editForm.name.trim(),
          class_id: selectedUser.user_type === 'student' ? editForm.class_id : null,
          access_classes: selectedUser.user_type === 'staff' ? editForm.access_classes : false,
          access_results: selectedUser.user_type === 'staff' ? editForm.access_results : false,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User updated successfully!');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Password for User
  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const newPlainPassword = generateUserPassword(selectedUser.name);
      const newPasswordHash = bcrypt.hashSync(newPlainPassword, 10);

      // Update both password_hash and plain_password
      const { error } = await supabase
        .from('users')
        .update({
          password_hash: newPasswordHash,
          plain_password: newPlainPassword,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setIsEditModalOpen(false);
      fetchUsers();

      setCredentialsData({
        title: 'Password Reset Successfully',
        name: selectedUser.name,
        userType: selectedUser.user_type,
        email: selectedUser.email,
        plainPassword: newPlainPassword,
      });
      setIsCredentialsModalOpen(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete User
  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success('User removed successfully!');
      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Table Columns: NAME | TYPE | EMAIL | PASSWORD | CLASS | ACTIONS
  const columns: Column<UserItem>[] = [
    {
      header: 'Name',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full font-bold text-xs flex items-center justify-center border flex-shrink-0 ${
              u.user_type === 'staff'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-[#FFF1F3] text-[#A22538] border-[#A22538]/10'
            }`}
          >
            {u.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{u.name}</p>
            {u.user_type === 'staff' && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {u.access_classes && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    Classes
                  </span>
                )}
                {u.access_results && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    Results
                  </span>
                )}
                {!u.access_classes && !u.access_results && (
                  <span className="text-[10px] text-gray-400 italic">No modules</span>
                )}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      render: (u) => {
        const isStudent = u.user_type === 'student';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isStudent
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {isStudent ? (
              <GraduationCap className="w-3.5 h-3.5" />
            ) : (
              <Briefcase className="w-3.5 h-3.5" />
            )}
            <span className="capitalize">{u.user_type}</span>
          </span>
        );
      },
    },
    {
      header: 'Email',
      render: (u) => (
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
            {u.email}
          </span>
          <button
            onClick={() => copyEmail(u.email)}
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Copy email"
            aria-label="Copy email"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
    {
      header: 'Password',
      render: (u) => {
        const isRevealed = !!visiblePasswords[u.id];
        const displayPassword = u.plain_password || '••••••••';

        return (
          <div className="flex items-center gap-1.5 font-mono text-xs">
            <span
              className={`px-2 py-1 rounded-md border text-xs tracking-wider transition-all select-all ${
                isRevealed
                  ? 'bg-[#FFF1F3] text-[#A22538] border-[#A22538]/20 font-bold'
                  : 'bg-gray-50 text-gray-500 border-gray-200'
              }`}
            >
              {isRevealed ? displayPassword : '••••••••'}
            </span>
            <button
              onClick={() => togglePasswordVisibility(u.id)}
              className="p-1 text-gray-400 hover:text-[#A22538] hover:bg-rose-50 rounded transition-colors"
              title={isRevealed ? 'Mask password' : 'Show password'}
              aria-label={isRevealed ? 'Mask password' : 'Show password'}
            >
              {isRevealed ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={() => copyPassword(u.plain_password)}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Copy password"
              aria-label="Copy password"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      header: 'Class',
      render: (u) => {
        if (u.user_type === 'staff') {
          return <span className="text-gray-400 font-semibold">—</span>;
        }
        if (!u.classes) {
          return <span className="text-gray-400 italic">Unassigned</span>;
        }
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
            {u.classes.name}
            {u.classes.section ? ` - ${u.classes.section}` : ''}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          {/* Key icon to copy both credentials */}
          <button
            onClick={() => copyAllCredentials(u.email, u.plain_password)}
            className="p-1.5 text-gray-400 hover:text-[#EEB540] hover:bg-[#FEF7E8] rounded-lg transition-colors"
            title="Copy email & password"
            aria-label="Copy email and password"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(u)}
            className="p-1.5 text-gray-400 hover:text-[#A22538] hover:bg-rose-50 rounded-lg transition-colors"
            title="Edit user"
            aria-label="Edit user"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenDelete(u)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete user"
            aria-label="Delete user"
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
            Manage student enrollments and staff access permissions.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#A22538] border border-[#A22538] hover:bg-[#A22538]/5 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Upload</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or class..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 transition-all"
          />
        </div>

        {/* Filter Dropdown: All | Students | Staff */}
        <div className="w-full sm:w-44">
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'all' | 'student' | 'staff')
            }
            className="w-full px-3.5 py-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 transition-all"
          >
            <option value="all">All Users</option>
            <option value="student">Students</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={isLoading}
        emptyMessage={
          searchQuery || typeFilter !== 'all'
            ? 'No users match the selected search or filter criteria.'
            : 'No users created yet. Click "Add User" to get started.'
        }
        keyExtractor={(item) => item.id}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        classes={classes}
        onSuccess={fetchUsers}
      />

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
        description="Select user type and fill details. Credentials will be auto-generated."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              User Type *
            </label>
            <select
              value={addForm.user_type}
              onChange={(e) =>
                setAddForm({
                  ...addForm,
                  user_type: e.target.value as UserType,
                })
              }
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm bg-white font-medium focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder={
                addForm.user_type === 'student' ? 'e.g. Sabit Rahman' : 'e.g. Dr. John Montague'
              }
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
              autoFocus
            />
          </div>

          {addForm.user_type === 'student' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Class *
              </label>
              <select
                required
                value={addForm.class_id}
                onChange={(e) => setAddForm({ ...addForm, class_id: e.target.value })}
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
          ) : (
            <div className="space-y-2.5 p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Access Permissions
              </label>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addForm.access_classes}
                    onChange={(e) =>
                      setAddForm({ ...addForm, access_classes: e.target.checked })
                    }
                    className="w-4 h-4 text-[#A22538] rounded border-gray-300 focus:ring-[#A22538]"
                  />
                  <span>Classes Module</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addForm.access_results}
                    onChange={(e) =>
                      setAddForm({ ...addForm, access_results: e.target.checked })
                    }
                    className="w-4 h-4 text-[#A22538] rounded border-gray-300 focus:ring-[#A22538]"
                  />
                  <span>Results Module</span>
                </label>
              </div>
            </div>
          )}

          <div className="p-3 bg-[#FFF1F3] rounded-lg border border-[#A22538]/10 text-xs text-[#A22538]">
            <p className="font-semibold">Auto-Generated Credentials</p>
            <p className="text-[11px] text-[#A22538]/80 mt-0.5">
              Email ({'{name}'}kinford@gmail.com) and an 8-character password will be generated upon save.
            </p>
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
              {isSubmitting ? 'Saving...' : 'Add User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User"
        description="Update user information and access rights."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              User Type
            </label>
            <div className="px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 capitalize flex items-center justify-between">
              <span>{selectedUser?.user_type}</span>
              <span className="text-[11px] text-gray-400 font-normal">Fixed</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="text"
              readOnly
              value={selectedUser?.email || ''}
              className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm font-mono text-gray-600 cursor-not-allowed select-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15"
            />
          </div>

          {selectedUser?.user_type === 'student' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Class
              </label>
              <select
                value={editForm.class_id}
                onChange={(e) => setEditForm({ ...editForm, class_id: e.target.value })}
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
          )}

          {selectedUser?.user_type === 'staff' && (
            <div className="space-y-2.5 p-3.5 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Access Permissions
              </label>
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.access_classes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, access_classes: e.target.checked })
                    }
                    className="w-4 h-4 text-[#A22538] rounded border-gray-300 focus:ring-[#A22538]"
                  />
                  <span>Classes Module</span>
                </label>
                <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.access_results}
                    onChange={(e) =>
                      setEditForm({ ...editForm, access_results: e.target.checked })
                    }
                    className="w-4 h-4 text-[#A22538] rounded border-gray-300 focus:ring-[#A22538]"
                  />
                  <span>Results Module</span>
                </label>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={isSubmitting}
              className="w-full py-2.5 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#A22538] transition-colors flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-amber-500" />
              <span>Reset Password & Show New Credentials</span>
            </button>
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

      {/* Success Credentials Popup Modal */}
      <Modal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        title="Credentials Ready"
        maxWidth="sm"
      >
        {credentialsData && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold">{credentialsData.title}</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  User is ready to sign in.
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500 text-xs uppercase font-semibold">Name</span>
                <span className="font-semibold text-gray-900">{credentialsData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 text-xs uppercase font-semibold">Type</span>
                <span className="capitalize font-semibold text-gray-900">
                  {credentialsData.userType}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 flex flex-col gap-1">
                <span className="text-gray-500 text-xs uppercase font-semibold">Email</span>
                <span className="font-mono text-xs bg-white p-2 rounded border border-gray-200 text-gray-800 break-all">
                  {credentialsData.email}
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-gray-500 text-xs uppercase font-semibold">Password</span>
                <span className="font-mono text-base font-bold bg-[#FFF1F3] p-2 rounded border border-[#A22538]/20 text-[#A22538] tracking-wider text-center">
                  {credentialsData.plainPassword}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Save these credentials</strong> — the password won&apos;t be shown again.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  copyAllCredentials(credentialsData.email, credentialsData.plainPassword);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Copy className="w-4 h-4" />
                <span>Copy Credentials</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCredentialsModalOpen(false)}
                className="w-full py-2 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
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
              This will permanently delete this user account and any associated prizes and achievements.
            </p>
          </div>

          <p className="text-sm text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">
              {selectedUser?.name}
            </span>{' '}
            ({selectedUser?.email})?
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
