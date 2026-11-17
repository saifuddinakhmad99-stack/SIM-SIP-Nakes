import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Tabel Roles (RBAC)
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  roleName: text('role_name').notNull().unique(), // Admin IT, Kasi SDM, Operator SDM, Viewer
  permissions: jsonb('permissions').$type<Record<string, boolean>>().notNull(),
});

// 2. Tabel Users (Operator, Supervisor, Admin IT, Viewer + Firebase UID link)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').unique(), // Firebase Auth UID (Google Sign-In)
  name: text('name').notNull(),
  nip: text('nip').notNull().default('-'),
  username: text('username').notNull().unique(),
  email: text('email').unique(),
  passwordHash: text('password_hash').notNull(),
  roleId: integer('role_id')
    .references(() => roles.id, { onDelete: 'restrict' })
    .notNull(),
  status: text('status').notNull().default('Aktif'), // Aktif | Nonaktif
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Tabel Units (Unit Kerja / Instalasi / Poli / Penunjang)
export const units = pgTable('units', {
  id: serial('id').primaryKey(),
  unitCode: text('unit_code').notNull().unique(),
  unitName: text('unit_name').notNull().unique(),
  category: text('category').notNull(), // Instalasi | Poli | Penunjang
});

// 4. Tabel Professions (Kategori Profesi Nakes)
export const professions = pgTable('professions', {
  id: serial('id').primaryKey(),
  professionName: text('profession_name').notNull().unique(),
});

// 5. Tabel Health Workers (Master Data Tenaga Kesehatan)
export const healthWorkers = pgTable('health_workers', {
  id: serial('id').primaryKey(),
  nipNik: text('nip_nik').notNull().unique(),
  fullName: text('full_name').notNull(),
  professionId: integer('profession_id')
    .references(() => professions.id, { onDelete: 'restrict' })
    .notNull(),
  unitId: integer('unit_id')
    .references(() => units.id, { onDelete: 'restrict' })
    .notNull(),
  whatsappNumber: text('whatsapp_number').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Tabel SIP Documents (Dokumen Legalitas SIP & Arsip Scan)
export const sipDocuments = pgTable('sip_documents', {
  id: serial('id').primaryKey(),
  workerId: integer('worker_id')
    .references(() => healthWorkers.id, { onDelete: 'cascade' })
    .notNull(),
  strNumber: text('str_number').notNull(),
  sipNumber: text('sip_number').notNull().unique(),
  issuedDate: date('issued_date', { mode: 'string' }).notNull(),
  expiryDate: date('expiry_date', { mode: 'string' }).notNull(),
  scanFilePath: text('scan_file_path'),
  renewalStatus: text('renewal_status').notNull().default('Aktif'), // Aktif | Dalam Pengurusan | Kadaluarsa
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 7. Tabel WA Templates (Template Pesan Pengingat Dinamis)
export const waTemplates = pgTable('wa_templates', {
  id: serial('id').primaryKey(),
  triggerCode: text('trigger_code').notNull().unique(), // H180 | H90 | H30 | MANUAL
  templateBody: text('template_body').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

// 8. Tabel Notification Logs (Riwayat Pengiriman WA & Anti-Spam)
export const notificationLogs = pgTable('notification_logs', {
  id: serial('id').primaryKey(),
  sipId: integer('sip_id')
    .references(() => sipDocuments.id, { onDelete: 'cascade' })
    .notNull(),
  workerId: integer('worker_id')
    .references(() => healthWorkers.id, { onDelete: 'cascade' })
    .notNull(),
  triggerType: text('trigger_type').notNull(), // H180 | H90 | H30 | MANUAL | AUTO_LT_180
  phoneTarget: text('phone_target').notNull(),
  messageSent: text('message_sent').notNull(),
  deliveryStatus: text('delivery_status').notNull(), // Terkirim | Gagal
  gatewayResponse: text('gateway_response'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
});

// 9. Tabel Audit Logs (Rekam Jejak Aktivitas Operator)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(), // CREATE | UPDATE | DELETE | EXPORT | CRON_RUN
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// --- Drizzle ORM Relations ---

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  auditLogs: many(auditLogs),
}));

export const unitsRelations = relations(units, ({ many }) => ({
  healthWorkers: many(healthWorkers),
}));

export const professionsRelations = relations(professions, ({ many }) => ({
  healthWorkers: many(healthWorkers),
}));

export const healthWorkersRelations = relations(healthWorkers, ({ one, many }) => ({
  profession: one(professions, {
    fields: [healthWorkers.professionId],
    references: [professions.id],
  }),
  unit: one(units, {
    fields: [healthWorkers.unitId],
    references: [units.id],
  }),
  sipDocuments: many(sipDocuments),
  notificationLogs: many(notificationLogs),
}));

export const sipDocumentsRelations = relations(sipDocuments, ({ one, many }) => ({
  worker: one(healthWorkers, {
    fields: [sipDocuments.workerId],
    references: [healthWorkers.id],
  }),
  notificationLogs: many(notificationLogs),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  sipDocument: one(sipDocuments, {
    fields: [notificationLogs.sipId],
    references: [sipDocuments.id],
  }),
  worker: one(healthWorkers, {
    fields: [notificationLogs.workerId],
    references: [healthWorkers.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
