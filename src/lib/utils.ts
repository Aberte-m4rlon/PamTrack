import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, isValid, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhp(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return 'Unavailable';
  }
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateSafe(value: string | null | undefined, pattern = 'MMM d, yyyy'): string {
  if (!value) return 'Not verified';
  const parsed = parseISO(value);
  if (!isValid(parsed)) return 'Invalid date';
  return format(parsed, pattern);
}

export function formatDateTimeSafe(value: string | null | undefined): string {
  return formatDateSafe(value, 'MMM d, yyyy • h:mm a');
}

/**
 * Computes straight-line geodesic distance (km) strictly as a reference when
 * road routing is unavailable. Never used to compute or invent an official fare.
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}
