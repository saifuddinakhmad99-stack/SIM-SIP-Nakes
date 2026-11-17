export type NavSection =
  | 'dashboard'
  | 'data-sip'
  | 'log-wa'
  | 'analytics'
  | 'audit-logs'
  | 'hak-akses'
  | 'pengaturan';

export type UserRole = 'admin_it' | 'kasi_sdm' | 'operator_sdm' | 'viewer';

export interface RolePermissions {
  role: UserRole;
  label: string;
  deskripsiSingkat: string;
  canViewDashboard: boolean;
  canViewDataSip: boolean;
  canCreateEditDeleteSip: boolean;
  canSendWaManual: boolean;
  canViewWaLogs: boolean;
  canRunCronJob: boolean;
  canExportReports: boolean;
  canViewAnalytics: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
}

export interface UserAccount {
  id: string;
  nama: string;
  nip: string;
  username: string;
  jabatan: string;
  role: UserRole;
  aktif: boolean;
  createdAt: string;
}

export const ROLE_PERMISSION_MATRIX: Record<UserRole, RolePermissions> = {
  admin_it: {
    role: 'admin_it',
    label: 'Admin Sistem (IT)',
    deskripsiSingkat:
      'Konfigurasi sistem, manajemen user & role, integrasi WhatsApp Gateway/template, Cron Job, dan audit log.',
    canViewDashboard: true,
    canViewDataSip: true,
    canCreateEditDeleteSip: true,
    canSendWaManual: true,
    canViewWaLogs: true,
    canRunCronJob: true,
    canExportReports: true,
    canViewAnalytics: true,
    canViewAuditLogs: true,
    canManageUsers: true,
    canManageSettings: true,
  },
  kasi_sdm: {
    role: 'kasi_sdm',
    label: 'Kasi SDM (Supervisor)',
    deskripsiSingkat:
      'Monitoring penuh, verifikasi berkas, dashboard analytics, ekspor laporan resmi, dan tindak lanjut status kritis.',
    canViewDashboard: true,
    canViewDataSip: true,
    canCreateEditDeleteSip: true,
    canSendWaManual: true,
    canViewWaLogs: true,
    canRunCronJob: true,
    canExportReports: true,
    canViewAnalytics: true,
    canViewAuditLogs: true,
    canManageUsers: false,
    canManageSettings: true,
  },
  operator_sdm: {
    role: 'operator_sdm',
    label: 'Operator SDM (Staf)',
    deskripsiSingkat:
      'Tambah, ubah, dan hapus data SIP/STR, unggah file scan PDF, memicu pengiriman WA manual, dan ekspor data.',
    canViewDashboard: true,
    canViewDataSip: true,
    canCreateEditDeleteSip: true,
    canSendWaManual: true,
    canViewWaLogs: true,
    canRunCronJob: false,
    canExportReports: true,
    canViewAnalytics: true,
    canViewAuditLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
  viewer: {
    role: 'viewer',
    label: 'Viewer / Komite & Pimpinan',
    deskripsiSingkat:
      'Akses baca (read-only) dashboard kepatuhan, pencarian status SIP nakes, insight, dan laporan ringkas.',
    canViewDashboard: true,
    canViewDataSip: true,
    canCreateEditDeleteSip: false,
    canSendWaManual: false,
    canViewWaLogs: false,
    canRunCronJob: false,
    canExportReports: false,
    canViewAnalytics: true,
    canViewAuditLogs: false,
    canManageUsers: false,
    canManageSettings: false,
  },
};

export type AuditActionType =
  | 'TAMBAH_DATA'
  | 'EDIT_DATA'
  | 'HAPUS_DATA'
  | 'EKSPOR_LAPORAN'
  | 'UBAH_PENGATURAN'
  | 'JALANKAN_CRON_JOB'
  | 'KIRIM_WA'
  | 'KELOLA_USER'
  | 'GANTI_AKUN'
  | 'RESET_DATA';

export interface AuditLogEntry {
  id: string;
  waktu: string; // ISO string
  operator: string;
  peran: string;
  aksi: AuditActionType;
  target: string;
  deskripsi: string;
}

export type SipStatus = 'aman' | 'peringatan' | 'kritis' | 'kadaluarsa';

export type ProfesiKategori =
  | 'Dokter Spesialis'
  | 'Dokter Umum'
  | 'Perawat'
  | 'Bidan'
  | 'Apoteker'
  | 'Nakes Lainnya'
  | 'Dokter Gigi'
  | 'Tenaga Teknis Kefarmasian'
  | 'Analis Laboratorium'
  | 'Radiografer'
  | 'Fisioterapis';

export interface SipScanFile {
  fileName: string;
  fileType: string;
  fileSize: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface NakesRecord {
  id: string;
  nama: string;
  nip: string;
  profesi: ProfesiKategori;
  unitKerja: string;
  noSip: string;
  noStr: string;
  tanggalTerbit: string; // YYYY-MM-DD
  tanggalBerakhir: string; // YYYY-MM-DD
  noWhatsapp: string;
  catatan?: string;
  terakhirDiingatkan?: string; // ISO string
  scanSip?: SipScanFile;
}

export type WaDeliveryStatus = 'Terkirim' | 'Dibaca' | 'Gagal';

export interface WaLogEntry {
  id: string;
  nakesId: string;
  namaNakes: string;
  profesi: string;
  noWhatsapp: string;
  noSip: string;
  kategoriPengingat:
    | 'H-180'
    | 'H-90'
    | 'H-30'
    | 'Otomatis <180 Hari'
    | 'Click-to-Chat (Manual)';
  pesan: string;
  waktuKirim: string; // ISO string
  status: WaDeliveryStatus;
  metode?: 'Cron Job 08.00 WIB' | 'Click-to-Chat (wa.me)' | 'Sistem Otomatis';
}

export interface AppSettings {
  namaInstansi: string;
  kodeFaskes: string;
  alamatInstansi: string;
  kepalaSubbag: string;
  ambangAmanHari: number; // default 180
  ambangKritisHari: number; // default 30
  autoReminderAktif: boolean;
  jadwalPengingat: {
    h180: boolean;
    h90: boolean;
    h30: boolean;
    h7: boolean;
  };
  templatePesanWa: string;
}

export function getWibDateKey(input: Date | string = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function hitungSisaHari(tanggalBerakhir: string): number {
  if (!tanggalBerakhir) return 0;
  const todayWib = getWibDateKey(new Date()).split('-').map(Number);
  const parts = tanggalBerakhir.split('-').map(Number);
  if (todayWib.length !== 3 || parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return 0;
  }
  const todayUtc = Date.UTC(todayWib[0], todayWib[1] - 1, todayWib[2]);
  const expiryUtc = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  return Math.round((expiryUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

export function tentukanStatusSip(
  sisaHari: number,
  ambangAman = 180,
  ambangKritis = 30
): SipStatus {
  if (sisaHari <= 0) return 'kadaluarsa';
  if (sisaHari <= ambangKritis) return 'kritis';
  if (sisaHari <= ambangAman) return 'peringatan';
  return 'aman';
}

export function formatTanggalIndonesia(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatWaktuIndonesia(isoStr: string): string {
  if (!isoStr) return '-';
  const date = new Date(isoStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function renderTemplateWa(
  template: string,
  nakes: NakesRecord,
  sisaHari: number
): string {
  const statusKeterangan =
    sisaHari <= 0
      ? `telah KADALUARSA (${sisaHari} hari)`
      : `akan kadaluarsa dalam ${sisaHari} hari`;
  const formattedExpiry = formatTanggalIndonesia(nakes.tanggalBerakhir);

  return template
    .replace(/\{nama\}/g, nakes.nama)
    .replace(/\{profesi\}/g, nakes.profesi)
    .replace(/\{no_sip\}/g, nakes.noSip)
    .replace(/\{unit\}/g, nakes.unitKerja)
    .replace(/\{tgl_kadaluarsa\}/g, formattedExpiry)
    .replace(/\{tanggal_berakhir\}/g, formattedExpiry)
    .replace(/\{sisa_hari\}/g, String(sisaHari))
    .replace(/\{status_keterangan\}/g, statusKeterangan);
}

export function buildWaMeUrl(noWhatsapp: string, pesan: string): string {
  const cleanPhone = noWhatsapp.replace(/[^0-9]/g, '');
  const normalizedPhone = cleanPhone.startsWith('0')
    ? `62${cleanPhone.slice(1)}`
    : cleanPhone;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(pesan)}`;
}
