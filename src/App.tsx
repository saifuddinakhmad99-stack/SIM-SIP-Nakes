import { useEffect, useMemo, useState } from 'react';
import { Lock, Menu, Plus } from 'lucide-react';
import {
  INITIAL_AUDIT_LOGS,
  INITIAL_NAKES_DATA,
  INITIAL_SETTINGS,
  INITIAL_USERS,
  INITIAL_WA_LOGS,
} from './data/mockData';
import {
  AppSettings,
  AuditActionType,
  AuditLogEntry,
  BackendSessionUser,
  getWibDateKey,
  hitungSisaHari,
  mapBackendRoleToUserRole,
  NakesRecord,
  NavSection,
  renderTemplateWa,
  ROLE_PERMISSION_MATRIX,
  tentukanStatusSip,
  UserAccount,
  WaLogEntry,
} from './types/sip';
import { useAuth } from './lib/authContext';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DataSipView } from './components/DataSipView';
import {
  CronSimulationItem,
  CronSimulationReport,
  WaLogView,
} from './components/WaLogView';
import { AnalyticsView } from './components/AnalyticsView';
import { AuditLogView } from './components/AuditLogView';
import { AccessControlView } from './components/AccessControlView';
import { SettingsView } from './components/SettingsView';
import {
  NakesDetailModal,
  NakesFormModal,
  SendWaModal,
} from './components/NakesModals';
import { SwitchUserModal } from './components/SwitchUserModal';

const STORAGE_KEYS = {
  NAKES: 'sim_sip_rsud_sidoarjo_barat_nakes_v2',
  LOGS: 'sim_sip_rsud_sidoarjo_barat_walogs_v2',
  SETTINGS: 'sim_sip_rsud_sidoarjo_barat_settings_v2',
  AUDIT: 'sim_sip_rsud_sidoarjo_barat_audit_v2',
  USERS: 'sim_sip_rsud_sidoarjo_barat_users_v2',
  ACTIVE_USER: 'sim_sip_rsud_sidoarjo_barat_active_user_v2',
};

const SECTION_TITLES: Record<NavSection, string> = {
  dashboard: 'Dashboard',
  'data-sip': 'Data SIP',
  'log-wa': 'Log Notifikasi & Simulasi Auto-Reminder',
  analytics: 'Analytics & Management Brief',
  'audit-logs': 'Audit Logs',
  'hak-akses': 'Hak Akses & User',
  pengaturan: 'Pengaturan',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const { authenticatedUser, loading: authLoading, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [nakesList, setNakesList] = useState<NakesRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.NAKES, INITIAL_NAKES_DATA)
  );
  const [waLogs, setWaLogs] = useState<WaLogEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.LOGS, INITIAL_WA_LOGS)
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS)
  );
  const [users, setUsers] = useState<UserAccount[]>(() =>
    loadFromStorage(STORAGE_KEYS.USERS, INITIAL_USERS)
  );
  const [currentUserId, setCurrentUserId] = useState<string>(() =>
    loadFromStorage(STORAGE_KEYS.ACTIVE_USER, INITIAL_USERS[0].id)
  );

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingNakes, setEditingNakes] = useState<NakesRecord | null>(null);
  const [detailNakes, setDetailNakes] = useState<NakesRecord | null>(null);
  const [waTargetNakes, setWaTargetNakes] = useState<NakesRecord | null>(null);
  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentUser = useMemo(() => {
    const found = users.find((u) => u.id === currentUserId && u.aktif);
    if (found) return found;
    return users.find((u) => u.aktif) || users[0] || INITIAL_USERS[0];
  }, [users, currentUserId]);

  const permissions = ROLE_PERMISSION_MATRIX[currentUser.role];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NAKES, JSON.stringify(nakesList));
    } catch {
      // ignore storage quota issues
    }
  }, [nakesList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(waLogs));
    } catch {
      // ignore
    }
  }, [waLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs));
    } catch {
      // ignore
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {
      // ignore
    }
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, JSON.stringify(currentUser.id));
    } catch {
      // ignore
    }
  }, [currentUser.id]);

  // Synchronize authenticated backend session user into active RBAC role state
  useEffect(() => {
    if (!authenticatedUser) return;
    const mappedRole = mapBackendRoleToUserRole(authenticatedUser.role);
    const normalizedUsername = authenticatedUser.username.toLowerCase();
    const existing = users.find(
      (u) => u.username.toLowerCase() === normalizedUsername
    );
    const targetId = existing ? existing.id : `usr-auth-${authenticatedUser.id}`;

    if (currentUserId !== targetId) {
      setCurrentUserId(targetId);
    }

    if (
      !existing ||
      existing.role !== mappedRole ||
      existing.nama !== authenticatedUser.name ||
      !existing.aktif
    ) {
      setUsers((prev) => {
        const found = prev.find(
          (u) => u.username.toLowerCase() === normalizedUsername
        );
        if (found) {
          return prev.map((u) =>
            u.id === found.id
              ? {
                  ...u,
                  nama: authenticatedUser.name,
                  nip: authenticatedUser.nip || u.nip,
                  role: mappedRole,
                  aktif: true,
                }
              : u
          );
        }
        return [
          ...prev,
          {
            id: targetId,
            nama: authenticatedUser.name,
            nip: authenticatedUser.nip || '-',
            username: normalizedUsername,
            jabatan: ROLE_PERMISSION_MATRIX[mappedRole].label,
            role: mappedRole,
            aktif: true,
            createdAt: getWibDateKey(),
          },
        ];
      });
    }
  }, [authenticatedUser]);

  // Redirect away from disallowed section after role change
  useEffect(() => {
    const allowedBySection: Record<NavSection, boolean> = {
      dashboard: permissions.canViewDashboard,
      'data-sip': permissions.canViewDataSip,
      'log-wa': permissions.canViewWaLogs,
      analytics: permissions.canViewAnalytics,
      'audit-logs': permissions.canViewAuditLogs,
      'hak-akses': permissions.canManageUsers || permissions.role === 'kasi_sdm',
      pengaturan: permissions.canManageSettings,
    };
    if (!allowedBySection[activeSection]) {
      setActiveSection('dashboard');
    }
  }, [activeSection, permissions]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const recordAudit = (
    aksi: AuditActionType,
    target: string,
    deskripsi: string,
    operatorOverride?: string,
    peranOverride?: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      waktu: new Date().toISOString(),
      operator: operatorOverride || currentUser.nama,
      peran: peranOverride || ROLE_PERMISSION_MATRIX[currentUser.role].label,
      aksi,
      target,
      deskripsi,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  const autoWa180Aktif =
    settings.autoReminderAktif && (settings.jadwalPengingat?.h180 ?? true);

  const urgentCount = useMemo(() => {
    return nakesList.filter((item) => {
      const sisa = hitungSisaHari(item.tanggalBerakhir);
      const st = tentukanStatusSip(
        sisa,
        settings.ambangAmanHari,
        settings.ambangKritisHari
      );
      return st === 'kritis' || st === 'kadaluarsa';
    }).length;
  }, [nakesList, settings.ambangAmanHari, settings.ambangKritisHari]);

  const handleSaveNakes = (
    record: Omit<NakesRecord, 'id'>,
    existingId?: string
  ) => {
    const targetId = existingId || `nks-${Date.now()}`;
    const sisaHari = hitungSisaHari(record.tanggalBerakhir);
    const todayStr = getWibDateKey();
    const alreadyAutoSentToday = waLogs.some(
      (log) =>
        log.nakesId === targetId &&
        log.kategoriPengingat === 'Otomatis <180 Hari' &&
        getWibDateKey(log.waktuKirim) === todayStr
    );
    const shouldTriggerAutoWa =
      autoWa180Aktif && sisaHari < 180 && !alreadyAutoSentToday;
    const nowIso = new Date().toISOString();

    const savedRecord: NakesRecord = {
      ...record,
      id: targetId,
      terakhirDiingatkan: shouldTriggerAutoWa
        ? nowIso
        : record.terakhirDiingatkan,
    };

    if (existingId) {
      setNakesList((prev) =>
        prev.map((item) => (item.id === existingId ? savedRecord : item))
      );
      recordAudit(
        'EDIT_DATA',
        savedRecord.nama,
        `Memperbarui data SIP ${savedRecord.noSip} (${savedRecord.profesi} · ${savedRecord.unitKerja}, kadaluarsa ${savedRecord.tanggalBerakhir})${savedRecord.scanSip ? ` dengan lampiran ${savedRecord.scanSip.fileName}` : ''}.`
      );
    } else {
      setNakesList((prev) => [savedRecord, ...prev]);
      recordAudit(
        'TAMBAH_DATA',
        savedRecord.nama,
        `Menambahkan data SIP baru ${savedRecord.noSip} (${savedRecord.profesi} · ${savedRecord.unitKerja})${savedRecord.scanSip ? ` beserta scan ${savedRecord.scanSip.fileName}` : ''}.`
      );
    }

    if (shouldTriggerAutoWa) {
      const autoLog: WaLogEntry = {
        id: `wa-auto180-${Date.now()}`,
        nakesId: savedRecord.id,
        namaNakes: savedRecord.nama,
        profesi: savedRecord.profesi,
        noWhatsapp: savedRecord.noWhatsapp,
        noSip: savedRecord.noSip,
        kategoriPengingat: 'Otomatis <180 Hari',
        pesan: renderTemplateWa(
          settings.templatePesanWa,
          savedRecord,
          sisaHari
        ),
        waktuKirim: nowIso,
        status: 'Terkirim',
        metode: 'Sistem Otomatis',
      };
      setWaLogs((prev) => [autoLog, ...prev]);
      showToast(
        `Data SIP ${savedRecord.nama} disimpan & WA otomatis (<180 hari) terkirim.`
      );
    } else {
      showToast(
        existingId
          ? `Data SIP ${savedRecord.nama} berhasil diperbarui.`
          : `Data SIP ${savedRecord.nama} berhasil ditambahkan.`
      );
    }
  };

  const handleDeleteNakes = (id: string) => {
    const target = nakesList.find((n) => n.id === id);
    setNakesList((prev) => prev.filter((item) => item.id !== id));
    if (target) {
      recordAudit(
        'HAPUS_DATA',
        target.nama,
        `Menghapus arsip data SIP ${target.noSip} (${target.profesi} · ${target.unitKerja}).`
      );
      showToast(`Data SIP ${target.nama} telah dihapus.`);
    }
  };

  const handleQuickSendWa = (nakes: NakesRecord, pesan: string) => {
    const todayStr = getWibDateKey();
    const alreadyManualToday = waLogs.some(
      (log) =>
        log.nakesId === nakes.id &&
        log.kategoriPengingat === 'Click-to-Chat (Manual)' &&
        getWibDateKey(log.waktuKirim) === todayStr
    );

    if (alreadyManualToday) {
      showToast(
        `Tautan wa.me dibuka untuk ${nakes.nama} (Anti-Spam: log manual hari ini sudah tercatat).`
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const newLog: WaLogEntry = {
      id: `wa-manual-${Date.now()}`,
      nakesId: nakes.id,
      namaNakes: nakes.nama,
      profesi: nakes.profesi,
      noWhatsapp: nakes.noWhatsapp,
      noSip: nakes.noSip,
      kategoriPengingat: 'Click-to-Chat (Manual)',
      pesan,
      waktuKirim: nowIso,
      status: 'Terkirim',
      metode: 'Click-to-Chat (wa.me)',
    };
    setWaLogs((prev) => [newLog, ...prev]);
    setNakesList((prev) =>
      prev.map((n) =>
        n.id === nakes.id ? { ...n, terakhirDiingatkan: nowIso } : n
      )
    );
    recordAudit(
      'KIRIM_WA',
      nakes.nama,
      `Mengirim pengingat WhatsApp Click-to-Chat (wa.me) ke +${nakes.noWhatsapp} untuk SIP ${nakes.noSip}.`
    );
    showToast(
      `Tautan wa.me dibuka & pengingat untuk ${nakes.nama} dicatat ke Log Audit.`
    );
  };

  const handleConfirmSendWaModal = (
    nakes: NakesRecord,
    kategori: WaLogEntry['kategoriPengingat'],
    pesan: string
  ) => {
    const todayStr = getWibDateKey();
    const duplicateSameTriggerToday = waLogs.some(
      (log) =>
        log.nakesId === nakes.id &&
        log.kategoriPengingat === kategori &&
        getWibDateKey(log.waktuKirim) === todayStr
    );

    if (duplicateSameTriggerToday) {
      showToast(
        `Tautan wa.me dibuka, namun log ${kategori} untuk ${nakes.nama} hari ini dicegah ganda (Anti-Spam).`
      );
      return;
    }

    const nowIso = new Date().toISOString();
    const newLog: WaLogEntry = {
      id: `wa-${Date.now()}`,
      nakesId: nakes.id,
      namaNakes: nakes.nama,
      profesi: nakes.profesi,
      noWhatsapp: nakes.noWhatsapp,
      noSip: nakes.noSip,
      kategoriPengingat: kategori,
      pesan,
      waktuKirim: nowIso,
      status: 'Terkirim',
      metode: 'Click-to-Chat (wa.me)',
    };
    setWaLogs((prev) => [newLog, ...prev]);
    setNakesList((prev) =>
      prev.map((n) =>
        n.id === nakes.id ? { ...n, terakhirDiingatkan: nowIso } : n
      )
    );
    recordAudit(
      'KIRIM_WA',
      nakes.nama,
      `Mengirim pengingat WhatsApp (${kategori}) via modal Click-to-Chat ke +${nakes.noWhatsapp}.`
    );
    showToast(`Notifikasi WhatsApp untuk ${nakes.nama} berhasil dicatat ke Log.`);
  };

  const handleRunCronSimulation = (): CronSimulationReport => {
    const nowIso = new Date().toISOString();
    const todayStr = getWibDateKey();
    const items: CronSimulationItem[] = [];
    const newLogs: WaLogEntry[] = [];
    const updatedNakesIds: string[] = [];

    for (const nakes of nakesList) {
      const sisaHari = hitungSisaHari(nakes.tanggalBerakhir);
      let trigger: 'H-180' | 'H-90' | 'H-30' | null = null;

      if (sisaHari === 180 && settings.jadwalPengingat.h180) {
        trigger = 'H-180';
      } else if (sisaHari === 90 && settings.jadwalPengingat.h90) {
        trigger = 'H-90';
      } else if (sisaHari === 30 && settings.jadwalPengingat.h30) {
        trigger = 'H-30';
      }

      if (!trigger) continue;

      const alreadySentSameDayTrigger = waLogs.some(
        (log) =>
          log.nakesId === nakes.id &&
          log.kategoriPengingat === trigger &&
          getWibDateKey(log.waktuKirim) === todayStr
      );

      if (alreadySentSameDayTrigger) {
        items.push({
          nakesId: nakes.id,
          namaNakes: nakes.nama,
          profesi: nakes.profesi,
          trigger,
          hasil: 'Dicegah Anti-Spam',
          keterangan: `Pengingat ${trigger} sudah terkirim pada tanggal ${todayStr}.`,
        });
        continue;
      }

      const renderedMessage = renderTemplateWa(
        settings.templatePesanWa,
        nakes,
        sisaHari
      );

      newLogs.push({
        id: `wa-cron-${Date.now()}-${newLogs.length}`,
        nakesId: nakes.id,
        namaNakes: nakes.nama,
        profesi: nakes.profesi,
        noWhatsapp: nakes.noWhatsapp,
        noSip: nakes.noSip,
        kategoriPengingat: trigger,
        pesan: renderedMessage,
        waktuKirim: nowIso,
        status: 'Terkirim',
        metode: 'Cron Job 08.00 WIB',
      });

      updatedNakesIds.push(nakes.id);
      items.push({
        nakesId: nakes.id,
        namaNakes: nakes.nama,
        profesi: nakes.profesi,
        trigger,
        hasil: 'Terkirim',
        keterangan: `Notifikasi otomatis ${trigger} dicatat ke Log Audit.`,
      });
    }

    if (newLogs.length > 0) {
      setWaLogs((prev) => [...newLogs, ...prev]);
      setNakesList((prev) =>
        prev.map((n) =>
          updatedNakesIds.includes(n.id) ? { ...n, terakhirDiingatkan: nowIso } : n
        )
      );
    }

    const totalTerkirim = newLogs.length;
    const totalDicegahAntiSpam = items.filter(
      (i) => i.hasil === 'Dicegah Anti-Spam'
    ).length;

    recordAudit(
      'JALANKAN_CRON_JOB',
      'Simulasi Cron Job 08.00 WIB',
      `Memindai ${nakesList.length} data nakes: ${totalTerkirim} notifikasi terkirim, ${totalDicegahAntiSpam} dicegah oleh validasi anti-spam.`
    );

    showToast(
      `Simulasi Cron Job selesai: ${totalTerkirim} terkirim, ${totalDicegahAntiSpam} dicegah Anti-Spam.`
    );

    return {
      waktuEksekusi: nowIso,
      totalDipindai: nakesList.length,
      totalCocokTrigger: items.length,
      totalTerkirim,
      totalDicegahAntiSpam,
      items,
    };
  };

  const handleLogExport = (format: 'CSV' | 'Excel', count: number) => {
    recordAudit(
      'EKSPOR_LAPORAN',
      `Rekapitulasi Data SIP (${format})`,
      `Mengekspor ${count} baris data rekapitulasi SIP sesuai filter aktif ke format ${format}.`
    );
    showToast(`Laporan ${format} (${count} data) berhasil diunduh & dicatat ke Audit Log.`);
  };

  const handleResetDefaults = () => {
    setNakesList(INITIAL_NAKES_DATA);
    setWaLogs(INITIAL_WA_LOGS);
    setSettings(INITIAL_SETTINGS);
    setUsers(INITIAL_USERS);
    setCurrentUserId(INITIAL_USERS[0].id);
    setAuditLogs([
      {
        id: `aud-reset-${Date.now()}`,
        waktu: new Date().toISOString(),
        operator: currentUser.nama,
        peran: ROLE_PERMISSION_MATRIX[currentUser.role].label,
        aksi: 'RESET_DATA',
        target: 'Seluruh Database Lokal',
        deskripsi:
          'Mengembalikan data nakes, log WhatsApp, daftar user, dan pengaturan ke kondisi awal.',
      },
      ...INITIAL_AUDIT_LOGS,
    ]);
    showToast('Data dan pengaturan berhasil dikembalikan ke kondisi awal.');
  };

  const handleAddUser = (data: Omit<UserAccount, 'id' | 'createdAt'>) => {
    if (!permissions.canManageUsers) return;
    const newUser: UserAccount = {
      ...data,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setUsers((prev) => [...prev, newUser]);
    recordAudit(
      'KELOLA_USER',
      newUser.nama,
      `Menambahkan akun @${newUser.username} dengan hak akses ${ROLE_PERMISSION_MATRIX[newUser.role].label}.`
    );
    showToast(`Akun pengguna ${newUser.nama} berhasil ditambahkan.`);
  };

  const handleUpdateUser = (updated: UserAccount) => {
    if (!permissions.canManageUsers) return;
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    recordAudit(
      'KELOLA_USER',
      updated.nama,
      `Memperbarui akun @${updated.username}: role ${ROLE_PERMISSION_MATRIX[updated.role].label}, status ${updated.aktif ? 'Aktif' : 'Nonaktif'}.`
    );
    showToast(`Akun ${updated.nama} berhasil diperbarui.`);
  };

  const handleDeleteUser = (id: string) => {
    if (!permissions.canManageUsers || id === currentUser.id) return;
    const target = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (target) {
      recordAudit(
        'KELOLA_USER',
        target.nama,
        `Menghapus akun pengguna @${target.username} (${ROLE_PERMISSION_MATRIX[target.role].label}).`
      );
      showToast(`Akun ${target.nama} telah dihapus.`);
    }
  };

  const handleSwitchUser = (user: UserAccount) => {
    if (!user.aktif) return;
    setCurrentUserId(user.id);
    recordAudit(
      'GANTI_AKUN',
      user.nama,
      `Beralih sesi pengguna aktif ke @${user.username} (${ROLE_PERMISSION_MATRIX[user.role].label}).`,
      user.nama,
      ROLE_PERMISSION_MATRIX[user.role].label
    );
    showToast(
      `Sesi beralih ke ${user.nama} (${ROLE_PERMISSION_MATRIX[user.role].label}).`
    );
  };

  const handleLoginSuccess = (
    backendUser: BackendSessionUser,
    method: 'password' | 'google'
  ) => {
    const mappedRole = mapBackendRoleToUserRole(backendUser.role);
    const roleLabel = ROLE_PERMISSION_MATRIX[mappedRole].label;
    setActiveSection('dashboard');
    recordAudit(
      'LOGIN',
      backendUser.name,
      `Masuk ke sistem melalui ${method === 'google' ? 'Google SSO' : 'Username & Kata Sandi'} sebagai @${backendUser.username} (${roleLabel}).`,
      backendUser.name,
      roleLabel
    );
    showToast(`Selamat datang, ${backendUser.name} (${roleLabel}).`);
  };

  const handleLogout = async () => {
    recordAudit(
      'LOGOUT',
      currentUser.nama,
      `Keluar dari sesi @${currentUser.username} (${ROLE_PERMISSION_MATRIX[currentUser.role].label}).`
    );
    setIsFormModalOpen(false);
    setDetailNakes(null);
    setWaTargetNakes(null);
    setIsSwitchUserModalOpen(false);
    setMobileMenuOpen(false);
    setToastMessage(null);
    await logout();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#0F766E] text-white flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-5 h-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L4 5.5V11.5C4 16.8 7.4 21.6 12 23C16.6 21.6 20 16.8 20 11.5V5.5L12 2Z" />
              <path d="M12 8.5V15.5" />
              <path d="M8.5 12H15.5" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-600">
            Memeriksa sesi autentikasi...
          </p>
        </div>
      </div>
    );
  }

  if (!authenticatedUser) {
    return (
      <LoginView
        namaInstansi={settings.namaInstansi}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        urgentCount={urgentCount}
        namaInstansi={settings.namaInstansi}
        currentUser={currentUser}
        permissions={permissions}
        onOpenSwitchUser={() => setIsSwitchUserModalOpen(true)}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Right Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[276px]">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-semibold text-slate-500 truncate hidden sm:inline">
                {settings.namaInstansi}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-bold text-slate-900 truncate">
                {SECTION_TITLES[activeSection]}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {permissions.canCreateEditDeleteSip ? (
              <button
                type="button"
                onClick={() => {
                  setEditingNakes(null);
                  setIsFormModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Tambah Data SIP</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Lock className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
                <span>Mode Baca · {permissions.label}</span>
              </span>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeSection === 'dashboard' && permissions.canViewDashboard && (
            <DashboardView
              nakesList={nakesList}
              waLogs={waLogs}
              ambangAmanHari={settings.ambangAmanHari}
              ambangKritisHari={settings.ambangKritisHari}
              templatePesanWa={settings.templatePesanWa}
              canCreateEditDeleteSip={permissions.canCreateEditDeleteSip}
              canSendWaManual={permissions.canSendWaManual}
              canViewWaLogs={permissions.canViewWaLogs}
              onNavigate={setActiveSection}
              onSelectDetail={(n) => setDetailNakes(n)}
              onQuickSendWa={handleQuickSendWa}
              onOpenAddModal={() => {
                setEditingNakes(null);
                setIsFormModalOpen(true);
              }}
            />
          )}

          {activeSection === 'data-sip' && permissions.canViewDataSip && (
            <DataSipView
              nakesList={nakesList}
              ambangAmanHari={settings.ambangAmanHari}
              ambangKritisHari={settings.ambangKritisHari}
              templatePesanWa={settings.templatePesanWa}
              canCreateEditDeleteSip={permissions.canCreateEditDeleteSip}
              canSendWaManual={permissions.canSendWaManual}
              canExportReports={permissions.canExportReports}
              onAddNew={() => {
                setEditingNakes(null);
                setIsFormModalOpen(true);
              }}
              onEdit={(n) => {
                setEditingNakes(n);
                setIsFormModalOpen(true);
              }}
              onDelete={handleDeleteNakes}
              onViewDetail={(n) => setDetailNakes(n)}
              onQuickSendWa={handleQuickSendWa}
              onLogExport={handleLogExport}
            />
          )}

          {activeSection === 'log-wa' && permissions.canViewWaLogs && (
            <WaLogView
              logs={waLogs}
              nakesList={nakesList}
              autoWa180Aktif={autoWa180Aktif}
              canRunCronJob={permissions.canRunCronJob}
              onRunCronSimulation={handleRunCronSimulation}
            />
          )}

          {activeSection === 'analytics' && permissions.canViewAnalytics && (
            <AnalyticsView
              nakesList={nakesList}
              waLogs={waLogs}
              ambangAmanHari={settings.ambangAmanHari}
              ambangKritisHari={settings.ambangKritisHari}
              namaInstansi={settings.namaInstansi}
              kepalaSubbag={settings.kepalaSubbag}
            />
          )}

          {activeSection === 'audit-logs' && permissions.canViewAuditLogs && (
            <AuditLogView
              auditLogs={auditLogs}
              onLogAuditExport={(count) => {
                recordAudit(
                  'EKSPOR_LAPORAN',
                  'Audit Logs (CSV)',
                  `Mengekspor ${count} catatan aktivitas sistem ke format CSV.`
                );
                showToast(`Audit Log (${count} baris) berhasil diunduh.`);
              }}
            />
          )}

          {activeSection === 'hak-akses' &&
            (permissions.canManageUsers || permissions.role === 'kasi_sdm') && (
              <AccessControlView
                users={users}
                currentUser={currentUser}
                permissions={permissions}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                onSwitchUser={handleSwitchUser}
              />
            )}

          {activeSection === 'pengaturan' && permissions.canManageSettings && (
            <SettingsView
              settings={settings}
              sampleNakes={nakesList[5] || nakesList[0]}
              onSaveSettings={(next) => {
                setSettings(next);
                recordAudit(
                  'UBAH_PENGATURAN',
                  'Pengaturan Sistem & Template WA',
                  `Memperbarui konfigurasi instansi (${next.namaInstansi}), ambang status (Aman >${next.ambangAmanHari} hr, Kritis ≤${next.ambangKritisHari} hr), dan template pesan WhatsApp.`
                );
                showToast('Pengaturan dan template pesan WA berhasil diperbarui.');
              }}
              onResetDefaults={handleResetDefaults}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <NakesFormModal
        isOpen={isFormModalOpen && permissions.canCreateEditDeleteSip}
        initialData={editingNakes}
        autoWa180Aktif={autoWa180Aktif}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingNakes(null);
        }}
        onSave={handleSaveNakes}
      />

      <NakesDetailModal
        nakes={detailNakes}
        ambangAmanHari={settings.ambangAmanHari}
        ambangKritisHari={settings.ambangKritisHari}
        waLogs={waLogs}
        canEdit={permissions.canCreateEditDeleteSip}
        canSendWa={permissions.canSendWaManual}
        onClose={() => setDetailNakes(null)}
        onEdit={(n) => {
          setEditingNakes(n);
          setIsFormModalOpen(true);
        }}
        onOpenSendWa={(n) => setWaTargetNakes(n)}
      />

      <SendWaModal
        nakes={permissions.canSendWaManual ? waTargetNakes : null}
        template={settings.templatePesanWa}
        onClose={() => setWaTargetNakes(null)}
        onConfirmSend={handleConfirmSendWaModal}
      />

      <SwitchUserModal
        isOpen={isSwitchUserModalOpen}
        users={users}
        currentUser={currentUser}
        onClose={() => setIsSwitchUserModalOpen(false)}
        onSelectUser={handleSwitchUser}
      />

      {/* Action Confirmation Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs sm:text-sm font-medium px-4 py-3 rounded-lg shadow-lg border border-slate-700 max-w-sm"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
