-- ============================================================================
-- SIM-SIP NAKES RSUD SIDOARJO BARAT
-- Skema Database Relasional PostgreSQL (Zona Waktu: Asia/Jakarta / WIB)
-- ============================================================================

SET TIME ZONE 'Asia/Jakarta';

-- 1. Tabel Roles (Hak Akses RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE CHECK (role_name IN ('Admin IT', 'Kasi SDM', 'Operator SDM', 'Viewer')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Tabel Users (Pengguna Sistem & Link Firebase Auth UID)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT UNIQUE,
  name TEXT NOT NULL,
  nip TEXT NOT NULL DEFAULT '-',
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabel Units (Unit Layanan / Instalasi / Poli / Penunjang)
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  unit_code TEXT NOT NULL UNIQUE,
  unit_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('Instalasi', 'Poli', 'Penunjang'))
);

-- 4. Tabel Professions (Kategori Profesi Nakes)
CREATE TABLE IF NOT EXISTS professions (
  id SERIAL PRIMARY KEY,
  profession_name TEXT NOT NULL UNIQUE
);

-- 5. Tabel Health Workers (Data Induk Tenaga Kesehatan)
CREATE TABLE IF NOT EXISTS health_workers (
  id SERIAL PRIMARY KEY,
  nip_nik TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  profession_id INTEGER NOT NULL REFERENCES professions(id) ON DELETE RESTRICT,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  whatsapp_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Tabel SIP Documents (Arsip Legalitas SIP & File Scan)
CREATE TABLE IF NOT EXISTS sip_documents (
  id SERIAL PRIMARY KEY,
  worker_id INTEGER NOT NULL REFERENCES health_workers(id) ON DELETE CASCADE,
  str_number TEXT NOT NULL,
  sip_number TEXT NOT NULL UNIQUE,
  issued_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  scan_file_path TEXT,
  renewal_status TEXT NOT NULL DEFAULT 'Aktif' CHECK (renewal_status IN ('Aktif', 'Dalam Pengurusan', 'Kadaluarsa')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sip_dates CHECK (expiry_date >= issued_date)
);

-- 7. Tabel WA Templates (Naskah Pengingat Dinamis)
CREATE TABLE IF NOT EXISTS wa_templates (
  id SERIAL PRIMARY KEY,
  trigger_code TEXT NOT NULL UNIQUE CHECK (trigger_code IN ('H180', 'H90', 'H30', 'MANUAL')),
  template_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8. Tabel Notification Logs (Log Pengiriman WA & Validasi Anti-Spam)
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  sip_id INTEGER NOT NULL REFERENCES sip_documents(id) ON DELETE CASCADE,
  worker_id INTEGER NOT NULL REFERENCES health_workers(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  phone_target TEXT NOT NULL,
  message_sent TEXT NOT NULL,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('Terkirim', 'Gagal')),
  gateway_response TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Tabel Audit Logs (Audit Trail Aktivitas Operator)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'CRON_RUN')),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeks Performa Query Cron Job, Pencarian, & Anti-Spam
CREATE INDEX IF NOT EXISTS idx_sip_expiry_active ON sip_documents (expiry_date, renewal_status);
CREATE INDEX IF NOT EXISTS idx_workers_profession ON health_workers (profession_id);
CREATE INDEX IF NOT EXISTS idx_workers_unit ON health_workers (unit_id);
CREATE INDEX IF NOT EXISTS idx_notif_antispam ON notification_logs (worker_id, trigger_type, sent_at);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at DESC);
