import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Eye,
  Lock,
  MessageSquare,
  Search,
} from 'lucide-react';
import {
  buildWaMeUrl,
  formatTanggalIndonesia,
  hitungSisaHari,
  NakesRecord,
  NavSection,
  renderTemplateWa,
  tentukanStatusSip,
  WaLogEntry,
} from '../types/sip';
import { KpiGrid, KpiSummary } from './KpiGrid';
import { StatusLabel } from './StatusLabel';

type StatusFilter = 'semua' | 'aman' | 'peringatan' | 'kritis';

interface DashboardViewProps {
  nakesList: NakesRecord[];
  waLogs: WaLogEntry[];
  ambangAmanHari: number;
  ambangKritisHari: number;
  templatePesanWa: string;
  canCreateEditDeleteSip: boolean;
  canSendWaManual: boolean;
  canViewWaLogs: boolean;
  onNavigate: (section: NavSection) => void;
  onSelectDetail: (nakes: NakesRecord) => void;
  onQuickSendWa: (nakes: NakesRecord, pesan: string) => void;
  onOpenAddModal: () => void;
}

export function DashboardView({
  nakesList,
  waLogs,
  ambangAmanHari,
  ambangKritisHari,
  templatePesanWa,
  canCreateEditDeleteSip,
  canSendWaManual,
  canViewWaLogs,
  onNavigate,
  onSelectDetail,
  onQuickSendWa,
  onOpenAddModal,
}: DashboardViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('semua');
  const [searchQuery, setSearchQuery] = useState('');

  const enrichedData = useMemo(() => {
    return nakesList
      .map((item) => {
        const sisaHari = hitungSisaHari(item.tanggalBerakhir);
        const status = tentukanStatusSip(sisaHari, ambangAmanHari, ambangKritisHari);
        return { ...item, sisaHari, status };
      })
      .sort((a, b) => a.sisaHari - b.sisaHari); // paling mendesak di atas
  }, [nakesList, ambangAmanHari, ambangKritisHari]);

  const kpiSummary: KpiSummary = useMemo(() => {
    const totalNakes = enrichedData.length;
    let aman = 0;
    let peringatan = 0;
    let kritisKadaluarsa = 0;
    let masihBerlaku = 0;

    for (const item of enrichedData) {
      if (item.status === 'aman') aman++;
      else if (item.status === 'peringatan') peringatan++;
      else kritisKadaluarsa++;

      if (item.sisaHari > 0) {
        masihBerlaku++;
      }
    }

    const now = new Date();
    const waBulanIni = waLogs.filter((log) => {
      const d = new Date(log.waktuKirim);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        log.status !== 'Gagal'
      );
    }).length;

    const tingkatKepatuhan = totalNakes > 0 ? (masihBerlaku / totalNakes) * 100 : 100;

    return {
      totalNakes,
      aman,
      peringatan,
      kritisKadaluarsa,
      waBulanIni,
      tingkatKepatuhan,
    };
  }, [enrichedData, waLogs]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedData.filter((item) => {
      const matchFilter =
        statusFilter === 'semua'
          ? true
          : statusFilter === 'kritis'
          ? item.status === 'kritis' || item.status === 'kadaluarsa'
          : item.status === statusFilter;

      const matchQuery =
        !q ||
        item.nama.toLowerCase().includes(q) ||
        item.profesi.toLowerCase().includes(q) ||
        item.unitKerja.toLowerCase().includes(q) ||
        item.noSip.toLowerCase().includes(q);

      return matchFilter && matchQuery;
    });
  }, [enrichedData, statusFilter, searchQuery]);

  const recentWaLogs = useMemo(() => {
    return [...waLogs]
      .sort((a, b) => new Date(b.waktuKirim).getTime() - new Date(a.waktuKirim).getTime())
      .slice(0, 4);
  }, [waLogs]);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Pemantauan SIP
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ringkasan kepatuhan masa berlaku Surat Izin Praktik tenaga kesehatan RSUD Sidoarjo Barat.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono tabular-nums shrink-0">
          Pembaruan data: {formatTanggalIndonesia(new Date().toISOString().slice(0, 10))}
        </div>
      </div>

      {!canCreateEditDeleteSip && !canSendWaManual && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-slate-600">
          <Lock className="w-4 h-4 text-[#0F766E] shrink-0" aria-hidden="true" />
          <span>
            Anda masuk dengan hak akses <strong className="text-slate-900">Baca Saja (Viewer / Komite &amp; Pimpinan)</strong>. Pemantauan KPI dan detail berkas SIP aktif, sementara ubah data dan pengiriman WhatsApp dibatasi.
          </span>
        </div>
      )}

      {/* 6 KPI Summary Cards */}
      <KpiGrid
        summary={kpiSummary}
        ambangAmanHari={ambangAmanHari}
        ambangKritisHari={ambangKritisHari}
        onCardFilterClick={(filter) => setStatusFilter(filter)}
      />

      {/* Main Content Split: Priority SIP Table + Recent WA Log */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Table Section (8 cols on xl) */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Daftar Prioritas Masa Berlaku SIP
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Diurutkan berdasarkan sisa masa berlaku paling mendekati kadaluarsa
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('data-sip')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:text-[#0D5E57] whitespace-nowrap shrink-0"
              >
                <span>Lihat Semua Data SIP</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div
                className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto"
                role="tablist"
                aria-label="Filter status SIP"
              >
                {(
                  [
                    { id: 'semua', label: 'Semua' },
                    { id: 'aman', label: 'Aman' },
                    { id: 'peringatan', label: 'Peringatan' },
                    { id: 'kritis', label: 'Kritis / Kadaluarsa' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={statusFilter === tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      statusFilter === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, profesi, no. SIP..."
                  aria-label="Cari data tenaga kesehatan"
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                />
              </div>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm font-medium text-slate-700">
                Tidak ada data tenaga kesehatan yang sesuai dengan filter saat ini.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('semua');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Reset Filter
                </button>
                {canCreateEditDeleteSip && (
                  <button
                    type="button"
                    onClick={onOpenAddModal}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57]"
                  >
                    Tambah Data SIP
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Tenaga Kesehatan</th>
                    <th className="py-3 px-4">Nomor SIP</th>
                    <th className="py-3 px-4">Berakhir</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredRows.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/90 transition-colors duration-100"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {item.nama}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          <span>{item.profesi}</span>
                          <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                          <span>{item.unitKerja}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {item.noSip}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                        {formatTanggalIndonesia(item.tanggalBerakhir)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusLabel status={item.status} sisaHari={item.sisaHari} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectDetail(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
                            title="Lihat Detail SIP"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Detail</span>
                          </button>
                          {canSendWaManual && (
                            <a
                              href={buildWaMeUrl(
                                item.noWhatsapp,
                                renderTemplateWa(templatePesanWa, item, item.sisaHari)
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                onQuickSendWa(
                                  item,
                                  renderTemplateWa(templatePesanWa, item, item.sisaHari)
                                )
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0F766E] bg-teal-50 border border-teal-200/80 rounded-md hover:bg-teal-100 transition-colors whitespace-nowrap"
                              title="Buka WhatsApp Click-to-Chat (wa.me) & catat ke log"
                            >
                              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Kirim WA</span>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side Panel: Recent WA Notifications + Compliance Bar */}
        <div className="xl:col-span-4 space-y-6">
          {/* Proporsi Kepatuhan */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Komposisi Status SIP
            </h2>
            <div className="space-y-3">
              {[
                {
                  label: 'Aman (>180 hari)',
                  count: kpiSummary.aman,
                  barColor: 'bg-emerald-600',
                },
                {
                  label: 'Peringatan (31–180 hari)',
                  count: kpiSummary.peringatan,
                  barColor: 'bg-amber-500',
                },
                {
                  label: 'Kritis / Kadaluarsa (≤30 hari)',
                  count: kpiSummary.kritisKadaluarsa,
                  barColor: 'bg-red-600',
                },
              ].map((row) => {
                const pct =
                  kpiSummary.totalNakes > 0
                    ? Math.round((row.count / kpiSummary.totalNakes) * 100)
                    : 0;
                return (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {row.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aktivitas Pengingat WA Terbaru */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Aktivitas WA Terbaru
              </h2>
              {canViewWaLogs && (
                <button
                  type="button"
                  onClick={() => onNavigate('log-wa')}
                  className="text-xs font-semibold text-[#0F766E] hover:text-[#0D5E57] whitespace-nowrap"
                >
                  Semua Log
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-200">
              {recentWaLogs.map((log) => (
                <div key={log.id} className="px-5 py-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {log.namaNakes}
                    </span>
                    <span className="text-xs font-mono text-slate-500 shrink-0">
                      {log.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <span>{log.kategoriPengingat}</span>
                    <span className="mx-1.5 text-slate-300" aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">+{log.noWhatsapp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
