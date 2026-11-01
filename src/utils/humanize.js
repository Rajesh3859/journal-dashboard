// Human-centered formatting utilities for dates, currency, avatars, and labels

export const formatMoney = (minor) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(minor || 0) / 100);
};

export const getInitials = (name = '') => {
  if (!name) return '??';
  // Strip common titles like Dr., Prof., Mr., Ms.
  const cleaned = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, '').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AVATAR_COLORS = [
  '#2457A7', // Navy Blue (Primary)
  '#3B82F6', // Blue Accent
  '#1D4589', // Deep Cobalt
  '#475569', // Slate Steel
  '#1E293B', // Charcoal Slate
  '#2563EB', // Royal Blue
  '#334155', // Dark Slate
  '#5B8DEF', // Soft Blue
];

export const getAvatarColor = (name = '') => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

export const formatHumanDate = (dateStr) => {
  if (!dateStr) return 'No date set';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export const formatRelativeDue = (dueDateStr, dueState) => {
  if (!dueDateStr) return { text: 'No deadline set', color: 'default', urgency: 'none' };

  if (dueState === 'Paid') {
    return { text: 'Paid in full', color: 'success', urgency: 'done' };
  }
  if (dueState === 'Cancelled') {
    return { text: 'Cancelled', color: 'default', urgency: 'done' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dueDateStr.split('-').map(Number);
  const due = new Date(year, month - 1, day);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: 'Due Today', color: 'warning', urgency: 'high' };
  } else if (diffDays === 1) {
    return { text: 'Due Tomorrow', color: 'warning', urgency: 'medium' };
  } else if (diffDays === -1) {
    return { text: '1 day overdue', color: 'error', urgency: 'critical' };
  } else if (diffDays < -1) {
    return { text: `${Math.abs(diffDays)} days overdue`, color: 'error', urgency: 'critical' };
  } else if (diffDays <= 7) {
    return { text: `Due in ${diffDays} days (${formatHumanDate(dueDateStr)})`, color: 'info', urgency: 'medium' };
  } else {
    return { text: formatHumanDate(dueDateStr), color: 'default', urgency: 'low' };
  }
};

export const formatWorkType = (workType = 'journal') => {
  switch (workType?.toLowerCase()) {
    case 'journal':
      return {
        label: 'Journal Article',
        key: 'journal',
        color: 'primary',
      };
    case 'conference':
      return {
        label: 'Conference Paper',
        key: 'conference',
        color: 'default',
      };
    case 'patent':
      return {
        label: 'Patent Filing',
        key: 'patent',
        color: 'default',
      };
    default:
      return {
        label: workType || 'Manuscript',
        key: 'other',
        color: 'default',
      };
  }
};

export const calculateProgress = (receivedMinor, dueMinor) => {
  if (!dueMinor || dueMinor <= 0) return 0;
  const pct = Math.round((Number(receivedMinor || 0) / Number(dueMinor)) * 100);
  return Math.min(100, Math.max(0, pct));
};

export const parseAuthorsList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .flatMap((item) => {
        if (typeof item === 'string') {
          return item.split(/[,;]+/);
        }
        if (item && typeof item === 'object' && item.name) {
          return String(item.name).split(/[,;]+/);
        }
        return item != null ? [String(item)] : [];
      })
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[]') return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parseAuthorsList(parsed);
      }
    } catch {
      // not JSON, fallback to split
    }
    return trimmed
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

export const formatDateTime = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatPaymentStatus = (status = 'Pending') => {
  const norm = String(status || '').toLowerCase().trim();
  if (norm === 'fully paid' || norm === 'paid' || norm === 'completed') {
    return { label: 'Fully Paid', color: 'primary', bg: 'rgba(36, 87, 167, 0.1)' };
  }
  if (norm === 'partially paid' || norm === 'partial') {
    return { label: 'Partially Paid', color: 'default', bg: 'rgba(100, 116, 139, 0.1)' };
  }
  return { label: 'Pending', color: 'default', bg: 'rgba(100, 116, 139, 0.08)' };
};

export const formatAuthorsHuman = (raw) => {
  if (!raw) return 'Lead Author Only';
  if (Array.isArray(raw)) {
    const list = raw.map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const name = item.name || item.author || '';
        const role = item.role ? ` (${item.role})` : '';
        const aff = item.affiliation || item.organization ? ` - ${item.affiliation || item.organization}` : '';
        return `${name}${role}${aff}`.trim();
      }
      return String(item).trim();
    }).filter(Boolean);
    return list.length > 0 ? list.join('; ') : 'Lead Author Only';
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[]') return 'Lead Author Only';
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return formatAuthorsHuman(parsed);
      }
    } catch {
      // ignore JSON parse error
    }
    const parts = trimmed.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts.join('; ') : 'Lead Author Only';
  }
  return 'Lead Author Only';
};

export const getDateRangePresets = () => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const year = now.getFullYear();

  // This Month
  const firstDayOfMonth = new Date(year, now.getMonth(), 1).toISOString().slice(0, 10);
  const lastDayOfMonth = new Date(year, now.getMonth() + 1, 0).toISOString().slice(0, 10);

  // Last 30 Days
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  const last30Str = d30.toISOString().slice(0, 10);

  // Last 6 Months
  const d6m = new Date(now);
  d6m.setMonth(d6m.getMonth() - 6);
  const last6mStr = d6m.toISOString().slice(0, 10);

  // This Year
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  return [
    { key: 'all', label: 'All Time (Full Ledger / Dossier)', startDate: '', endDate: '' },
    { key: 'today', label: 'Today', startDate: todayStr, endDate: todayStr },
    { key: 'this_month', label: 'This Month', startDate: firstDayOfMonth, endDate: lastDayOfMonth },
    { key: 'last_30_days', label: 'Last 30 Days', startDate: last30Str, endDate: todayStr },
    { key: 'last_6_months', label: 'Last 6 Months', startDate: last6mStr, endDate: todayStr },
    { key: 'this_year', label: `This Year (${year})`, startDate: yearStart, endDate: yearEnd },
    { key: 'custom', label: 'Custom Date Range…', startDate: '', endDate: '' },
  ];
};

export const filterByDateRange = (items = [], dateExtractor, startDate = '', endDate = '') => {
  if (!items || !Array.isArray(items)) return [];
  if (!startDate && !endDate) return items;

  return items.filter((item) => {
    let itemDate = typeof dateExtractor === 'function' ? dateExtractor(item) : item?.date;
    if (!itemDate) {
      itemDate = item?.created_at ? String(item.created_at).slice(0, 10) : '';
    }
    if (!itemDate) return true; // keep items without dates so they are not silently lost unless strictly bounded
    
    // Normalize date to YYYY-MM-DD
    const cleanDate = String(itemDate).slice(0, 10);
    if (startDate && cleanDate < startDate) return false;
    if (endDate && cleanDate > endDate) return false;
    return true;
  });
};

