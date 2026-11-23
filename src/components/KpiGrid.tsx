import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';

export interface KpiSummary {
  totalNakes: number;
  aman: number;
  peringatan: number;
  kritisKadaluarsa: number;
  waBulanIni: number;
  tingkatKepatuhan: number;
}

interface KpiGridProps {
  summary: KpiSummary;
  ambangAmanHari: number;
  ambangKritisHari: number;
  onCardFilterClick?: (filter: 'semua' | 'aman' | 'peringatan' | 'kritis') => void;
}

export function KpiGrid({
  summary,
  ambangAmanHari,
  ambangKritisHari,
  onCardFilterClick,
}: KpiGridProps) {
  const cards = [
    {
      id: 'total',
      label: 'Total Nakes Terdata',
      value: summary.totalNakes.toLocaleString('id-ID'),
      subtext: 'Tenaga kesehatan aktif dengan catatan SIP',
      icon: Users,
      iconBg: 'bg-teal-50 text-[#0F766E]',
      valueColor: 'text-slate-900',
      filterKey: 'semua' as const,
    },
    {
      id: 'aman',
      label: `Status Aman (>${ambangAmanHari} hari)`,
      value: summary.aman.toLocaleString('id-ID'),
      subtext: 'Masa berlaku SIP masih panjang & kondusif',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-700',
      valueColor: 'text-emerald-700',
      filterKey: 'aman' as const,
    },
    {
      id: 'peringatan',
      label: `Status Peringatan (${ambangKritisHari + 1}-${ambangAmanHari} hari)`,
      value: summary.peringatan.toLocaleString('id-ID'),
      subtext: 'Perlu persiapan berkas & rekomendasi profesi',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-700',
      valueColor: 'text-amber-700',
      filterKey: 'peringatan' as const,
    },
    {
      id: 'kritis',
      label: `Status Kritis/Kadaluarsa (≤${ambangKritisHari} hari)`,
      value: summary.kritisKadaluarsa.toLocaleString('id-ID'),
      subtext: 'Butuh tindak lanjut & perpanjangan segera',
      icon: AlertOctagon,
      iconBg: 'bg-red-50 text-red-700',
      valueColor: 'text-red-700',
      filterKey: 'kritis' as const,
    },
    {
      id: 'wa',
      label: 'WA Terkirim Bulan Ini',
      value: summary.waBulanIni.toLocaleString('id-ID'),
      subtext: 'Notifikasi pengingat masa berlaku tersampaikan',
      icon: MessageSquare,
      iconBg: 'bg-teal-50 text-[#0F766E]',
      valueColor: 'text-slate-900',
      filterKey: null,
    },
    {
      id: 'kepatuhan',
      label: 'Tingkat Kepatuhan (%)',
      value: `${summary.tingkatKepatuhan.toFixed(1).replace('.', ',')}%`,
      subtext: 'Persentase nakes dengan SIP masih berlaku',
      icon: ShieldCheck,
      iconBg: 'bg-teal-50 text-[#0F766E]',
      valueColor: 'text-[#0F766E]',
      filterKey: null,
    },
  ];

  return (
    <section aria-label="Ringkasan Indikator Kinerja SIP">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const isClickable = card.filterKey !== null && Boolean(onCardFilterClick);

          return (
            <div
              key={card.id}
              onClick={
                isClickable && card.filterKey
                  ? () => onCardFilterClick?.(card.filterKey!)
                  : undefined
              }
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={
                isClickable && card.filterKey
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onCardFilterClick?.(card.filterKey!);
                      }
                    }
                  : undefined
              }
              className={`bg-white border border-slate-200 rounded-xl p-5 flex items-start justify-between gap-4 transition-colors duration-150 ${
                isClickable
                  ? 'cursor-pointer hover:border-teal-600/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]'
                  : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-600 leading-snug">
                  {card.label}
                </p>
                <p
                  className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${card.valueColor}`}
                >
                  {card.value}
                </p>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  {card.subtext}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.iconBg}`}
                aria-hidden="true"
              >
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
