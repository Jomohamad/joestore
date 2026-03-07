export const formatDateTime = (value: unknown) => {
  if (!value) return '-';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

export const formatCurrency = (amount: unknown, currency = 'EGP') => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: String(currency || 'EGP').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(value);
};

export const statusClass = (status: unknown) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed' || normalized === 'paid' || normalized === 'success') {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  }
  if (normalized === 'processing' || normalized === 'pending') {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }
  if (normalized === 'failed' || normalized === 'error') {
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }
  return 'bg-slate-700/40 text-slate-200 border-slate-600';
};

export const safeJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
};

export const dayKey = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const isToday = (value: unknown) => {
  const key = dayKey(value);
  return key === dayKey(new Date().toISOString());
};
