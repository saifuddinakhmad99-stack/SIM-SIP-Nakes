import React, { useState } from 'react';
import {
  Check,
  Lock,
  Pencil,
  Plus,
  Shield,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  ROLE_PERMISSION_MATRIX,
  RolePermissions,
  UserAccount,
  UserRole,
} from '../types/sip';

interface AccessControlViewProps {
  users: UserAccount[];
  currentUser: UserAccount;
  permissions: RolePermissions;
  onAddUser: (user: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  onUpdateUser: (user: UserAccount) => void;
  onDeleteUser: (id: string) => void;
  onSwitchUser: (user: UserAccount) => void;
}

const ROLE_LIST: UserRole[] = ['admin_it', 'kasi_sdm', 'operator_sdm', 'viewer'];

const MATRIX_CAPABILITIES: Array<{
  key: keyof Omit<RolePermissions, 'role' | 'label' | 'deskripsiSingkat'>;
  label: string;
}> = [
  { key: 'canViewDashboard', label: 'Akses Dashboard Kepatuhan & KPI' },
  { key: 'canViewDataSip', label: 'Cari & Lihat Detail Data SIP / Scan' },
  { key: 'canCreateEditDeleteSip', label: 'Tambah, Ubah, Hapus SIP & Unggah Scan' },
  { key: 'canSendWaManual', label: 'Kirim Pengingat WhatsApp Manual (wa.me)' },
  { key: 'canViewWaLogs', label: 'Lihat Log Notifikasi WhatsApp' },
  { key: 'canRunCronJob', label: 'Jalankan Simulasi Cron Job Harian' },
  { key: 'canExportReports', label: 'Ekspor Laporan Resmi (CSV / Excel)' },
  { key: 'canViewAnalytics', label: 'Analytics & Management Brief Generator' },
  { key: 'canViewAuditLogs', label: 'Lihat Audit Logs Aktivitas Operator' },
  { key: 'canManageSettings', label: 'Ubah Pengaturan & Template Pesan WA' },
  { key: 'canManageUsers', label: 'Manajemen Akun Pengguna & Hak Akses' },
];

export function AccessControlView({
  users,
  currentUser,
  permissions,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onSwitchUser,
}: AccessControlViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [username, setUsername] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [role, setRole] = useState<UserRole>('operator_sdm');
  const [aktif, setAktif] = useState(true);
  const [formError, setFormError] = useState('');

  const openCreateModal = () => {
    setEditingUser(null);
    setNama('');
    setNip('');
    setUsername('');
    setJabatan('');
    setRole('operator_sdm');
    setAktif(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserAccount) => {
    setEditingUser(u);
    setNama(u.nama);
    setNip(u.nip);
    setUsername(u.username);
    setJabatan(u.jabatan);
    setRole(u.role);
    setAktif(u.aktif);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !username.trim() || !jabatan.trim()) {
      setFormError('Harap lengkapi Nama Lengkap, Username, dan Jabatan.');
      return;
    }

    const duplicateUsername = users.some(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.id !== editingUser?.id
    );
    if (duplicateUsername) {
      setFormError('Username sudah digunakan oleh akun lain.');
      return;
    }

    if (editingUser) {
      if (editingUser.id === currentUser.id && !aktif) {
        setFormError('Tidak dapat menonaktifkan akun yang sedang aktif digunakan.');
        return;
      }
      onUpdateUser({
        ...editingUser,
        nama: nama.trim(),
        nip: nip.trim() || '-',
        username: username.trim().toLowerCase(),
        jabatan: jabatan.trim(),
        role,
        aktif,
      });
    } else {
      onAddUser({
        nama: nama.trim(),
        nip: nip.trim() || '-',
        username: username.trim().toLowerCase(),
        jabatan: jabatan.trim(),
        role,
        aktif,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hak Akses (RBAC) &amp; Manajemen Pengguna
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pengaturan peran pengguna sesuai standar keamanan informasi RSUD Sidoarjo Barat.
          </p>
        </div>

        {permissions.canManageUsers && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Tambah Akun Pengguna</span>
          </button>
        )}
      </div>

      {/* Active Session Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">
              Sesi Aktif Saat Ini
            </div>
            <div className="text-base font-bold text-slate-900">
              {currentUser.nama}{' '}
              <span className="text-xs font-mono font-semibold text-[#0F766E]">
                ({ROLE_PERMISSION_MATRIX[currentUser.role].label})
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {ROLE_PERMISSION_MATRIX[currentUser.role].deskripsiSingkat}
            </p>
          </div>
        </div>
        {!permissions.canManageUsers && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 shrink-0">
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Pengubahan user khusus Admin Sistem (IT)</span>
          </div>
        )}
      </div>

      {/* Daftar Akun Pengguna */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">
            Daftar Akun Pengguna ({users.length})
          </h2>
          <span className="text-xs text-slate-500">
            Klik &ldquo;Gunakan Akun&rdquo; untuk menguji hak akses tiap peran secara langsung
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Nama &amp; Jabatan</th>
                <th className="py-3 px-4">Username &amp; NIP</th>
                <th className="py-3 px-4">Role / Hak Akses</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {users.map((u) => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <tr
                    key={u.id}
                    className={isCurrent ? 'bg-teal-50/35' : 'hover:bg-slate-50'}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">
                        {u.nama}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-semibold text-[#0F766E]">
                            (Aktif)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">{u.jabatan}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-semibold text-slate-800">
                        @{u.username}
                      </div>
                      <div className="font-mono text-xs tabular-nums text-slate-500 mt-0.5">
                        {u.nip}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {ROLE_PERMISSION_MATRIX[u.role].label}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          u.aktif
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                            : 'bg-slate-100 border border-slate-200 text-slate-600'
                        }`}
                      >
                        {u.aktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {!isCurrent && u.aktif && (
                          <button
                            type="button"
                            onClick={() => onSwitchUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0F766E] bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Gunakan Akun</span>
                          </button>
                        )}
                        {permissions.canManageUsers && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                              title="Edit Akun & Role"
                              aria-label={`Edit akun ${u.nama}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {!isCurrent &&
                              (confirmDeleteId === u.id ? (
                                <span className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteUser(u.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-700"
                                  >
                                    Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                                  >
                                    Batal
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(u.id)}
                                  className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                                  title="Hapus Akun"
                                  aria-label={`Hapus akun ${u.nama}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ))}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matriks Hak Akses (PRD Bagian 2.1) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            Matriks Pembagian Hak Akses (Role-Based Access Control)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mengacu pada standar hak akses PRD SIM-SIP Nakes RSUD Sidoarjo Barat
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-5">Kapabilitas / Modul</th>
                {ROLE_LIST.map((r) => (
                  <th key={r} className="py-3 px-4 text-center whitespace-nowrap">
                    {ROLE_PERMISSION_MATRIX[r].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {MATRIX_CAPABILITIES.map((cap) => (
                <tr key={cap.key} className="hover:bg-slate-50">
                  <td className="py-3 px-5 font-medium text-slate-800">
                    {cap.label}
                  </td>
                  {ROLE_LIST.map((r) => {
                    const allowed = ROLE_PERMISSION_MATRIX[r][cap.key];
                    return (
                      <td key={r} className="py-3 px-4 text-center">
                        {allowed ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-50 text-emerald-700">
                            <Check className="w-3.5 h-3.5" aria-label="Diizinkan" />
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-400"
                            aria-label="Tidak diizinkan"
                          >
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 id="user-modal-title" className="text-base font-bold text-slate-900">
                {editingUser ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Tutup modal user"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar *
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: dr. Siti Rahmawati"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="staf.sdm"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP / NIK
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="19900101 201801 2 001"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jabatan *
                </label>
                <input
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Staf Sub-Bagian SDM"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role / Hak Akses *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E]"
                  >
                    {ROLE_LIST.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_PERMISSION_MATRIX[r].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-4">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aktif}
                      onChange={(e) => setAktif(e.target.checked)}
                      className="w-4 h-4 accent-[#0F766E] rounded"
                    />
                    <span>Status Akun Aktif</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57]"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
