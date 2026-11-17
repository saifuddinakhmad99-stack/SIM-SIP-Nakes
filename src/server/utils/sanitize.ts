/**
 * Sanitizes text input to neutralize potential XSS payloads while keeping
 * valid Indonesian healthcare titles and punctuation intact.
 */
export function sanitizePlainText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<\s*script[^>]*>.*?<\s*\/\s*script\s*>/gis, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .trim();
}

export function normalizeWhatsappNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  if (!digits.startsWith('62')) {
    return `62${digits}`;
  }
  return digits;
}

/**
 * Returns current YYYY-MM-DD in Asia/Jakarta (WIB) timezone.
 */
export function getJakartaDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value || '2026';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

/**
 * Computes integer day difference between expiryDate (YYYY-MM-DD) and today in WIB.
 */
export function calculateDaysRemainingWib(expiryDateStr: string): number {
  const todayStr = getJakartaDateString();
  const todayMs = Date.parse(`${todayStr}T00:00:00+07:00`);
  const expiryMs = Date.parse(`${expiryDateStr}T00:00:00+07:00`);
  return Math.round((expiryMs - todayMs) / (1000 * 60 * 60 * 24));
}

export function formatTanggalIndonesiaWib(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00+07:00`);
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
