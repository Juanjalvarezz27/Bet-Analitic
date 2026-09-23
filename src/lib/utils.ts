import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convierte Date o string a la fecha local de Caracas (UTC-4) en formato "yyyy-MM-dd"
export function toCaracasDateStr(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
}
// Formatea la hora en zona horaria de Caracas de forma determinista (ej: "09:30 PM")
export function formatCaracasTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Caracas',
  });
}

// Retorna el rango UTC [startOfDay, endOfDay] para el día en zona horaria America/Caracas (UTC-4)
export function getCaracasDayRange(date: Date = new Date()): { startOfDay: Date; endOfDay: Date; dateStr: string } {
  const dateStr = toCaracasDateStr(date);
  const startOfDay = new Date(`${dateStr}T00:00:00.000-04:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999-04:00`);
  return { startOfDay, endOfDay, dateStr };
}

// Retorna el rango de fechas en Caracas para los periodos: 'today' | 'week' | 'month' | 'year' | 'all'
export function getCaracasPeriodRange(period: string = 'all', now: Date = new Date()): { startDate: Date; endDate?: Date } {
  const { startOfDay, endOfDay } = getCaracasDayRange(now);

  if (period === 'today') {
    return { startDate: startOfDay, endDate: endOfDay };
  } else if (period === 'week') {
    const startDate = new Date(startOfDay);
    startDate.setDate(startDate.getDate() - 6);
    return { startDate, endDate: endOfDay };
  } else if (period === 'month') {
    const startDate = new Date(startOfDay);
    startDate.setMonth(startDate.getMonth() - 1);
    return { startDate, endDate: endOfDay };
  } else if (period === 'year') {
    const startDate = new Date(startOfDay);
    startDate.setFullYear(startDate.getFullYear() - 1);
    return { startDate, endDate: endOfDay };
  }

  return { startDate: new Date(0) };
}

