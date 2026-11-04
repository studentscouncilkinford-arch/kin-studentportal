import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
 * Generates an auto-generated Kinford email based on the user's full name.
 * Format: {firstnamelastname}kinford@gmail.com (lowercase, no spaces, no special characters).
 * If duplicate exists in DB, appends a number: sabitrahman2kinford@gmail.com, etc.
 */
export function generateUserEmail(name: string, existingEmails: string[] = []): string {
  // Strip special characters, lowercase, remove spaces
  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  const basePrefix = cleanName || 'user';
  const existingSet = new Set(existingEmails.map((e) => e.toLowerCase()));

  const primaryCandidate = `${basePrefix}kinford@gmail.com`;
  if (!existingSet.has(primaryCandidate)) {
    return primaryCandidate;
  }

  // Find next available numeric suffix (2, 3, 4...)
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
  const numbers = '23456789'; // exclude 0 and 1 to prevent ambiguity if desired
  const allChars = upper + lower + numbers;

  // Guarantee at least 1 uppercase, 1 lowercase, 1 digit
  const passwordChars = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
  ];

  for (let i = 3; i < length; i++) {
    passwordChars.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Fisher-Yates shuffle
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}
