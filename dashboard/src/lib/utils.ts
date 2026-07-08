import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n) : n;
  if (isNaN(num)) return 'Rp 0';
  return `Rp ${num.toLocaleString('id-ID')}`;
}

export function formatRupiahSingkat(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n) : n;
  if (isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'jt';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'rb';
  return num.toString();
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(/,/g, '');
}

export function getGreeting(): string {
  const jam = new Date().getHours();
  if (jam < 12) return 'pagi';
  if (jam < 15) return 'siang';
  if (jam < 18) return 'sore';
  return 'malam';
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}
