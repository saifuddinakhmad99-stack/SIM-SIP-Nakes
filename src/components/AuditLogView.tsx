import { useMemo, useState } from 'react';
import { ClipboardList, Download, Search, ShieldCheck } from 'lucide-react';
import { AuditActionType, AuditLogEntry, formatWaktuIndonesia } from '../types/sip';

interface AuditLogViewProps {
  auditLogs: AuditLogEntry[];
  onLogAuditExport: (count: number) => void;
}

const ACTION_LABELS: Record<AuditActionType, string> = {
  TAMBAH_DATA: 'Tambah Data SIP',
  EDIT_DATA: 'Edit Data SIP',
  HAPUS_DATA: 'Hapus Data SIP',
  EKSPOR_LAPORAN: 'Ekspor Laporan',
  UBAH_PENGATURAN: 'Ubah Pengaturan / Template',
  JALANKAN_CRON_JOB: 'Simulasi Cron Job',
  KIRIM_WA: 'Kirim Notifikasi WA',
  KELOLA_USER: 'Kelola Akun & Hak Akses',
  GANTI_AKUN: 'Pergantian Akun / Role',
  LOGIN: 'Masuk Sistem (Login)',
  LOGOUT: 'Keluar Sistem (Logout)',
  RESET_DATA: 'Reset Data Awal',
};

export function AuditLogView({ auditLogs, onLogAuditExport }: AuditLogViewProps) {
  const [actionFilter, setActionFilter] = useState<'semua' | AuditActionType>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...auditLogs]
      .sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime())
      .filter((item) => {
        const matchAction = actionFilter === 'semua' || item.aksi === actionFilter;
        const matchSearch =
          !q ||
          item.operator.toLowerCase().includes(q) ||
          item.target.toLowerCase().includes(q) ||
          item.deskripsi.toLowerCase().includes(q);
        return matchAction && matchSearch;
      });
  }, [auditLogs, actionFilter, searchQuery]);

  const handleExportAuditCsv = () => {
    const headers = ['Waktu', 'Operator', 'Peran', 'Aksi', 'Target', 'Deskripsi'];
    const rows = filteredLogs.map((l) => [
      `"${formatWaktuIndonesia(l.waktu)}"`,
      `"${l.operator.replace(/"/g, '""')}"`,
      `"${l.peran.replace(/"/g, '""')}"`,
      `"${ACTION_LABELS[l.aksi]}"`,
      `"${l.target.replace(/"/g, '""')}"`,
      `"${l.deskripsi.replace(/"/g, '""')}"`,
    ]);
    const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `audit-logs-sim-sip-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onLogAuditExport(filteredLogs.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Audit Logs Aktivitas Operator
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Rekam jejak seluruh perubahan data SIP, ekspor laporan, perubahan template WA, dan eksekusi Cron Job.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportAuditCsv}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Ekspor Audit CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as 'semua' | AuditActionType)}
            aria-label="Filter jenis aktivitas"
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
          >
            <option value="semua">Semua Jenis Aktivitas</option>
            {(Object.keys(ACTION_LABELS) as AuditActionType[]).map((key) => (
              <option key={key} value={key}>
                {ACTION_LABELS[key]}
              </option>
            ))}
          </select>

          <span className="text-xs font-mono tabular-nums text-slate-500">
            {filteredLogs.length} dari {auditLogs.length} catatan audit
          </span>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari operator, target, aktivitas..."
            aria-label="Cari catatan audit"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
          />
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
            <h2 className="text-sm font-bold text-slate-900">
              Riwayat Aktivitas Sistem
            </h2>
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>Tersimpan persisten secara lokal</span>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Tidak ada catatan aktivitas yang sesuai dengan filter saat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Identitas Operator</th>
                  <th className="py-3 px-4">Jenis Aksi</th>
                  <th className="py-3 px-4">Objek / Target</th>
                  <th className="py-3 px-4">Keterangan Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {formatWaktuIndonesia(log.waktu)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                        {log.operator}
                      </div>
                      <div className="text-xs text-slate-500">{log.peran}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800">
                        {ACTION_LABELS[log.aksi]}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {log.target}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 leading-relaxed">
                      {log.deskripsi}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
