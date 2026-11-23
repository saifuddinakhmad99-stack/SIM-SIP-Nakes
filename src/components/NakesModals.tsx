import React, { useEffect, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FileCheck,
  FileText,
  MessageSquare,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  formatTanggalIndonesia,
  formatWaktuIndonesia,
  hitungSisaHari,
  NakesRecord,
  ProfesiKategori,
  renderTemplateWa,
  SipScanFile,
  tentukanStatusSip,
  WaLogEntry,
} from '../types/sip';
import { StatusLabel } from './StatusLabel';

const PROFESI_OPTIONS: ProfesiKategori[] = [
  'Dokter Spesialis',
  'Dokter Umum',
  'Perawat',
  'Bidan',
  'Apoteker',
  'Nakes Lainnya',
  'Dokter Gigi',
  'Analis Laboratorium',
  'Radiografer',
  'Fisioterapis',
  'Tenaga Teknis Kefarmasian',
];

const UNIT_SUGGESTIONS = [
  'Instalasi Gawat Darurat (IGD)',
  'Poli Penyakit Dalam',
  'Poli Gigi & Mulut',
  'Poli Umum',
  'Ruang Bersalin (VK)',
  'Intensive Care Unit (ICU)',
  'Instalasi Farmasi Rawat Inap',
  'Instalasi Patologi Klinik',
  'Instalasi Radiologi',
];

const MAX_SCAN_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface NakesFormModalProps {
  isOpen: boolean;
  initialData: NakesRecord | null;
  autoWa180Aktif: boolean;
  onClose: () => void;
  onSave: (record: Omit<NakesRecord, 'id'>, existingId?: string) => void;
}

export function NakesFormModal({
  isOpen,
  initialData,
  autoWa180Aktif,
  onClose,
  onSave,
}: NakesFormModalProps) {
  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [profesi, setProfesi] = useState<ProfesiKategori>('Perawat');
  const [unitKerja, setUnitKerja] = useState('');
  const [noSip, setNoSip] = useState('');
  const [noStr, setNoStr] = useState('');
  const [tanggalTerbit, setTanggalTerbit] = useState('');
  const [tanggalBerakhir, setTanggalBerakhir] = useState('');
  const [noWhatsapp, setNoWhatsapp] = useState('');
  const [catatan, setCatatan] = useState('');
  const [scanSip, setScanSip] = useState<SipScanFile | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    if (initialData) {
      setNama(initialData.nama);
      setNip(initialData.nip);
      setProfesi(initialData.profesi);
      setUnitKerja(initialData.unitKerja);
      setNoSip(initialData.noSip);
      setNoStr(initialData.noStr);
      setTanggalTerbit(initialData.tanggalTerbit);
      setTanggalBerakhir(initialData.tanggalBerakhir);
      setNoWhatsapp(initialData.noWhatsapp);
      setCatatan(initialData.catatan || '');
      setScanSip(initialData.scanSip);
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const fiveYearsLater = new Date();
      fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);
      setNama('');
      setNip('');
      setProfesi('Perawat');
      setUnitKerja('');
      setNoSip('');
      setNoStr('');
      setTanggalTerbit(today);
      setTanggalBerakhir(fiveYearsLater.toISOString().slice(0, 10));
      setNoWhatsapp('628');
      setCatatan('');
      setScanSip(undefined);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const previewSisaHari = tanggalBerakhir ? hitungSisaHari(tanggalBerakhir) : null;
  const willTriggerAutoWa =
    autoWa180Aktif && previewSisaHari !== null && previewSisaHari < 180;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg('Format berkas scan SIP harus berupa PDF, JPG, PNG, atau WEBP.');
      return;
    }

    if (file.size > MAX_SCAN_SIZE_BYTES) {
      setErrorMsg('Ukuran berkas scan SIP maksimal 2 MB.');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setScanSip({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString(),
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !noSip.trim() || !tanggalBerakhir || !noWhatsapp.trim()) {
      setErrorMsg('Harap lengkapi Nama, Nomor SIP, Tanggal Berakhir, dan Nomor WhatsApp.');
      return;
    }
    if (tanggalTerbit && tanggalBerakhir < tanggalTerbit) {
      setErrorMsg('Tanggal berakhir SIP tidak boleh lebih awal dari tanggal terbit.');
      return;
    }

    onSave(
      {
        nama: nama.trim(),
        nip: nip.trim() || '-',
        profesi,
        unitKerja: unitKerja.trim() || 'Pelayanan Medis',
        noSip: noSip.trim(),
        noStr: noStr.trim() || '-',
        tanggalTerbit,
        tanggalBerakhir,
        noWhatsapp: noWhatsapp.replace(/[^0-9]/g, ''),
        catatan: catatan.trim(),
        terakhirDiingatkan: initialData?.terakhirDiingatkan,
        scanSip,
      },
      initialData?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nakes-form-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 id="nakes-form-title" className="text-base font-bold text-slate-900">
            {initialData ? 'Perbarui Data SIP Tenaga Kesehatan' : 'Tambah Data SIP Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
            aria-label="Tutup form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap &amp; Gelar *
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: dr. Hendra Wijaya, Sp.PD"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP / NIK *
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="19820415 201001 1 014"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Profesi *
              </label>
              <select
                value={profesi}
                onChange={(e) => setProfesi(e.target.value as ProfesiKategori)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              >
                {PROFESI_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Kerja / Instalasi *
              </label>
              <input
                type="text"
                list="unit-kerja-options"
                value={unitKerja}
                onChange={(e) => setUnitKerja(e.target.value)}
                placeholder="Contoh: Instalasi Gawat Darurat (IGD)"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                required
              />
              <datalist id="unit-kerja-options">
                {UNIT_SUGGESTIONS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. WhatsApp Aktif *
              </label>
              <input
                type="text"
                value={noWhatsapp}
                onChange={(e) => setNoWhatsapp(e.target.value)}
                placeholder="6281234567890"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. SIP *
              </label>
              <input
                type="text"
                value={noSip}
                onChange={(e) => setNoSip(e.target.value)}
                placeholder="503/0412/SIP-DS/438.5.2/2026"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                No. STR
              </label>
              <input
                type="text"
                value={noStr}
                onChange={(e) => setNoStr(e.target.value)}
                placeholder="3511401322110482"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Terbit
              </label>
              <input
                type="date"
                value={tanggalTerbit}
                onChange={(e) => setTanggalTerbit(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Kadaluarsa *
              </label>
              <input
                type="date"
                value={tanggalBerakhir}
                onChange={(e) => setTanggalBerakhir(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                required
              />
            </div>

            {willTriggerAutoWa && (
              <div className="sm:col-span-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Masa berlaku SIP tercatat{' '}
                <span className="font-mono font-semibold tabular-nums">
                  {previewSisaHari! < 0
                    ? `kadaluarsa ${Math.abs(previewSisaHari!)} hari`
                    : `${previewSisaHari} hari lagi`}
                </span>{' '}
                (&lt;180 hari). Sistem akan otomatis mengirimkan notifikasi pengingat WhatsApp setelah data disimpan.
              </div>
            )}

            {/* Upload Scan SIP */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Upload Scan Dokumen SIP (PDF / JPG / PNG, Maks. 2 MB)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {!scanSip ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border border-dashed border-slate-300 hover:border-[#0F766E] bg-slate-50 hover:bg-teal-50/40 rounded-lg px-4 py-5 flex flex-col items-center justify-center gap-1.5 text-center transition-colors"
                >
                  <Upload className="w-5 h-5 text-[#0F766E]" aria-hidden="true" />
                  <span className="text-xs font-semibold text-slate-800">
                    Pilih Berkas Scan SIP untuk Diunggah
                  </span>
                  <span className="text-xs text-slate-500">
                    Mendukung PDF, JPG, PNG, atau WEBP maksimal 2 MB
                  </span>
                </button>
              ) : (
                <div className="border border-slate-200 bg-slate-50 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {scanSip.fileType.startsWith('image/') ? (
                      <img
                        src={scanSip.dataUrl}
                        alt={`Pratinjau ${scanSip.fileName}`}
                        className="w-11 h-11 rounded object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" aria-hidden="true" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {scanSip.fileName}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
                        {formatFileSize(scanSip.fileSize)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
                    >
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScanSip(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                      aria-label="Hapus berkas scan SIP"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Kepegawaian
              </label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Keterangan proses rekomendasi profesi, berkas MPP, dll."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] transition-colors whitespace-nowrap"
            >
              {initialData ? 'Simpan Perubahan' : 'Simpan Data SIP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface NakesDetailModalProps {
  nakes: NakesRecord | null;
  ambangAmanHari: number;
  ambangKritisHari: number;
  waLogs: WaLogEntry[];
  canEdit?: boolean;
  canSendWa?: boolean;
  onClose: () => void;
  onEdit: (nakes: NakesRecord) => void;
  onOpenSendWa: (nakes: NakesRecord) => void;
}

export function NakesDetailModal({
  nakes,
  ambangAmanHari,
  ambangKritisHari,
  waLogs,
  canEdit = true,
  canSendWa = true,
  onClose,
  onEdit,
  onOpenSendWa,
}: NakesDetailModalProps) {
  if (!nakes) return null;

  const sisaHari = hitungSisaHari(nakes.tanggalBerakhir);
  const status = tentukanStatusSip(sisaHari, ambangAmanHari, ambangKritisHari);
  const relatedLogs = waLogs.filter((l) => l.nakesId === nakes.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-nakes-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="w-4 h-4 text-[#0F766E] shrink-0" aria-hidden="true" />
            <h2 id="detail-nakes-title" className="text-base font-bold text-slate-900 truncate">
              Detail Surat Izin Praktik
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup detail"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Identity Summary */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-5 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{nakes.nama}</h3>
              <p className="mt-1 text-sm text-slate-600">
                <span>{nakes.profesi}</span>
                <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
                <span>{nakes.unitKerja}</span>
              </p>
              <p className="mt-1 text-xs font-mono text-slate-500 tabular-nums">
                NIP/NRP: {nakes.nip}
              </p>
            </div>
            <div className="shrink-0">
              <StatusLabel status={status} sisaHari={sisaHari} />
            </div>
          </div>

          {/* Credential Grid */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Nomor SIP</dt>
              <dd className="mt-1 font-mono text-slate-900 font-medium break-all">
                {nakes.noSip}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Nomor STR</dt>
              <dd className="mt-1 font-mono text-slate-900 font-medium break-all">
                {nakes.noStr}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Tanggal Terbit</dt>
              <dd className="mt-1 font-mono tabular-nums text-slate-900">
                {formatTanggalIndonesia(nakes.tanggalTerbit)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Tanggal Berakhir</dt>
              <dd className="mt-1 font-mono tabular-nums text-slate-900 font-semibold">
                {formatTanggalIndonesia(nakes.tanggalBerakhir)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">WhatsApp Terdaftar</dt>
              <dd className="mt-1 font-mono tabular-nums text-slate-900">
                +{nakes.noWhatsapp}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Catatan Kepegawaian</dt>
              <dd className="mt-1 text-slate-700">
                {nakes.catatan || 'Tidak ada catatan khusus'}
              </dd>
            </div>
          </dl>

          {/* Uploaded Scan SIP */}
          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <h4 className="text-xs font-semibold text-slate-700">
              Berkas Scan SIP Digital
            </h4>
            {nakes.scanSip ? (
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck className="w-4 h-4 text-[#0F766E] shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {nakes.scanSip.fileName}
                      </div>
                      <div className="text-xs font-mono tabular-nums text-slate-500">
                        {formatFileSize(nakes.scanSip.fileSize)} · Diunggah{' '}
                        {formatTanggalIndonesia(nakes.scanSip.uploadedAt)}
                      </div>
                    </div>
                  </div>
                  <a
                    href={nakes.scanSip.dataUrl}
                    download={nakes.scanSip.fileName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F766E] bg-white border border-teal-200 rounded-md hover:bg-teal-50 whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Unduh Scan</span>
                  </a>
                </div>
                {nakes.scanSip.fileType.startsWith('image/') && (
                  <img
                    src={nakes.scanSip.dataUrl}
                    alt={`Scan SIP ${nakes.nama}`}
                    className="max-h-72 w-auto rounded border border-slate-200 bg-white"
                  />
                )}
                {nakes.scanSip.fileType === 'application/pdf' && (
                  <iframe
                    src={nakes.scanSip.dataUrl}
                    title={`Pratinjau PDF SIP ${nakes.nama}`}
                    className="w-full h-72 rounded border border-slate-200 bg-white"
                  />
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Belum ada berkas scan SIP yang diunggah.
                {canEdit ? ' Klik Edit untuk mengunggah scan PDF atau gambar.' : ''}
              </p>
            )}
          </div>

          {/* WA Notification History */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-3">
              Riwayat Notifikasi WhatsApp ({relatedLogs.length})
            </h4>
            {relatedLogs.length === 0 ? (
              <p className="text-xs text-slate-500">
                Belum ada riwayat pengingat WhatsApp yang dikirimkan kepada nakes ini.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                {relatedLogs.map((log) => (
                  <div key={log.id} className="p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">
                        {log.kategoriPengingat}
                      </span>
                      <span className="font-mono tabular-nums text-slate-500">
                        {formatWaktuIndonesia(log.waktuKirim)} · {log.status}
                      </span>
                    </div>
                    <p className="text-slate-600 line-clamp-2">{log.pesan}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-3">
          {!canEdit && !canSendWa && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              Tutup
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(nakes);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
              <span>Edit / Perbarui SIP</span>
            </button>
          )}
          {canSendWa && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSendWa(nakes);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] transition-colors whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>Kirim Pengingat WA</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SendWaModalProps {
  nakes: NakesRecord | null;
  template: string;
  onClose: () => void;
  onConfirmSend: (
    nakes: NakesRecord,
    kategori: WaLogEntry['kategoriPengingat'],
    pesan: string
  ) => void;
}

export function SendWaModal({
  nakes,
  template,
  onClose,
  onConfirmSend,
}: SendWaModalProps) {
  const [kategori, setKategori] = useState<WaLogEntry['kategoriPengingat']>('Click-to-Chat (Manual)');
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    if (!nakes) return;
    const sisaHari = hitungSisaHari(nakes.tanggalBerakhir);
    if (sisaHari <= 30 && sisaHari > 0) {
      setKategori('H-30');
    } else if (sisaHari <= 90 && sisaHari > 30) {
      setKategori('H-90');
    } else if (sisaHari <= 180 && sisaHari > 90) {
      setKategori('H-180');
    } else {
      setKategori('Click-to-Chat (Manual)');
    }
    setPesan(renderTemplateWa(template, nakes, sisaHari));
  }, [nakes, template]);

  if (!nakes) return null;

  const cleanPhone = nakes.noWhatsapp.replace(/[^0-9]/g, '');
  const normalizedPhone = cleanPhone.startsWith('0')
    ? `62${cleanPhone.slice(1)}`
    : cleanPhone;
  const waMeHref = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(pesan)}`;

  const handleConfirm = () => {
    if (!pesan.trim()) return;
    onConfirmSend(nakes, kategori, pesan.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-wa-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 id="send-wa-title" className="text-base font-bold text-slate-900">
            Kirim Pengingat WhatsApp (Click-to-Chat)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup modal pengingat WA"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-slate-700 space-y-1">
            <div className="font-semibold text-slate-900">{nakes.nama}</div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              Tujuan: +{normalizedPhone} · No. SIP: {nakes.noSip}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kategori Pengingat
            </label>
            <select
              value={kategori}
              onChange={(e) =>
                setKategori(e.target.value as WaLogEntry['kategoriPengingat'])
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
            >
              <option value="Click-to-Chat (Manual)">Click-to-Chat (Manual)</option>
              <option value="H-180">H-180 (Tahap 1 · 6 Bulan)</option>
              <option value="H-90">H-90 (Tahap 2 · 3 Bulan)</option>
              <option value="H-30">H-30 (Tahap 3 · 1 Bulan)</option>
              <option value="Otomatis <180 Hari">Otomatis &lt;180 Hari</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Isi Pesan WhatsApp Resmi
            </label>
            <textarea
              rows={6}
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              Batal
            </button>
            <a
              href={waMeHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] whitespace-nowrap"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>Buka wa.me &amp; Catat Log</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
