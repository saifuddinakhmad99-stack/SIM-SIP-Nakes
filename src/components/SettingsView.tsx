import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { AppSettings, NakesRecord, renderTemplateWa } from '../types/sip';

interface SettingsViewProps {
  settings: AppSettings;
  sampleNakes?: NakesRecord;
  onSaveSettings: (next: AppSettings) => void;
  onResetDefaults: () => void;
}

const TEMPLATE_VARIABLES = [
  { token: '{nama}', label: 'Nama & Gelar' },
  { token: '{profesi}', label: 'Profesi' },
  { token: '{no_sip}', label: 'Nomor SIP' },
  { token: '{tgl_kadaluarsa}', label: 'Tanggal Kadaluarsa' },
  { token: '{sisa_hari}', label: 'Sisa Hari' },
];

export function SettingsView({
  settings,
  sampleNakes,
  onSaveSettings,
  onResetDefaults,
}: SettingsViewProps) {
  const [form, setForm] = useState<AppSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const previewText = useMemo(() => {
    const fallbackSample: NakesRecord = sampleNakes || {
      id: 'sample',
      nama: 'drg. Maya Puspitasari',
      nip: '19920112 201903 2 015',
      profesi: 'Dokter Gigi',
      unitKerja: 'Poli Gigi & Mulut',
      noSip: '503/0663/SIP-DG/438.5.2/2022',
      noStr: '3521100222145678',
      tanggalTerbit: '2022-05-20',
      tanggalBerakhir: new Date(Date.now() + 180 * 86400000)
        .toISOString()
        .slice(0, 10),
      noWhatsapp: '6282144556677',
    };
    return renderTemplateWa(form.templatePesanWa, fallbackSample, 180);
  }, [form.templatePesanWa, sampleNakes]);

  const handleInsertToken = (token: string) => {
    const el = textareaRef.current;
    if (!el) {
      setForm((prev) => ({
        ...prev,
        templatePesanWa: `${prev.templatePesanWa}${token}`,
      }));
      return;
    }
    const start = el.selectionStart ?? form.templatePesanWa.length;
    const end = el.selectionEnd ?? form.templatePesanWa.length;
    const updated =
      form.templatePesanWa.slice(0, start) +
      token +
      form.templatePesanWa.slice(end);
    setForm((prev) => ({ ...prev, templatePesanWa: updated }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Pengaturan Sistem &amp; Template Pesan WA
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Konfigurasi identitas instansi, ambang batas status SIP, jadwal Cron Job, serta template naskah pengingat WhatsApp resmi.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-lg bg-teal-50 border border-teal-200 text-sm font-medium text-teal-900">
          Pengaturan dan template pesan WhatsApp berhasil disimpan.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pengaturan Template Pesan WA */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pengaturan Template Pesan WA
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Digunakan untuk Cron Job otomatis (H-180, H-90, H-30) maupun tombol Click-to-Chat (wa.me).
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={form.autoReminderAktif}
                onChange={(e) =>
                  setForm({ ...form, autoReminderAktif: e.target.checked })
                }
                className="w-4 h-4 accent-[#0F766E] rounded"
              />
              <span>Auto-Reminder Aktif</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            {(
              [
                { key: 'h180', label: 'Tahap 1: Tepat H-180 (6 Bulan)' },
                { key: 'h90', label: 'Tahap 2: Tepat H-90 (3 Bulan)' },
                { key: 'h30', label: 'Tahap 3: Tepat H-30 (1 Bulan)' },
              ] as const
            ).map((opt) => (
              <label
                key={opt.key}
                className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.jadwalPengingat[opt.key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      jadwalPengingat: {
                        ...form.jadwalPengingat,
                        [opt.key]: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 accent-[#0F766E] rounded"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label
                htmlFor="wa-template-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Naskah Template Pesan Resmi
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.token}
                    type="button"
                    onClick={() => handleInsertToken(v.token)}
                    className="px-2 py-1 text-xs font-mono font-medium text-[#0F766E] bg-teal-50 border border-teal-200 rounded hover:bg-teal-100 transition-colors"
                    title={`Sisipkan ${v.label}`}
                  >
                    +{v.token}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="wa-template-input"
              ref={textareaRef}
              rows={5}
              value={form.templatePesanWa}
              onChange={(e) =>
                setForm({ ...form, templatePesanWa: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Klik tombol variabel di atas untuk menyisipkan{' '}
              <span className="font-mono">{'{nama}'}</span>,{' '}
              <span className="font-mono">{'{profesi}'}</span>,{' '}
              <span className="font-mono">{'{no_sip}'}</span>,{' '}
              <span className="font-mono">{'{tgl_kadaluarsa}'}</span>, atau{' '}
              <span className="font-mono">{'{sisa_hari}'}</span>.
            </p>
          </div>

          {/* Live Template Preview */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              Pratinjau Hasil Pesan (Contoh Skenario H-180)
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
              {previewText}
            </div>
          </div>
        </div>

        {/* Identitas Instansi */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Profil Instansi Kesehatan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Rumah Sakit / Instansi
              </label>
              <input
                type="text"
                value={form.namaInstansi}
                onChange={(e) => setForm({ ...form, namaInstansi: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Faskes Kemenkes
              </label>
              <input
                type="text"
                value={form.kodeFaskes}
                onChange={(e) => setForm({ ...form, kodeFaskes: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Penanggung Jawab Kepegawaian
              </label>
              <input
                type="text"
                value={form.kepalaSubbag}
                onChange={(e) => setForm({ ...form, kepalaSubbag: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Instansi
              </label>
              <input
                type="text"
                value={form.alamatInstansi}
                onChange={(e) => setForm({ ...form, alamatInstansi: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              />
            </div>
          </div>
        </div>

        {/* Ambang Batas Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Ambang Batas Status Masa Berlaku SIP
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Minimum Status Aman (Hari)
              </label>
              <input
                type="number"
                min={60}
                max={365}
                value={form.ambangAmanHari}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ambangAmanHari: Math.max(31, Number(e.target.value) || 180),
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              />
              <p className="text-xs text-slate-500 mt-1">
                SIP dengan sisa hari di atas nilai ini berstatus Aman (Hijau).
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Maksimum Status Kritis (Hari)
              </label>
              <input
                type="number"
                min={7}
                max={90}
                value={form.ambangKritisHari}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ambangKritisHari: Math.max(1, Number(e.target.value) || 30),
                  })
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              />
              <p className="text-xs text-slate-500 mt-1">
                SIP dengan sisa hari 1 s.d. nilai ini berstatus Kritis (Merah).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Reset Data &amp; Pengaturan Awal</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] transition-colors"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
}
