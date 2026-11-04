import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { PrizeType } from '@/types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateGrade(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '-';
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

/**
 * Returns the badge classes for program prizes.
 */
export function getPrizeBadgeClass(prize: PrizeType | string): string {
  switch (prize) {
    case '1st Prize':
      return 'bg-[#EEB540] text-amber-950 border border-amber-500/30 font-bold shadow-sm';
    case '2nd Prize':
      return 'bg-gray-200 text-gray-800 border border-gray-300 font-semibold';
    case '3rd Prize':
      return 'bg-amber-800 text-amber-50 border border-amber-900 font-semibold';
    case 'Participation':
      return 'bg-gray-100 text-gray-700 border border-gray-200';
    case 'Special Mention':
      return 'bg-sky-100 text-sky-800 border border-sky-200 font-medium';
    case 'Best Performance':
      return 'bg-[#A22538] text-white border border-[#851b2c] font-bold shadow-sm';
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
}

/**
 * Generates an auto-generated Kinford email based on the user's full name.
 * Format: {firstnamelastname}kinford@gmail.com (lowercase, no spaces, no special characters).
 * If duplicate exists in DB, appends a number: sabitrahman2kinford@gmail.com, etc.
 */
export function generateUserEmail(name: string, existingEmails: string[] = []): string {
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const basePrefix = cleanName || 'user';
  const existingSet = new Set(existingEmails.map((e) => e.toLowerCase()));

  const primaryCandidate = `${basePrefix}kinford@gmail.com`;
  if (!existingSet.has(primaryCandidate)) {
    return primaryCandidate;
  }

  let counter = 2;
  while (true) {
    const candidate = `${basePrefix}${counter}kinford@gmail.com`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
    counter++;
  }
}

/**
 * Generates a secure random 8-character password.
 * Mix of uppercase, lowercase, and numbers (e.g., Kf7xR2mN).
 */
export function generateRandomPassword(length = 8): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const allChars = upper + lower + numbers;

  const passwordChars = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
  ];

  for (let i = 3; i < length; i++) {
    passwordChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}
