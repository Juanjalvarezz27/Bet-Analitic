import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convierte un Date (UTC en DB) a la fecha local de Caracas (UTC-4) en formato "yyyy-MM-dd"
export function toCaracasDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
}
