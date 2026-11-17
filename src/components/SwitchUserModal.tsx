import { CheckCircle2, Shield, X } from 'lucide-react';
import { ROLE_PERMISSION_MATRIX, UserAccount } from '../types/sip';

interface SwitchUserModalProps {
  isOpen: boolean;
  users: UserAccount[];
  currentUser: UserAccount;
  onClose: () => void;
  onSelectUser: (user: UserAccount) => void;
}

export function SwitchUserModal({
  isOpen,
  users,
  currentUser,
  onClose,
  onSelectUser,
}: SwitchUserModalProps) {
  if (!isOpen) return null;

  const activeUsers = users.filter((u) => u.aktif);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="switch-user-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
            <h2 id="switch-user-title" className="text-base font-bold text-slate-900">
              Ganti Akun &amp; Simulasi Hak Akses (RBAC)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Tutup modal ganti akun"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-slate-600 leading-relaxed">
            Pilih akun pengguna di bawah ini untuk menguji pembatasan hak akses sesuai peran pada dokumen PRD (Admin IT, Kasi SDM, Operator SDM, dan Viewer / Komite Pimpinan).
          </p>

          <div className="space-y-2.5">
            {activeUsers.map((user) => {
              const roleMeta = ROLE_PERMISSION_MATRIX[user.role];
              const isSelected = user.id === currentUser.id;
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onSelectUser(user);
                    onClose();
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-[#0F766E] bg-teal-50/50'
                      : 'border-slate-200 hover:border-teal-600/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {user.nama}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        @{user.username}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#0F766E]">
                      {roleMeta.label} · {user.jabatan}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {roleMeta.deskripsiSingkat}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle2
                      className="w-5 h-5 text-[#0F766E] shrink-0 mt-0.5"
                      aria-label="Akun aktif"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
