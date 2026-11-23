import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  Lock,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  buildWaMeUrl,
  formatTanggalIndonesia,
  hitungSisaHari,
  NakesRecord,
  renderTemplateWa,
  tentukanStatusSip,
} from '../types/sip';
import { StatusLabel } from './StatusLabel';

interface DataSipViewProps {
  nakesList: NakesRecord[];
  ambangAmanHari: number;
  ambangKritisHari: number;
  templatePesanWa: string;
  canCreateEditDeleteSip: boolean;
  canSendWaManual: boolean;
  canExportReports: boolean;
  onAddNew: () => void;
  onEdit: (nakes: NakesRecord) => void;
  onDelete: (id: string) => void;
  onViewDetail: (nakes: NakesRecord) => void;
  onQuickSendWa: (nakes: NakesRecord, pesan: string) => void;
  onLogExport: (format: 'CSV' | 'Excel', count: number) => void;
}

export function DataSipView({
  nakesList,
  ambangAmanHari,
  ambangKritisHari,
  templatePesanWa,
  canCreateEditDeleteSip,
  canSendWaManual,
  canExportReports,
  onAddNew,
  onEdit,
  onDelete,
  onViewDetail,
  onQuickSendWa,
  onLogExport,
}: DataSipViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [profesiFilter, setProfesiFilter] = useState('semua');
  const [unitFilter, setUnitFilter] = useState('semua');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const enrichedList = useMemo(() => {
    return nakesList.map((n) => {
      const sisaHari = hitungSisaHari(n.tanggalBerakhir);
      const status = tentukanStatusSip(sisaHari, ambangAmanHari, ambangKritisHari);
      return { ...n, sisaHari, status };
    });
  }, [nakesList, ambangAmanHari, ambangKritisHari]);

  const profesiOptions = useMemo(() => {
    const set = new Set(nakesList.map((n) => n.profesi));
    return Array.from(set).sort();
  }, [nakesList]);

  const unitOptions = useMemo(() => {
    const set = new Set(nakesList.map((n) => n.unitKerja).filter(Boolean));
    return Array.from(set).sort();
  }, [nakesList]);

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedList
      .filter((item) => {
        const matchProfesi =
          profesiFilter === 'semua' || item.profesi === profesiFilter;
        const matchUnit =
          unitFilter === 'semua' || item.unitKerja === unitFilter;
        const matchStatus =
          statusFilter === 'semua' ? true : item.status === statusFilter;
        const matchSearch =
          !q ||
          item.nama.toLowerCase().includes(q) ||
          item.nip.toLowerCase().includes(q) ||
          item.noSip.toLowerCase().includes(q) ||
          item.noStr.toLowerCase().includes(q) ||
          item.unitKerja.toLowerCase().includes(q);
        return matchProfesi && matchUnit && matchStatus && matchSearch;
      })
      .sort((a, b) => a.sisaHari - b.sisaHari);
  }, [enrichedList, profesiFilter, unitFilter, statusFilter, searchQuery]);

  const hasActiveFilter =
    searchQuery.trim() !== '' ||
    profesiFilter !== 'semua' ||
    unitFilter !== 'semua' ||
    statusFilter !== 'semua';

  const handleExportCsv = () => {
    const headers = [
      'Nama',
      'NIP/NRP',
      'Profesi',
      'Unit Kerja',
      'Nomor SIP',
      'Nomor STR',
      'Tanggal Terbit',
      'Tanggal Berakhir',
      'Sisa Hari',
      'Status',
      'Scan SIP',
      'No WhatsApp',
    ];
    const rows = filteredList.map((item) => [
      `"${item.nama.replace(/"/g, '""')}"`,
      `"${item.nip}"`,
      `"${item.profesi}"`,
      `"${item.unitKerja}"`,
      `"${item.noSip}"`,
      `"${item.noStr}"`,
      item.tanggalTerbit,
      item.tanggalBerakhir,
      String(item.sisaHari),
      item.status.toUpperCase(),
      item.scanSip ? `"${item.scanSip.fileName}"` : '"Belum diunggah"',
      item.noWhatsapp,
    ]);
    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `laporan-sip-nakes-rsud-sidoarjo-barat-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
    onLogExport('CSV', filteredList.length);
  };

  const handleExportExcel = () => {
    const escapeHtml = (val: string) =>
      val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const rowsHtml = filteredList
      .map(
        (item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(item.nama)}</td>
          <td style="mso-number-format:'\\@';">${escapeHtml(item.nip)}</td>
          <td>${escapeHtml(item.profesi)}</td>
          <td>${escapeHtml(item.unitKerja)}</td>
          <td style="mso-number-format:'\\@';">${escapeHtml(item.noSip)}</td>
          <td style="mso-number-format:'\\@';">${escapeHtml(item.noStr)}</td>
          <td>${escapeHtml(item.tanggalTerbit)}</td>
          <td>${escapeHtml(item.tanggalBerakhir)}</td>
          <td>${item.sisaHari}</td>
          <td>${item.status.toUpperCase()}</td>
          <td>${item.scanSip ? escapeHtml(item.scanSip.fileName) : 'Belum diunggah'}</td>
          <td style="mso-number-format:'\\@';">+${escapeHtml(item.noWhatsapp)}</td>
        </tr>`
      )
      .join('');

    const filterSummary = `Filter: Profesi=${profesiFilter} | Unit=${unitFilter} | Status=${statusFilter}${searchQuery ? ` | Cari="${escapeHtml(searchQuery)}"` : ''} | Total=${filteredList.length} Nakes`;

    const htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /></head>
      <body>
        <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;">
          <thead>
            <tr>
              <th colspan="13" style="font-weight:bold;font-size:14px;text-align:left;background-color:#F0FDFA;color:#0F766E;">LAPORAN REKAPITULASI DATA SIP TENAGA KESEHATAN - RSUD SIDOARJO BARAT</th>
            </tr>
            <tr>
              <th colspan="13" style="font-weight:normal;font-size:11px;text-align:left;color:#475569;">${filterSummary}</th>
            </tr>
            <tr style="background-color:#0F766E;color:#FFFFFF;font-weight:bold;">
              <th>No</th>
              <th>Nama Lengkap &amp; Gelar</th>
              <th>NIP/NIK</th>
              <th>Profesi</th>
              <th>Unit Kerja</th>
              <th>Nomor SIP</th>
              <th>Nomor STR</th>
              <th>Tanggal Terbit</th>
              <th>Tanggal Kadaluarsa</th>
              <th>Sisa Hari</th>
              <th>Status</th>
              <th>Berkas Scan SIP</th>
              <th>No. WhatsApp</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
      </html>`;

    const blob = new Blob(['\uFEFF', htmlTable], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `laporan-sip-nakes-rsud-sidoarjo-barat-${new Date().toISOString().slice(0, 10)}.xls`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
    onLogExport('Excel', filteredList.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Master Data SIP &amp; Arsip Digital
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola arsip Surat Izin Praktik, scan dokumen legal, dan jadwal pembaruan seluruh unit layanan.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {canExportReports && (
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((prev) => !prev)}
                aria-expanded={exportMenuOpen}
                aria-haspopup="menu"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Ekspor CSV/Excel</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              </button>
              {exportMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportExcel}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                    <span>Ekspor Excel (.xls)</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleExportCsv}
                    className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                  >
                    <Download className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <span>Ekspor CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {canCreateEditDeleteSip && (
            <button
              type="button"
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Tambah Data SIP</span>
            </button>
          )}
        </div>
      </div>

      {!canCreateEditDeleteSip && !canSendWaManual && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-slate-600">
          <Lock className="w-4 h-4 text-[#0F766E] shrink-0" aria-hidden="true" />
          <span>
            Mode Akses Baca (Read-Only): Anda dapat mencari, memfilter, dan meninjau detail serta scan SIP tanpa hak mengubah atau mengekspor data.
          </span>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama nakes atau nomor SIP..."
              aria-label="Cari tenaga kesehatan atau nomor SIP"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={profesiFilter}
              onChange={(e) => setProfesiFilter(e.target.value)}
              aria-label="Filter kategori profesi"
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
            >
              <option value="semua">Semua Profesi</option>
              {profesiOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              aria-label="Filter unit kerja"
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
            >
              <option value="semua">Semua Unit Kerja</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter status masa berlaku"
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
            >
              <option value="semua">Semua Status</option>
              <option value="aman">Hijau · Aman (&gt;{ambangAmanHari} hr)</option>
              <option value="peringatan">
                Kuning · Peringatan ({ambangKritisHari + 1}–{ambangAmanHari} hr)
              </option>
              <option value="kritis">
                Merah · Kritis (1–{ambangKritisHari} hr)
              </option>
              <option value="kadaluarsa">
                Merah Pekat · Kadaluarsa (≤0 hr)
              </option>
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setProfesiFilter('semua');
                  setUnitFilter('semua');
                  setStatusFilter('semua');
                }}
                className="px-3 py-2 text-xs font-semibold text-[#0F766E] hover:bg-teal-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Menampilkan{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-800">
              {filteredList.length}
            </span>{' '}
            dari{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-800">
              {nakesList.length}
            </span>{' '}
            tenaga kesehatan
          </span>
          <span>Urutan: sisa masa berlaku paling mendekati kadaluarsa</span>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">
              Data SIP tidak ditemukan untuk kriteria pencarian saat ini.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setProfesiFilter('semua');
                setUnitFilter('semua');
                setStatusFilter('semua');
              }}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Tampilkan Semua Data
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama &amp; Unit</th>
                  <th className="py-3 px-4">Profesi</th>
                  <th className="py-3 px-4">Nomor SIP &amp; STR</th>
                  <th className="py-3 px-4">Scan SIP</th>
                  <th className="py-3 px-4">Masa Berlaku</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/90">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {item.nama}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.unitKerja} ·{' '}
                        <span className="font-mono tabular-nums">{item.nip}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {item.profesi}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs text-slate-800 whitespace-nowrap">
                        SIP: {item.noSip}
                      </div>
                      <div className="font-mono text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                        STR: {item.noStr}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                      {item.scanSip ? (
                        <button
                          type="button"
                          onClick={() => onViewDetail(item)}
                          className="inline-flex items-center gap-1.5 font-medium text-[#0F766E] hover:underline"
                          title={item.scanSip.fileName}
                        >
                          <FileCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span className="max-w-[120px] truncate">{item.scanSip.fileName}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">Belum ada</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                      <div>{formatTanggalIndonesia(item.tanggalTerbit)}</div>
                      <div className="text-slate-900 font-semibold">
                        s.d. {formatTanggalIndonesia(item.tanggalBerakhir)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusLabel status={item.status} sisaHari={item.sisaHari} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {canCreateEditDeleteSip && confirmDeleteId === item.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(item.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
                          >
                            Hapus
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewDetail(item)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                            title="Lihat Detail"
                            aria-label={`Lihat detail ${item.nama}`}
                          >
                            <Eye className="w-4 h-4" />
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0F766E] bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors whitespace-nowrap"
                              title="Buka WhatsApp Click-to-Chat (wa.me) & catat ke log"
                              aria-label={`Kirim WA ke ${item.nama}`}
                            >
                              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Kirim WA</span>
                            </a>
                          )}
                          {canCreateEditDeleteSip && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEdit(item)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                                title="Edit Data SIP"
                                aria-label={`Edit data ${item.nama}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                                title="Hapus Data"
                                aria-label={`Hapus data ${item.nama}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
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
