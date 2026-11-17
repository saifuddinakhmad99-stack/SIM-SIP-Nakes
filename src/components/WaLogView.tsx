import { useMemo, useState } from 'react';
import {
  CheckCheck,
  Clock,
  Eye,
  Lock,
  MessageSquare,
  Play,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  formatWaktuIndonesia,
  hitungSisaHari,
  NakesRecord,
  WaDeliveryStatus,
  WaLogEntry,
} from '../types/sip';

export interface CronSimulationItem {
  nakesId: string;
  namaNakes: string;
  profesi: string;
  trigger: 'H-180' | 'H-90' | 'H-30';
  hasil: 'Terkirim' | 'Dicegah Anti-Spam';
  keterangan: string;
}

export interface CronSimulationReport {
  waktuEksekusi: string;
  totalDipindai: number;
  totalCocokTrigger: number;
  totalTerkirim: number;
  totalDicegahAntiSpam: number;
  items: CronSimulationItem[];
}

interface WaLogViewProps {
  logs: WaLogEntry[];
  nakesList: NakesRecord[];
  autoWa180Aktif: boolean;
  canRunCronJob: boolean;
  onRunCronSimulation: () => CronSimulationReport;
}

export function WaLogView({
  logs,
  nakesList,
  autoWa180Aktif,
  canRunCronJob,
  onRunCronSimulation,
}: WaLogViewProps) {
  const [statusFilter, setStatusFilter] = useState<'semua' | WaDeliveryStatus>('semua');
  const [triggerFilter, setTriggerFilter] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<WaLogEntry | null>(null);
  const [lastReport, setLastReport] = useState<CronSimulationReport | null>(null);

  const triggerCounts = useMemo(() => {
    let h180 = 0;
    let h90 = 0;
    let h30 = 0;
    for (const n of nakesList) {
      const sisa = hitungSisaHari(n.tanggalBerakhir);
      if (sisa === 180) h180++;
      else if (sisa === 90) h90++;
      else if (sisa === 30) h30++;
    }
    return { h180, h90, h30, total: h180 + h90 + h30 };
  }, [nakesList]);

  const sortedLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...logs]
      .sort((a, b) => new Date(b.waktuKirim).getTime() - new Date(a.waktuKirim).getTime())
      .filter((log) => {
        const matchStatus = statusFilter === 'semua' || log.status === statusFilter;
        const matchTrigger =
          triggerFilter === 'semua' || log.kategoriPengingat === triggerFilter;
        const matchQuery =
          !q ||
          log.namaNakes.toLowerCase().includes(q) ||
          log.noSip.toLowerCase().includes(q) ||
          log.noWhatsapp.includes(q);
        return matchStatus && matchTrigger && matchQuery;
      });
  }, [logs, statusFilter, triggerFilter, searchQuery]);

  const handleRunCron = () => {
    const report = onRunCronSimulation();
    setLastReport(report);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Log Notifikasi &amp; Simulasi Auto-Reminder
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Simulasi mesin Cron Job harian pukul 08.00 WIB dengan validasi anti-spam dan audit trail pengiriman WhatsApp.
          </p>
        </div>

        {canRunCronJob ? (
          <button
            type="button"
            onClick={handleRunCron}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>Jalankan Simulasi Cron Job Harian</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg shrink-0">
            <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>Eksekusi Cron Job hanya untuk Admin IT &amp; Kasi SDM</span>
          </div>
        )}
      </div>

      {/* Cron Job 08.00 WIB Status & Trigger Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#0F766E] shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Jadwal Penjaringan Otomatis (Cron Job Pukul 08.00 WIB)
              </h2>
              <p className="text-xs text-slate-500">
                Memindai data nakes tepat pada H-180, H-90, dan H-30 dengan pencegahan pengiriman ganda di hari yang sama.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-[#0F766E] shrink-0">
            {autoWa180Aktif ? 'Auto-Reminder Aktif' : 'Auto-Reminder Nonaktif'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs font-medium text-slate-500">
              Tahap 1 · Tepat H-180 (6 Bulan)
            </div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-700">
              {triggerCounts.h180} Nakes
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs font-medium text-slate-500">
              Tahap 2 · Tepat H-90 (3 Bulan)
            </div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-700">
              {triggerCounts.h90} Nakes
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs font-medium text-slate-500">
              Tahap 3 · Tepat H-30 (1 Bulan)
            </div>
            <div className="mt-1 text-xl font-bold font-mono tabular-nums text-red-700">
              {triggerCounts.h30} Nakes
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Report & Anti-Spam Result */}
      {lastReport && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-teal-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Hasil Eksekusi Simulasi Cron Job Harian
              </h3>
              <p className="text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                {formatWaktuIndonesia(lastReport.waktuEksekusi)} · Dipindai:{' '}
                {lastReport.totalDipindai} nakes · Terkirim:{' '}
                {lastReport.totalTerkirim} · Dicegah Anti-Spam:{' '}
                {lastReport.totalDicegahAntiSpam}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastReport(null)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 self-start sm:self-center"
            >
              Tutup Laporan
            </button>
          </div>

          {lastReport.items.length === 0 ? (
            <div className="p-5 text-xs text-slate-600">
              Tidak ada tenaga kesehatan yang berada tepat pada hari trigger H-180, H-90, atau H-30 saat pemindaian dijalankan.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {lastReport.items.map((item) => (
                <div
                  key={`${item.nakesId}-${item.trigger}`}
                  className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900">
                      {item.namaNakes}
                    </span>{' '}
                    <span className="text-slate-500">
                      ({item.profesi}) · Trigger {item.trigger}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.hasil === 'Terkirim' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800">
                        <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Terkirim</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 font-semibold text-amber-800">
                        <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Dicegah Anti-Spam</span>
                      </span>
                    )}
                    <span className="text-slate-500">{item.keterangan}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filter Bar for Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['semua', 'Dibaca', 'Terkirim', 'Gagal'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'semua' ? 'Semua Status' : tab}
              </button>
            ))}
          </div>

          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value)}
            aria-label="Filter kategori trigger"
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
          >
            <option value="semua">Semua Trigger</option>
            <option value="H-180">H-180 (Tahap 1)</option>
            <option value="H-90">H-90 (Tahap 2)</option>
            <option value="H-30">H-30 (Tahap 3)</option>
            <option value="Otomatis <180 Hari">Otomatis &lt;180 Hari</option>
            <option value="Click-to-Chat (Manual)">Click-to-Chat (Manual)</option>
          </select>
        </div>

        <div className="relative w-full lg:w-72">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, no. WA, atau no. SIP..."
            aria-label="Cari log WhatsApp"
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
          />
        </div>
      </div>

      {/* Audit Trail Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Log Riwayat Notifikasi (Audit Trail)
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {sortedLogs.length} catatan tersimpan
          </span>
        </div>
        {sortedLogs.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada catatan log notifikasi WhatsApp untuk filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Waktu Kirim</th>
                  <th className="py-3 px-4">Penerima &amp; No. SIP</th>
                  <th className="py-3 px-4">Trigger &amp; Metode</th>
                  <th className="py-3 px-4">Cuplikan Pesan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {sortedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                      {formatWaktuIndonesia(log.waktuKirim)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{log.namaNakes}</div>
                      <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        +{log.noWhatsapp} · {log.noSip}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-slate-800">
                        {log.kategoriPengingat}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {log.metode || 'Sistem Otomatis'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {log.pesan}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          log.status === 'Dibaca'
                            ? 'text-[#0F766E]'
                            : log.status === 'Terkirim'
                            ? 'text-slate-700'
                            : 'text-red-700'
                        }`}
                      >
                        <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{log.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100"
                      >
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Lihat</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                <h2 className="text-base font-bold text-slate-900">
                  Detail Audit Log Notifikasi WA
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Tutup pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div className="text-xs text-slate-500 space-y-1">
                <div className="font-semibold text-slate-900 text-sm">
                  {selectedLog.namaNakes}
                </div>
                <div className="font-mono tabular-nums">
                  +{selectedLog.noWhatsapp} · {formatWaktuIndonesia(selectedLog.waktuKirim)} ·{' '}
                  {selectedLog.kategoriPengingat} · {selectedLog.status}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 whitespace-pre-line text-sm text-slate-800 leading-relaxed">
                {selectedLog.pesan}
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
