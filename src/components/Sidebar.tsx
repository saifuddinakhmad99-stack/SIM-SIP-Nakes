import {
  ArrowLeftRight,
  BarChart3,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  X,
} from 'lucide-react';
import {
  NavSection,
  ROLE_PERMISSION_MATRIX,
  RolePermissions,
  UserAccount,
} from '../types/sip';

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  urgentCount: number;
  namaInstansi: string;
  currentUser: UserAccount;
  permissions: RolePermissions;
  onOpenSwitchUser: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'data-sip', label: 'Data SIP', icon: FileText },
  { id: 'log-wa', label: 'Log Notifikasi & Simulasi Auto-Reminder', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics & Brief', icon: BarChart3 },
  { id: 'audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { id: 'hak-akses', label: 'Hak Akses & User', icon: Shield },
  { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
];

function getInitials(nama: string): string {
  const cleaned = nama
    .replace(/\b(dr\.|drg\.|Ns\.|Bdn\.|apt\.|Ir\.)\s*/gi, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'US';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Sidebar({
  activeSection,
  onNavigate,
  urgentCount,
  namaInstansi,
  currentUser,
  permissions,
  onOpenSwitchUser,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const handleSelect = (id: NavSection) => {
    onNavigate(id);
    onCloseMobile();
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    switch (item.id) {
      case 'dashboard':
        return permissions.canViewDashboard;
      case 'data-sip':
        return permissions.canViewDataSip;
      case 'log-wa':
        return permissions.canViewWaLogs;
      case 'analytics':
        return permissions.canViewAnalytics;
      case 'audit-logs':
        return permissions.canViewAuditLogs;
      case 'hak-akses':
        return permissions.canManageUsers || permissions.role === 'kasi_sdm';
      case 'pengaturan':
        return permissions.canManageSettings;
      default:
        return true;
    }
  });

  const roleLabel = ROLE_PERMISSION_MATRIX[currentUser.role].label;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-[276px] shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white"
            style={{ backgroundColor: '#0F766E' }}
          >
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
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-slate-900 truncate">
              SIM-SIP NAKES
            </div>
            <div className="text-xs text-slate-500 truncate">
              {namaInstansi}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
          aria-label="Tutup menu navigasi"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Navigasi Utama">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] text-left ${
                isActive
                  ? 'bg-[#0F766E] text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="leading-snug">{item.label}</span>
              </span>
              {item.id === 'data-sip' && urgentCount > 0 && (
                <span
                  className={`text-xs font-mono tabular-nums font-semibold shrink-0 ${
                    isActive ? 'text-teal-100' : 'text-red-600'
                  }`}
                  title={`${urgentCount} SIP kritis atau kadaluarsa`}
                >
                  {urgentCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active User Profile & Role Switcher */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center text-xs font-bold shrink-0">
            {getInitials(currentUser.nama)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">
              {currentUser.nama}
            </div>
            <div className="text-xs font-medium text-[#0F766E] truncate">
              {roleLabel}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onOpenSwitchUser();
            onCloseMobile();
          }}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
          <span>Ganti Akun / Role</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Static Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex h-full">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
