'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import type { ClassItem, UserType } from '@/types/database';
import { generateUserPassword } from '@/lib/utils';
import Modal from '@/components/Modal';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  ArrowLeft,
  Loader2,
  Users,
  GraduationCap,
  Briefcase,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  onSuccess: () => void;
}

interface PreviewUser {
  name: string;
  email: string;
  password: string;
}

interface CreatedUser {
  name: string;
  email: string;
  password: string;
}

export default function BulkUploadModal({
  isOpen,
  onClose,
  classes,
  onSuccess,
}: BulkUploadModalProps) {
  // Wizard steps: 'upload' | 'preview' | 'success'
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');

  // Step 1: User Type ('student' | 'staff')
  const [userType, setUserType] = useState<UserType>('student');

  // Step 2: Selected Class (only for students)
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Step 3: File & Parsing
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview data
  const [previewUsers, setPreviewUsers] = useState<PreviewUser[]>([]);

  // Insertion state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [skippedUsersCount, setSkippedUsersCount] = useState(0);

  // Reset state when closed
  const handleModalClose = () => {
    setStep('upload');
    setUserType('student');
    setSelectedClassId(classes.length > 0 ? classes[0].id : '');
    setFileName('');
    setPreviewUsers([]);
    setCreatedUsers([]);
    setSkippedUsersCount(0);
    setIsParsing(false);
    setIsSubmitting(false);
    onClose();
  };

  // Generate Email and Password from name
  const generateCredentials = (name: string) => {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${cleanName || 'user'}kinford@gmail.com`;
    const password = generateUserPassword(name);
    return { email, password };
  };

  // Header checking helper
  const isHeaderRow = (str: string): boolean => {
    const s = str.trim().toLowerCase();
    return /^(name|student\s*name|staff\s*name|full\s*name|students|staff|names|kinford)$/i.test(s);
  };

  // Process File (CSV, XLSX, XLS, PDF)
  const processFile = async (file: File) => {
    if (userType === 'student' && !selectedClassId) {
      toast.error('Please select a class before uploading the file');
      return;
    }

    setFileName(file.name);
    setIsParsing(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let names: string[] = [];

      if (ext === 'pdf') {
        // Send to /api/parse-pdf
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to parse PDF file');
        }

        const data = await res.json();
        names = data.names || [];
      } else if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
        // Parse spreadsheet using xlsx
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('Spreadsheet has no sheets');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: false,
        });

        const extracted: string[] = [];
        for (let i = 0; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;
          const firstCell = String(row[0] ?? '').trim();
          if (!firstCell) continue;

          // Skip header row if it matches "name"
          if (i === 0 && isHeaderRow(firstCell)) {
            continue;
          }

          extracted.push(firstCell);
        }

        names = extracted;
      } else {
        throw new Error('Unsupported file format. Please upload .csv, .xlsx, .xls, or .pdf');
      }

      // Filter out any purely empty strings
      const cleanedNames = names
        .map((n) => n.trim())
        .filter((n) => n.length > 0 && !isHeaderRow(n));

      if (cleanedNames.length === 0) {
        throw new Error('No names found in the file. Ensure the file has a column of names.');
      }

      // Prepare preview records
      const previews: PreviewUser[] = cleanedNames.map((name) => {
        const { email, password } = generateCredentials(name);
        return {
          name,
          email,
          password,
        };
      });

      setPreviewUsers(previews);
      setStep('preview');
      toast.success(`Found ${previews.length} names in file`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reading file';
      toast.error(msg);
      setFileName('');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Submit Bulk Insert
  const handleAddAllUsers = async () => {
    if (previewUsers.length === 0) return;
    setIsSubmitting(true);

    try {
      // 1. Fetch existing emails from database to detect duplicates
      const { data: existingData, error: fetchErr } = await supabase
        .from('users')
        .select('email');

      if (fetchErr) throw fetchErr;

      const existingEmails = new Set(
        (existingData || []).map((u) => u.email.toLowerCase())
      );

      // 2. Prepare batch insert rows & track skipped
      const toInsert: any[] = [];
      const successfulCreations: CreatedUser[] = [];
      let skippedCount = 0;

      for (const item of previewUsers) {
        const lowerEmail = item.email.toLowerCase();

        // If email already exists in DB or was already added in this batch
        if (existingEmails.has(lowerEmail)) {
          skippedCount++;
          continue;
        }

        // Mark as reserved for this batch
        existingEmails.add(lowerEmail);

        // Hash password
        const passwordHash = bcrypt.hashSync(item.password, 10);

        toInsert.push({
          name: item.name,
          email: item.email,
          password_hash: passwordHash,
          plain_password: item.password,
          user_type: userType,
          class_id: userType === 'student' ? selectedClassId : null,
          access_classes: false,
          access_results: false,
        });

        successfulCreations.push({
          name: item.name,
          email: item.email,
          password: item.password,
        });
      }

      // 3. Perform batch insert if there are valid users
      if (toInsert.length > 0) {
        const { error: insertErr } = await supabase.from('users').insert(toInsert);
        if (insertErr) throw insertErr;
      }

      setCreatedUsers(successfulCreations);
      setSkippedUsersCount(skippedCount);
      setStep('success');

      if (toInsert.length > 0) {
        toast.success(`Successfully created ${toInsert.length} users!`);
      } else {
        toast.info('All users were skipped because their emails already exist.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create users';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download Credentials as CSV
  const handleDownloadCredentials = () => {
    if (createdUsers.length === 0) return;

    let csvContent = 'Name,Email,Password\n';
    createdUsers.forEach((u) => {
      // Escape commas and quotes if needed
      const safeName = `"${u.name.replace(/"/g, '""')}"`;
      csvContent += `${safeName},${u.email},${u.password}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `kinford-${userType}-credentials-${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Downloaded credentials CSV!');
  };

  // Copy All Credentials to clipboard
  const handleCopyAllCredentials = () => {
    if (createdUsers.length === 0) return;

    const formatted = createdUsers
      .map((u, i) => `${i + 1}. Name: ${u.name} | Email: ${u.email} | Password: ${u.password}`)
      .join('\n');

    navigator.clipboard.writeText(formatted);
    toast.success('All credentials copied to clipboard!');
  };

  // Selected class object
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={
        step === 'upload'
          ? 'Bulk Upload Users'
          : step === 'preview'
          ? 'Preview Users'
          : 'Upload Complete'
      }
      description={
        step === 'upload'
          ? 'Quickly import multiple students or staff members from a spreadsheet or PDF.'
          : step === 'preview'
          ? 'Review the auto-generated emails and passwords before adding.'
          : 'User accounts have been created in the database.'
      }
      maxWidth={step === 'preview' ? 'xl' : 'lg'}
    >
      {/* ================= STEP 1: CONFIG & UPLOAD ================= */}
      {step === 'upload' && (
        <div className="space-y-5">
          {/* Step 1: User Type Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Step 1: Select Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType('student')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  userType === 'student'
                    ? 'border-[#A22538] bg-[#FFF1F3] text-[#A22538] shadow-sm ring-1 ring-[#A22538]'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => setUserType('staff')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                  userType === 'staff'
                    ? 'border-[#A22538] bg-[#FFF1F3] text-[#A22538] shadow-sm ring-1 ring-[#A22538]'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Staff</span>
              </button>
            </div>
          </div>

          {/* Step 2: Select Class (only if student) */}
          {userType === 'student' && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Step 2: Select Class *
              </label>
              <select
                required
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-[#A22538] focus:ring-2 focus:ring-[#A22538]/15 shadow-sm"
              >
                <option value="" disabled>
                  -- Choose class for enrolled students --
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section ? `(${c.section})` : ''}
                  </option>
                ))}
              </select>
              {classes.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No classes created yet. Please add a class in the Classes module first.
                </p>
              )}
            </div>
          )}

          {/* Step 3: File Upload Area */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              {userType === 'student' ? 'Step 3: Upload File *' : 'Step 2: Upload File *'}
            </label>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#A22538] bg-[#FFF1F3]/50'
                  : 'border-gray-300 hover:border-[#A22538] bg-gray-50/50 hover:bg-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {isParsing ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-2">
                  <Loader2 className="w-8 h-8 text-[#A22538] animate-spin" />
                  <p className="text-sm font-semibold text-gray-700">Processing file...</p>
                  <p className="text-xs text-gray-400">Extracting student names</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#A22538]/10 text-[#A22538] flex items-center justify-center mb-1">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    Upload a spreadsheet or PDF with {userType === 'student' ? 'student' : 'staff'} names
                  </p>
                  <p className="text-xs text-gray-500 max-w-sm">
                    File should contain a single column of names.
                  </p>
                  <div className="pt-2 flex items-center gap-2 text-xs font-medium text-gray-400">
                    <span className="px-2 py-0.5 bg-gray-200/60 rounded">.CSV</span>
                    <span className="px-2 py-0.5 bg-gray-200/60 rounded">.XLSX</span>
                    <span className="px-2 py-0.5 bg-gray-200/60 rounded">.XLS</span>
                    <span className="px-2 py-0.5 bg-gray-200/60 rounded">.PDF</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: PREVIEW ================= */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Header Info Banner */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] border ${
                  userType === 'student'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-blue-50 text-blue-800 border-blue-200'
                }`}
              >
                {userType}
              </span>
              {userType === 'student' && selectedClass && (
                <span className="font-semibold text-gray-700">
                  Class: <span className="text-[#A22538]">{selectedClass.name}</span>
                </span>
              )}
            </div>
            <div className="font-bold text-gray-900">
              {previewUsers.length} users will be created
            </div>
          </div>

          {/* Preview Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-gray-50 z-10">
                <tr>
                  <th className="px-3.5 py-2.5 w-10">#</th>
                  <th className="px-3.5 py-2.5">Name</th>
                  <th className="px-3.5 py-2.5">Email (Auto-generated)</th>
                  <th className="px-3.5 py-2.5">Password (Auto-generated)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {previewUsers.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-3.5 py-2 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-3.5 py-2 font-bold text-gray-900">{item.name}</td>
                    <td className="px-3.5 py-2 text-gray-600 font-mono text-[11px]">{item.email}</td>
                    <td className="px-3.5 py-2 text-[#A22538] font-mono font-medium text-[11px]">
                      {item.password}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 italic">
            * Passwords will be saved as readable credentials and securely hashed with bcrypt.
          </p>

          {/* Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setStep('upload')}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleModalClose}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || previewUsers.length === 0}
                onClick={handleAddAllUsers}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmitting ? 'Adding Users...' : 'Add All Users'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 3: SUCCESS STATE ================= */}
      {step === 'success' && (
        <div className="space-y-6 py-2 text-center">
          {/* Green Checkmark */}
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          {/* Messages */}
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Successfully added {createdUsers.length} {userType === 'student' ? 'students' : 'staff members'}!
            </h3>
            {skippedUsersCount > 0 && (
              <p className="text-xs font-medium text-amber-600 mt-1">
                {skippedUsersCount} user{skippedUsersCount > 1 ? 's' : ''} skipped (email already exists in system)
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto">
              You can now download or copy the login credentials for distribution to {userType}s.
            </p>
          </div>

          {/* Buttons: Download CSV, Copy Credentials */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleDownloadCredentials}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Credentials (.csv)</span>
            </button>

            <button
              type="button"
              onClick={handleCopyAllCredentials}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy All Credentials</span>
            </button>
          </div>

          {/* Done Button */}
          <div className="pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                handleModalClose();
                onSuccess();
              }}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-[#A22538] hover:bg-[#851b2c] transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
