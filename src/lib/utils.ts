import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID ?
  crypto.randomUUID() :
  Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function generateRequestNumber(prefix: string): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 99999).
  toString().
  padStart(5, '0');
  return `${prefix}-${year}-${num}`;
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function getInitials(name: string): string {
  return name.
  split(' ').
  map((n) => n[0]).
  join('').
  toUpperCase().
  slice(0, 2);
}

export function debounce<T extends (...args: any[]) => any>(
fn: T,
delay: number)
: T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    Working: 'bg-emerald-100 text-emerald-800',
    Broken: 'bg-red-100 text-red-800',
    New: 'bg-blue-100 text-blue-800',
    Used: 'bg-amber-100 text-amber-800',
    Refurbished: 'bg-purple-100 text-purple-800',
    Pending: 'bg-yellow-100 text-yellow-800',
    'Pending PM Approval': 'bg-yellow-100 text-yellow-800',
    'Pending Admin Approval': 'bg-orange-100 text-orange-800',
    Approved: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-red-100 text-red-800',
    'Rejected by PM': 'bg-red-100 text-red-800',
    'Rejected by Admin': 'bg-red-100 text-red-800',
    Fulfilled: 'bg-blue-100 text-blue-800',
    Completed: 'bg-emerald-100 text-emerald-800',
    'In Progress': 'bg-blue-100 text-blue-800',
    Cancelled: 'bg-gray-100 text-gray-800',
    Draft: 'bg-gray-100 text-gray-600',
    Active: 'bg-emerald-100 text-emerald-800',
    Expired: 'bg-red-100 text-red-800',
    Scheduled: 'bg-blue-100 text-blue-800',
    Overdue: 'bg-red-100 text-red-800',
    'Checked Out': 'bg-amber-100 text-amber-800',
    Returned: 'bg-emerald-100 text-emerald-800'
  };
  return map[status] || 'bg-gray-100 text-gray-800';
}

export function getUrgencyColor(urgency: string): string {
  const map: Record<string, string> = {
    Emergency: 'bg-red-600 text-white',
    Critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-gray-100 text-gray-600'
  };
  return map[urgency] || 'bg-gray-100 text-gray-600';
}