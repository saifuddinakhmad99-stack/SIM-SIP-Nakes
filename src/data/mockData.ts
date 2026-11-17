import { AppSettings, AuditLogEntry, NakesRecord, UserAccount, WaLogEntry } from '../types/sip';

function addDaysToToday(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isoHoursAgo(hoursAgo: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}

export const INITIAL_SETTINGS: AppSettings = {
  namaInstansi: 'RSUD Sidoarjo Barat',
  kodeFaskes: '3515135',
  alamatInstansi: 'Jl. Raya Krian - Mojosari Km. 3, Kec. Krian, Kab. Sidoarjo',
  kepalaSubbag: 'Siti Aminah, S.KM., M.Kes.',
  ambangAmanHari: 180,
  ambangKritisHari: 30,
  autoReminderAktif: true,
  jadwalPengingat: {
    h180: true,
    h90: true,
    h30: true,
    h7: true,
  },
  templatePesanWa:
    'Yth. {nama} ({profesi}),\n\nSub-Bagian SDM RSUD Sidoarjo Barat menginformasikan bahwa Surat Izin Praktik (SIP) Nomor {no_sip} akan kadaluarsa pada tanggal {tgl_kadaluarsa} (sisa masa berlaku: {sisa_hari} hari).\n\nMohon segera menyiapkan berkas perpanjangan SIP serta koordinasi dengan Komite Profesi terkait. Terima kasih.',
};

export const INITIAL_NAKES_DATA: NakesRecord[] = [
  {
    id: 'nks-001',
    nama: 'dr. Hendra Wijaya, Sp.PD',
    nip: '19820415 201001 1 014',
    profesi: 'Dokter Spesialis',
    unitKerja: 'Poli Penyakit Dalam',
    noSip: '503/0412/SIP-DS/438.5.2/2023',
    noStr: '3511401322110482',
    tanggalTerbit: addDaysToToday(-730),
    tanggalBerakhir: addDaysToToday(420), // Hijau (>180 hari)
    noWhatsapp: '6281234567801',
    catatan: 'SIP ke-1 aktif di RSUD Sidoarjo Barat',
  },
  {
    id: 'nks-002',
    nama: 'Ns. Ratna Sari Dewi, S.Kep',
    nip: '19900821 201503 2 009',
    profesi: 'Perawat',
    unitKerja: 'Instalasi Gawat Darurat (IGD)',
    noSip: '503/1184/SIP-P/438.5.2/2022',
    noStr: '1601521213490112',
    tanggalTerbit: addDaysToToday(-1400),
    tanggalBerakhir: addDaysToToday(30), // Tepat H-30 (Tahap 3 Kritis)
    noWhatsapp: '6281355678912',
    catatan: 'Memasuki trigger Tahap 3 (H-30) — proses pengumpulan SKP PPNI',
    terakhirDiingatkan: isoHoursAgo(48),
  },
  {
    id: 'nks-003',
    nama: 'dr. Ahmad Fauzan Hakim',
    nip: '19881103 201402 1 006',
    profesi: 'Dokter Umum',
    unitKerja: 'Instalasi Gawat Darurat (IGD)',
    noSip: '503/0789/SIP-DU/438.5.2/2022',
    noStr: '3511100221088412',
    tanggalTerbit: addDaysToToday(-1360),
    tanggalBerakhir: addDaysToToday(90), // Tepat H-90 (Tahap 2 Peringatan)
    noWhatsapp: '6281298765432',
    catatan: 'Memasuki trigger Tahap 2 (H-90) — persiapan rekomendasi IDI',
    terakhirDiingatkan: isoHoursAgo(72),
  },
  {
    id: 'nks-004',
    nama: 'Bdn. Dwi Lestari, S.Tr.Keb',
    nip: '19910317 201801 2 011',
    profesi: 'Bidan',
    unitKerja: 'Ruang Bersalin (VK)',
    noSip: '503/0521/SIP-B/438.5.2/2024',
    noStr: '1602521231987445',
    tanggalTerbit: addDaysToToday(-410),
    tanggalBerakhir: addDaysToToday(540), // Hijau (>180 hari)
    noWhatsapp: '6285648123900',
    catatan: 'Dokumen lengkap terverifikasi MPP Sidoarjo',
  },
  {
    id: 'nks-005',
    nama: 'apt. Rizky Pratama Putra, S.Farm',
    nip: '19890625 201604 1 003',
    profesi: 'Apoteker',
    unitKerja: 'Instalasi Farmasi Rawat Inap',
    noSip: '503/0902/SIPA/438.5.2/2021',
    noStr: '19890625/STRA-UWK/2021/14022',
    tanggalTerbit: addDaysToToday(-1830),
    tanggalBerakhir: addDaysToToday(-6), // Merah Pekat Kadaluarsa (<=0 hari)
    noWhatsapp: '6281132908765',
    catatan: 'Perpanjangan tertahan verifikasi STRA seumur hidup',
    terakhirDiingatkan: isoHoursAgo(30),
  },
  {
    id: 'nks-006',
    nama: 'drg. Maya Puspitasari',
    nip: '19920112 201903 2 015',
    profesi: 'Dokter Gigi',
    unitKerja: 'Poli Gigi & Mulut',
    noSip: '503/0663/SIP-DG/438.5.2/2022',
    noStr: '3521100222145678',
    tanggalTerbit: addDaysToToday(-1300),
    tanggalBerakhir: addDaysToToday(180), // Tepat H-180 (Tahap 1 Peringatan)
    noWhatsapp: '6282144556677',
    catatan: 'Memasuki trigger Tahap 1 (H-180 / 6 Bulan)',
    terakhirDiingatkan: isoHoursAgo(96),
  },
  {
    id: 'nks-007',
    nama: 'Bagus Santoso, A.Md.AK',
    nip: '19930908 202012 1 004',
    profesi: 'Nakes Lainnya',
    unitKerja: 'Instalasi Patologi Klinik',
    noSip: '503/0319/SIP-ATLM/438.5.2/2023',
    noStr: '1614511234561098',
    tanggalTerbit: addDaysToToday(-620),
    tanggalBerakhir: addDaysToToday(295), // Hijau (>180 hari)
    noWhatsapp: '6285733112244',
    catatan: 'SIP aktif terintegrasi SatuSehat SDMK',
  },
  {
    id: 'nks-008',
    nama: 'Ns. Fajar Kurniawan, S.Kep',
    nip: '19871219 201212 1 002',
    profesi: 'Perawat',
    unitKerja: 'Intensive Care Unit (ICU)',
    noSip: '503/0215/SIP-P/438.5.2/2023',
    noStr: '1601511230098123',
    tanggalTerbit: addDaysToToday(-540),
    tanggalBerakhir: addDaysToToday(310), // Hijau (>180 hari)
    noWhatsapp: '6281231998877',
    catatan: 'Sertifikasi pelatihan ICU & SIP aktif',
  },
];

export const INITIAL_WA_LOGS: WaLogEntry[] = [
  {
    id: 'wa-001',
    nakesId: 'nks-005',
    namaNakes: 'apt. Rizky Pratama Putra, S.Farm',
    profesi: 'Apoteker',
    noWhatsapp: '6281132908765',
    noSip: '503/0902/SIPA/438.5.2/2021',
    kategoriPengingat: 'Click-to-Chat (Manual)',
    pesan:
      'Yth. apt. Rizky Pratama Putra, S.Farm (Apoteker), SIPA Nomor 503/0902/SIPA/438.5.2/2021 telah melewati masa berlaku. Mohon segera berkoordinasi dengan Sub-Bagian SDM.',
    waktuKirim: isoHoursAgo(30),
    status: 'Dibaca',
    metode: 'Click-to-Chat (wa.me)',
  },
  {
    id: 'wa-002',
    nakesId: 'nks-002',
    namaNakes: 'Ns. Ratna Sari Dewi, S.Kep',
    profesi: 'Perawat',
    noWhatsapp: '6281355678912',
    noSip: '503/1184/SIP-P/438.5.2/2022',
    kategoriPengingat: 'H-90',
    pesan:
      'Yth. Ns. Ratna Sari Dewi, S.Kep (Perawat), SIP Nomor 503/1184/SIP-P/438.5.2/2022 memasuki masa pengurusan perpanjangan H-90.',
    waktuKirim: isoHoursAgo(48),
    status: 'Dibaca',
    metode: 'Cron Job 08.00 WIB',
  },
  {
    id: 'wa-003',
    nakesId: 'nks-003',
    namaNakes: 'dr. Ahmad Fauzan Hakim',
    profesi: 'Dokter Umum',
    noWhatsapp: '6281298765432',
    noSip: '503/0789/SIP-DU/438.5.2/2022',
    kategoriPengingat: 'H-180',
    pesan:
      'Yth. dr. Ahmad Fauzan Hakim (Dokter Umum), pengingat awal 6 bulan sebelum masa berlaku SIP Nomor 503/0789/SIP-DU/438.5.2/2022 berakhir.',
    waktuKirim: isoHoursAgo(72),
    status: 'Terkirim',
    metode: 'Cron Job 08.00 WIB',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud-001',
    waktu: isoHoursAgo(24),
    operator: 'Siti Aminah, S.KM., M.Kes.',
    peran: 'Kasubag Kepegawaian & Diklat',
    aksi: 'JALANKAN_CRON_JOB',
    target: 'Cron Job Harian 08.00 WIB',
    deskripsi: 'Memindai 8 data tenaga kesehatan dan mengirimkan pengingat terjadwal H-180 & H-90.',
  },
  {
    id: 'aud-002',
    waktu: isoHoursAgo(14),
    operator: 'Siti Aminah, S.KM., M.Kes.',
    peran: 'Kasubag Kepegawaian & Diklat',
    aksi: 'EDIT_DATA',
    target: 'Ns. Ratna Sari Dewi, S.Kep',
    deskripsi: 'Memperbarui catatan proses pengumpulan SKP PPNI untuk perpanjangan SIP IGD.',
  },
  {
    id: 'aud-003',
    waktu: isoHoursAgo(6),
    operator: 'Siti Aminah, S.KM., M.Kes.',
    peran: 'Kasubag Kepegawaian & Diklat',
    aksi: 'EKSPOR_LAPORAN',
    target: 'Rekapitulasi SIP (Excel)',
    deskripsi: 'Mengunduh laporan rekapitulasi 8 data SIP untuk verifikasi klaim BPJS Kesehatan.',
  },
];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-001',
    nama: 'Ir. Bagas Prasetyo, S.Kom',
    nip: '19860514 201101 1 007',
    username: 'admin.it',
    jabatan: 'Admin Sistem IT SIMRS',
    role: 'admin_it',
    aktif: true,
    createdAt: addDaysToToday(-120),
  },
  {
    id: 'usr-002',
    nama: 'Siti Aminah, S.KM., M.Kes.',
    nip: '19800912 200604 2 012',
    username: 'kasi.sdm',
    jabatan: 'Kepala Sub-Bagian SDM & Diklat',
    role: 'kasi_sdm',
    aktif: true,
    createdAt: addDaysToToday(-120),
  },
  {
    id: 'usr-003',
    nama: 'Rina Wulandari, S.Psi',
    nip: '19940228 202012 2 018',
    username: 'operator.sdm',
    jabatan: 'Staf Operator Administrasi SDM',
    role: 'operator_sdm',
    aktif: true,
    createdAt: addDaysToToday(-90),
  },
  {
    id: 'usr-004',
    nama: 'dr. Bambang Sutrisno, MARS',
    nip: '19751103 200212 1 004',
    username: 'komite.pimpinan',
    jabatan: 'Ketua Komite Medis / Pimpinan RSUD',
    role: 'viewer',
    aktif: true,
    createdAt: addDaysToToday(-90),
  },
];
