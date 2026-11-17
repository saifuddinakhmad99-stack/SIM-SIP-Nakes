import { useMemo, useState } from 'react';
import { Check, Copy, Download, FileText } from 'lucide-react';
import {
  formatTanggalIndonesia,
  hitungSisaHari,
  NakesRecord,
  tentukanStatusSip,
  WaLogEntry,
} from '../types/sip';
import { StatusLabel } from './StatusLabel';

interface AnalyticsViewProps {
  nakesList: NakesRecord[];
  waLogs: WaLogEntry[];
  ambangAmanHari: number;
  ambangKritisHari: number;
  namaInstansi: string;
  kepalaSubbag: string;
}

type HorizonOption = 1 | 3 | 6;

export function AnalyticsView({
  nakesList,
  waLogs,
  ambangAmanHari,
  ambangKritisHari,
  namaInstansi,
  kepalaSubbag,
}: AnalyticsViewProps) {
  const [selectedHorizon, setSelectedHorizon] = useState<HorizonOption>(6);
  const [selectedProfesi, setSelectedProfesi] = useState<string | null>(null);
  const [copiedBrief, setCopiedBrief] = useState(false);

  const enriched = useMemo(() => {
    return nakesList.map((item) => {
      const sisaHari = hitungSisaHari(item.tanggalBerakhir);
      const status = tentukanStatusSip(sisaHari, ambangAmanHari, ambangKritisHari);
      return { ...item, sisaHari, status };
    });
  }, [nakesList, ambangAmanHari, ambangKritisHari]);

  const kpiStats = useMemo(() => {
    const total = enriched.length;
    const aman = enriched.filter((n) => n.status === 'aman').length;
    const peringatan = enriched.filter((n) => n.status === 'peringatan').length;
    const kritis = enriched.filter((n) => n.status === 'kritis').length;
    const kadaluarsa = enriched.filter((n) => n.status === 'kadaluarsa').length;
    const aktif = enriched.filter((n) => n.sisaHari > 0).length;
    const kepatuhan = total > 0 ? (aktif / total) * 100 : 100;

    const now = new Date();
    const waBulanIni = waLogs.filter((l) => {
      const d = new Date(l.waktuKirim);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        l.status !== 'Gagal'
      );
    }).length;

    const scanUploaded = enriched.filter((n) => Boolean(n.scanSip)).length;

    return {
      total,
      aman,
      peringatan,
      kritis,
      kadaluarsa,
      kritisGabungan: kritis + kadaluarsa,
      kepatuhan,
      waBulanIni,
      scanUploaded,
    };
  }, [enriched, waLogs]);

  const byProfesi = useMemo(() => {
    const map = new Map<
      string,
      {
        profesi: string;
        total: number;
        aman: number;
        peringatan: number;
        kritis: number;
        kadaluarsa: number;
        kepatuhanPct: number;
      }
    >();

    for (const item of enriched) {
      const current = map.get(item.profesi) || {
        profesi: item.profesi,
        total: 0,
        aman: 0,
        peringatan: 0,
        kritis: 0,
        kadaluarsa: 0,
        kepatuhanPct: 0,
      };
      current.total += 1;
      if (item.status === 'aman') current.aman += 1;
      else if (item.status === 'peringatan') current.peringatan += 1;
      else if (item.status === 'kritis') current.kritis += 1;
      else current.kadaluarsa += 1;
      map.set(item.profesi, current);
    }

    return Array.from(map.values())
      .map((row) => {
        const validCount = row.total - row.kadaluarsa;
        return {
          ...row,
          kepatuhanPct: row.total > 0 ? Math.round((validCount / row.total) * 100) : 100,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [enriched]);

  const gelombangHorizon = useMemo(() => {
    const horizonCounts = {
      1: enriched.filter((n) => n.sisaHari <= 30),
      3: enriched.filter((n) => n.sisaHari <= 90),
      6: enriched.filter((n) => n.sisaHari <= 180),
    };

    const now = new Date();
    const months: Array<{
      label: string;
      key: string;
      count: number;
      items: typeof enriched;
    }> = [];

    for (let i = 0; i < selectedHorizon; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        year: '2-digit',
      }).format(d);
      months.push({ label, key, count: 0, items: [] });
    }

    for (const item of enriched) {
      const ym = item.tanggalBerakhir.slice(0, 7);
      const slot = months.find((m) => m.key === ym);
      if (slot) {
        slot.count += 1;
        slot.items.push(item);
      }
    }

    const maxCount = Math.max(...months.map((m) => m.count), 1);
    const affectedInHorizon = [...horizonCounts[selectedHorizon]].sort(
      (a, b) => a.sisaHari - b.sisaHari
    );

    return {
      horizonCounts,
      months,
      maxCount,
      affectedInHorizon,
    };
  }, [enriched, selectedHorizon]);

  const prioritasKritisList = useMemo(() => {
    return enriched
      .filter((n) => n.sisaHari <= ambangKritisHari)
      .sort((a, b) => a.sisaHari - b.sisaHari);
  }, [enriched, ambangKritisHari]);

  const generatedBriefText = useMemo(() => {
    const bulanTahun = new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const profesiLines = byProfesi
      .map(
        (p) =>
          `- ${p.profesi}: ${p.total} nakes (Aman: ${p.aman}, Peringatan: ${p.peringatan}, Kritis/Kadaluarsa: ${p.kritis + p.kadaluarsa}, Kepatuhan: ${p.kepatuhanPct}%)`
      )
      .join('\n');

    const kritisLines =
      prioritasKritisList.length === 0
        ? '- Tidak terdapat tenaga kesehatan dengan status kritis (≤30 hari) maupun kadaluarsa pada periode ini.'
        : prioritasKritisList
            .map(
              (n, idx) =>
                `${idx + 1}. ${n.nama} (${n.profesi} · ${n.unitKerja}) — No. SIP: ${n.noSip} · Jatuh Tempo: ${formatTanggalIndonesia(n.tanggalBerakhir)} (${n.sisaHari <= 0 ? `KADALUARSA ${n.sisaHari} hr` : `Sisa ${n.sisaHari} hr`})${n.catatan ? ` · Ket: ${n.catatan}` : ''}`
            )
            .join('\n');

    const rekomendasi: string[] = [];
    if (kpiStats.kadaluarsa > 0) {
      rekomendasi.push(
        `1. Koordinasi segera dengan Kepala Instalasi/Komite Medis terkait penjadwalan praktik ${kpiStats.kadaluarsa} nakes berstatus Kadaluarsa (≤0 hari) guna menjaga kepatuhan akreditasi dan kelancaran klaim BPJS Kesehatan.`
      );
    }
    if (kpiStats.kritis > 0) {
      rekomendasi.push(
        `${rekomendasi.length + 1}. Pendampingan percepatan penerbitan surat rekomendasi profesi dan pengajuan berkas ke DPMPTSP/Dinkes Sidoarjo bagi ${kpiStats.kritis} nakes berstatus Kritis (1–${ambangKritisHari} hari).`
      );
    }
    if (kpiStats.peringatan > 0) {
      rekomendasi.push(
        `${rekomendasi.length + 1}. Memastikan ${kpiStats.peringatan} nakes pada fase Peringatan (31–${ambangAmanHari} hari) telah menerima pengingat WhatsApp H-180/H-90 dan mulai menyiapkan kecukupan SKP.`
      );
    }
    if (kpiStats.scanUploaded < kpiStats.total) {
      rekomendasi.push(
        `${rekomendasi.length + 1}. Melengkapi arsip digital scan PDF/JPG SIP (${kpiStats.scanUploaded}/${kpiStats.total} terunggah) untuk kesiapan audit kredensial rumah sakit.`
      );
    }
    if (rekomendasi.length === 0) {
      rekomendasi.push(
        '1. Mempertahankan pemantauan rutin harian pukul 08.00 WIB dan kelengkapan arsip digital seluruh unit layanan.'
      );
    }

    return [
      `MANAGEMENT BRIEF BULANAN — MONITORING LEGALITAS SIP TENAGA KESEHATAN`,
      `Instansi: ${namaInstansi} · Periode: ${bulanTahun}`,
      `Disusun oleh: ${kepalaSubbag} (Sub-Bagian SDM / Kepegawaian)`,
      ``,
      `1. EXECUTIVE SUMMARY`,
      `Tingkat kepatuhan legalitas Surat Izin Praktik (SIP) aktif di ${namaInstansi} pada ${bulanTahun} tercatat sebesar ${kpiStats.kepatuhan.toFixed(1).replace('.', ',')}% dari total ${kpiStats.total} tenaga kesehatan terdata. Sebanyak ${kpiStats.kritisGabungan} tenaga kesehatan memerlukan tindak lanjut prioritas (≤${ambangKritisHari} hari atau kadaluarsa), sementara ${gelombangHorizon.horizonCounts[6].length} tenaga kesehatan diproyeksikan memasuki jatuh tempo dalam 6 bulan ke depan.`,
      ``,
      `2. KPI UTAMA`,
      `- Total Nakes Terdata       : ${kpiStats.total} Nakes`,
      `- Status Aman (>${ambangAmanHari} hr)     : ${kpiStats.aman} Nakes`,
      `- Status Peringatan (31–${ambangAmanHari} hr): ${kpiStats.peringatan} Nakes`,
      `- Status Kritis (1–${ambangKritisHari} hr)   : ${kpiStats.kritis} Nakes`,
      `- Status Kadaluarsa (≤0 hr) : ${kpiStats.kadaluarsa} Nakes`,
      `- WA Terkirim Bulan Ini     : ${kpiStats.waBulanIni} Pesan`,
      `- Tingkat Kepatuhan SIP     : ${kpiStats.kepatuhan.toFixed(1).replace('.', ',')}%`,
      ``,
      `3. DISTRIBUSI KEPATUHAN PER PROFESI`,
      profesiLines,
      ``,
      `4. DAFTAR PRIORITAS KRITIS (≤${ambangKritisHari} HARI & KADALUARSA)`,
      kritisLines,
      ``,
      `5. REKOMENDASI TINDAKAN SDM`,
      rekomendasi.join('\n'),
    ].join('\n');
  }, [
    byProfesi,
    prioritasKritisList,
    kpiStats,
    gelombangHorizon,
    ambangAmanHari,
    ambangKritisHari,
    namaInstansi,
    kepalaSubbag,
  ]);

  const handleCopyBrief = async () => {
    try {
      await navigator.clipboard.writeText(generatedBriefText);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2500);
    } catch {
      // Fallback textarea copy
      const el = document.createElement('textarea');
      el.value = generatedBriefText;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedBrief(true);
      setTimeout(() => setCopiedBrief(false), 2500);
    }
  };

  const handleDownloadBrief = () => {
    const blob = new Blob([generatedBriefText], {
      type: 'text/plain;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `management-brief-sip-rsud-sidoarjo-barat-${new Date().toISOString().slice(0, 10)}.txt`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedProfesiWorkers = useMemo(() => {
    if (!selectedProfesi) return [];
    return enriched
      .filter((n) => n.profesi === selectedProfesi)
      .sort((a, b) => a.sisaHari - b.sisaHari);
  }, [enriched, selectedProfesi]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Analytics &amp; Management Brief Eksekutif
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Visualisasi kepatuhan per profesi, proyeksi gelombang jatuh tempo SIP 1, 3, dan 6 bulan, serta generator laporan pimpinan.
        </p>
      </div>

      {/* Interactive Wave Projection (1, 3, 6 Months) & Profession Compliance Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Proyeksi Gelombang Jatuh Tempo 1, 3, 6 Bulan */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Proyeksi Gelombang Jatuh Tempo SIP
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih rentang waktu 1, 3, atau 6 bulan ke depan untuk melihat beban perpanjangan
              </p>
            </div>

            <div
              className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
              role="tablist"
              aria-label="Pilih rentang proyeksi"
            >
              {([1, 3, 6] as const).map((h) => (
                <button
                  key={h}
                  type="button"
                  role="tab"
                  aria-selected={selectedHorizon === h}
                  onClick={() => setSelectedHorizon(h)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    selectedHorizon === h
                      ? 'bg-[#0F766E] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {h} Bulan
                </button>
              ))}
            </div>
          </div>

          {/* 3 Milestone Summary Strip */}
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { h: 1 as const, label: '1 Bulan (≤30 hr)', tone: 'text-red-700' },
                { h: 3 as const, label: '3 Bulan (≤90 hr)', tone: 'text-amber-700' },
                { h: 6 as const, label: '6 Bulan (≤180 hr)', tone: 'text-[#0F766E]' },
              ] as const
            ).map((m) => (
              <button
                key={m.h}
                type="button"
                onClick={() => setSelectedHorizon(m.h)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedHorizon === m.h
                    ? 'border-[#0F766E] bg-teal-50/40'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                }`}
              >
                <div className="text-xs text-slate-500">{m.label}</div>
                <div className={`mt-1 text-xl font-bold font-mono tabular-nums ${m.tone}`}>
                  {gelombangHorizon.horizonCounts[m.h].length} SIP
                </div>
              </button>
            ))}
          </div>

          {/* Monthly Bar Chart */}
          <div className="h-48 flex items-end gap-3 pt-4 border-b border-slate-200 pb-3">
            {gelombangHorizon.months.map((m) => {
              const heightPct = Math.round(
                (m.count / gelombangHorizon.maxCount) * 100
              );
              return (
                <div
                  key={m.key}
                  className="flex-1 flex flex-col items-center justify-end h-full gap-2"
                >
                  <span className="text-xs font-mono tabular-nums font-semibold text-slate-700">
                    {m.count}
                  </span>
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-md h-32 flex items-end overflow-hidden">
                    <div
                      className="w-full rounded-t-md transition-all duration-300"
                      style={{
                        height: `${Math.max(heightPct, m.count > 0 ? 18 : 6)}%`,
                        backgroundColor: m.count > 0 ? '#0F766E' : '#E2E8F0',
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* List of Nakes Falling Due Within Selected Horizon */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Tenaga Kesehatan Masuk Gelombang {selectedHorizon} Bulan ({gelombangHorizon.affectedInHorizon.length})
            </div>
            {gelombangHorizon.affectedInHorizon.length === 0 ? (
              <p className="text-xs text-slate-500">
                Tidak ada SIP yang jatuh tempo pada rentang {selectedHorizon} bulan ke depan.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg max-h-56 overflow-y-auto">
                {gelombangHorizon.affectedInHorizon.map((n) => (
                  <div
                    key={n.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {n.nama}
                      </div>
                      <div className="text-slate-500 truncate">
                        {n.profesi} · {n.unitKerja}
                      </div>
                    </div>
                    <StatusLabel status={n.status} sisaHari={n.sisaHari} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Stacked Compliance per Profesi */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Distribusi Kepatuhan per Profesi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik baris profesi untuk memeriksa rincian tenaga kesehatan
            </p>
          </div>

          <div className="space-y-3">
            {byProfesi.map((row) => {
              const amanPct = (row.aman / row.total) * 100;
              const warnPct = (row.peringatan / row.total) * 100;
              const critPct = ((row.kritis + row.kadaluarsa) / row.total) * 100;
              const isSelected = selectedProfesi === row.profesi;

              return (
                <button
                  key={row.profesi}
                  type="button"
                  onClick={() =>
                    setSelectedProfesi(isSelected ? null : row.profesi)
                  }
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-[#0F766E] bg-teal-50/40'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-2">
                    <span className="font-semibold text-slate-900">
                      {row.profesi}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {row.total} Nakes · {row.kepatuhanPct}% valid
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    {amanPct > 0 && (
                      <div
                        className="bg-emerald-600 h-full"
                        style={{ width: `${amanPct}%` }}
                        title={`Aman: ${row.aman}`}
                      />
                    )}
                    {warnPct > 0 && (
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${warnPct}%` }}
                        title={`Peringatan: ${row.peringatan}`}
                      />
                    )}
                    {critPct > 0 && (
                      <div
                        className="bg-red-600 h-full"
                        style={{ width: `${critPct}%` }}
                        title={`Kritis/Kadaluarsa: ${row.kritis + row.kadaluarsa}`}
                      />
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] font-mono tabular-nums text-slate-500">
                    <span>Aman: {row.aman}</span>
                    <span>·</span>
                    <span>Peringatan: {row.peringatan}</span>
                    <span>·</span>
                    <span>Kritis/Exp: {row.kritis + row.kadaluarsa}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedProfesi && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">
                  Rincian Profesi: {selectedProfesi}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedProfesi(null)}
                  className="text-[#0F766E] font-semibold hover:underline"
                >
                  Tutup
                </button>
              </div>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {selectedProfesiWorkers.map((w) => (
                  <div
                    key={w.id}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {w.nama}
                      </div>
                      <div className="text-slate-500 truncate">{w.unitKerja}</div>
                    </div>
                    <StatusLabel status={w.status} sisaHari={w.sisaHari} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Management Brief Generator */}
      <section
        aria-label="Management Brief Generator"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#0F766E] shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Management Brief Generator (Siap Lapor Direktur RSUD)
              </h2>
              <p className="text-xs text-slate-500">
                Ringkasan eksekutif bulanan otomatis mencakup Executive Summary, KPI, Distribusi Profesi, Daftar Kritis, dan Rekomendasi SDM.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleDownloadBrief}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Unduh .TXT</span>
            </button>
            <button
              type="button"
              onClick={handleCopyBrief}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] transition-colors whitespace-nowrap"
            >
              {copiedBrief ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>Naskah Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" aria-hidden="true" />
                  <span>Salin Naskah Brief</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-6">
          <pre className="p-5 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
            {generatedBriefText}
          </pre>
        </div>
      </section>
    </div>
  );
}
