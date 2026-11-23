import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { BackendSessionUser } from '../types/sip';

interface LoginViewProps {
  namaInstansi: string;
  onLoginSuccess: (user: BackendSessionUser, method: 'password' | 'google') => void;
}

const RBAC_QUICK_ACCOUNTS = [
  {
    username: 'admin.it',
    label: 'Admin IT',
    jabatan: 'Administrator Sistem',
  },
  {
    username: 'kasi.sdm',
    label: 'Kasi SDM',
    jabatan: 'Supervisor Kepegawaian',
  },
  {
    username: 'operator.sdm',
    label: 'Operator SDM',
    jabatan: 'Staf Administrasi SIP',
  },
  {
    username: 'komite.pimpinan',
    label: 'Viewer',
    jabatan: 'Komite & Pimpinan RSUD',
  },
];

export function LoginView({ namaInstansi, onLoginSuccess }: LoginViewProps) {
  const { loginWithCredentials, loginWithGoogleSso } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ssoSubmitting, setSsoSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password) {
      setErrorMessage('Harap masukkan username dan kata sandi terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await loginWithCredentials(username, password);
      onLoginSuccess(user, 'password');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Autentikasi gagal. Periksa kembali kredensial Anda.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage('');
    setSsoSubmitting(true);
    try {
      const user = await loginWithGoogleSso();
      onLoginSuccess(user, 'google');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Login dengan akun Google dibatalkan atau gagal diproses.'
      );
    } finally {
      setSsoSubmitting(false);
    }
  };

  const handleFillDemoAccount = (demoUsername: string) => {
    setUsername(demoUsername);
    setPassword('RsudSidobar2026!');
    setErrorMessage('');
  };

  const isBusy = submitting || ssoSubmitting;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 grid grid-cols-1 lg:grid-cols-12">
      {/* Left Institutional Panel */}
      <aside className="hidden lg:flex lg:col-span-5 bg-[#0F766E] text-white flex-col justify-between p-10 xl:p-12 relative overflow-hidden">
        {/* Top Institutional Lockup */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-6 h-6 text-white"
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
            <div className="text-base font-bold tracking-tight text-white">
              SIM-SIP NAKES
            </div>
            <div className="text-xs font-medium text-teal-100 truncate">
              {namaInstansi}
            </div>
          </div>
        </div>

        {/* Core Institutional Value Statement */}
        <div className="relative z-10 space-y-8 my-auto py-8 max-w-md">
          <div className="space-y-4">
            <h1 className="text-3xl xl:text-[34px] font-bold tracking-tight leading-tight text-white [text-wrap:balance]">
              Portal Monitoring Surat Izin Praktik Tenaga Kesehatan
            </h1>
            <p className="text-sm xl:text-[15px] text-teal-50/90 leading-relaxed">
              Sistem terpadu untuk pemantauan masa berlaku SIP dan STR, arsip digital dokumen perizinan, serta pengingat perpanjangan otomatis bagi seluruh tenaga kesehatan rumah sakit.
            </p>
          </div>

          <div className="border-t border-white/15 pt-6 space-y-4">
            <div className="flex items-start justify-between gap-4 text-sm">
              <span className="font-semibold text-white">Status Kepatuhan SIP</span>
              <span className="text-teal-100 text-right font-mono tabular-nums text-xs">
                Aman &gt;180 hr · Kritis ≤30 hr
              </span>
            </div>
            <div className="border-t border-white/10 pt-4 flex items-start justify-between gap-4 text-sm">
              <span className="font-semibold text-white">Penjadwalan Auto-Reminder</span>
              <span className="text-teal-100 text-right font-mono tabular-nums text-xs">
                H-180 · H-90 · H-30 (08.00 WIB)
              </span>
            </div>
            <div className="border-t border-white/10 pt-4 flex items-start justify-between gap-4 text-sm">
              <span className="font-semibold text-white">Kontrol Hak Akses (RBAC)</span>
              <span className="text-teal-100 text-right text-xs">
                Admin IT · Kasi SDM · Operator · Viewer
              </span>
            </div>
          </div>
        </div>

        {/* Quiet Institutional Attribution */}
        <div className="relative z-10 border-t border-white/15 pt-5 text-xs text-teal-100/90 flex items-center justify-between gap-4">
          <span>Sub-Bagian Kepegawaian &amp; Diklat</span>
          <span className="font-mono">WIB · Asia/Jakarta</span>
        </div>
      </aside>

      {/* Right Authentication Form Canvas */}
      <main className="lg:col-span-7 flex flex-col items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile-only Brand Header */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F766E] text-white flex items-center justify-center shrink-0">
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
              <div className="text-base font-bold text-slate-900 truncate">
                SIM-SIP NAKES
              </div>
              <div className="text-xs text-slate-500 truncate">{namaInstansi}</div>
            </div>
          </div>

          {/* Single-Elevation Login Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
                <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Autentikasi Pegawai</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Masuk ke Sistem
              </h2>
              <p className="text-sm text-slate-600">
                Masukkan username dan kata sandi terdaftar, atau gunakan akun Google instansi.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Username Pegawai
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isBusy}
                    placeholder="contoh: admin.it"
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock
                    className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isBusy}
                    placeholder="Masukkan kata sandi"
                    className="w-full min-h-[44px] pl-10 pr-11 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/25 focus:border-[#0F766E] disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isBusy}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isBusy}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F766E] rounded-lg hover:bg-[#0D5E57] transition-colors duration-150 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
              >
                <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{submitting ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
              </button>
            </form>

            {/* Hairline Divider */}
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="px-3 text-xs font-medium text-slate-400">atau</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            {/* Google SSO Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isBusy}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors duration-150 disabled:opacity-60 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] focus-visible:ring-offset-2"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>
                {ssoSubmitting ? 'Menghubungkan Google...' : 'Masuk dengan Akun Google (SSO)'}
              </span>
            </button>

            {/* Quick RBAC Credential Selector */}
            <div className="border-t border-slate-200 pt-5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  Isi Cepat Akun Pengujian RBAC
                </span>
                <span className="font-mono text-[11px]">4 Peran PRD</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {RBAC_QUICK_ACCOUNTS.map((acc) => {
                  const isFilled = username.trim().toLowerCase() === acc.username;
                  return (
                    <button
                      key={acc.username}
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleFillDemoAccount(acc.username)}
                      className={`text-left px-3 py-2 rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E] ${
                        isFilled
                          ? 'border-[#0F766E] bg-teal-50/60 text-slate-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">{acc.label}</div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        @{acc.username}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-500">
            {namaInstansi} · Sistem Monitoring Kepatuhan Perizinan Nakes
          </p>
        </div>
      </main>
    </div>
  );
}
