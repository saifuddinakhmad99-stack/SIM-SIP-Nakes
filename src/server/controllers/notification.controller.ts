import { type Response } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  healthWorkers,
  notificationLogs,
  professions,
  sipDocuments,
  units,
  waTemplates,
} from '../../db/schema.ts';
import { type AuthRequest } from '../middlewares/auth.middleware.ts';
import { recordDbAudit } from '../services/audit.service.ts';
import { runDailySipReminderJob } from '../services/cronReminder.service.ts';
import {
  dispatchWhatsappMessage,
  renderWaTemplateBody,
} from '../services/whatsapp.service.ts';
import {
  calculateDaysRemainingWib,
  normalizeWhatsappNumber,
} from '../utils/sanitize.ts';

export async function getNotificationLogsController(_req: AuthRequest, res: Response) {
  try {
    const rows = await db
      .select({
        id: notificationLogs.id,
        sipId: notificationLogs.sipId,
        workerId: notificationLogs.workerId,
        workerName: healthWorkers.fullName,
        sipNumber: sipDocuments.sipNumber,
        triggerType: notificationLogs.triggerType,
        phoneTarget: notificationLogs.phoneTarget,
        messageSent: notificationLogs.messageSent,
        deliveryStatus: notificationLogs.deliveryStatus,
        gatewayResponse: notificationLogs.gatewayResponse,
        sentAt: notificationLogs.sentAt,
      })
      .from(notificationLogs)
      .innerJoin(healthWorkers, eq(notificationLogs.workerId, healthWorkers.id))
      .innerJoin(sipDocuments, eq(notificationLogs.sipId, sipDocuments.id))
      .orderBy(desc(notificationLogs.sentAt))
      .limit(200);

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching notification logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil riwayat log notifikasi WhatsApp.',
    });
  }
}

export async function getWaTemplatesController(_req: AuthRequest, res: Response) {
  try {
    const rows = await db.select().from(waTemplates);
    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching WA templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil daftar template pesan WhatsApp.',
    });
  }
}

export async function updateWaTemplateController(req: AuthRequest, res: Response) {
  try {
    const triggerCode = String(req.params.triggerCode || '').toUpperCase();
    if (!['H180', 'H90', 'H30', 'MANUAL'].includes(triggerCode)) {
      return res.status(400).json({
        success: false,
        error: 'Kode trigger harus berupa H180, H90, H30, atau MANUAL.',
      });
    }

    const { template_body, is_active } = req.body || {};
    if (typeof template_body !== 'string' || !template_body.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Isi naskah template_body wajib diisi.',
      });
    }

    const updated = await db
      .insert(waTemplates)
      .values({
        triggerCode,
        templateBody: template_body.trim(),
        isActive: typeof is_active === 'boolean' ? is_active : true,
      })
      .onConflictDoUpdate({
        target: waTemplates.triggerCode,
        set: {
          templateBody: template_body.trim(),
          isActive: typeof is_active === 'boolean' ? is_active : true,
        },
      })
      .returning();

    await recordDbAudit({
      userId: req.dbUser?.id,
      action: 'UPDATE',
      tableName: 'wa_templates',
      recordId: triggerCode,
      description: `Memperbarui template pesan WhatsApp untuk trigger ${triggerCode}.`,
    });

    return res.json({
      success: true,
      data: updated[0],
    });
  } catch (error) {
    console.error('Error updating WA template:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal memperbarui template pesan WhatsApp.',
    });
  }
}

export async function sendManualNotificationController(req: AuthRequest, res: Response) {
  try {
    const { sip_id, custom_message } = req.body || {};
    const sipId = Number(sip_id);
    if (!Number.isInteger(sipId) || sipId <= 0) {
      return res.status(400).json({ success: false, error: 'sip_id tidak valid.' });
    }

    const rows = await db
      .select({
        sipId: sipDocuments.id,
        workerId: healthWorkers.id,
        fullName: healthWorkers.fullName,
        whatsappNumber: healthWorkers.whatsappNumber,
        professionName: professions.professionName,
        unitName: units.unitName,
        sipNumber: sipDocuments.sipNumber,
        expiryDate: sipDocuments.expiryDate,
      })
      .from(sipDocuments)
      .innerJoin(healthWorkers, eq(sipDocuments.workerId, healthWorkers.id))
      .innerJoin(professions, eq(healthWorkers.professionId, professions.id))
      .innerJoin(units, eq(healthWorkers.unitId, units.id))
      .where(eq(sipDocuments.id, sipId))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dokumen SIP tidak ditemukan.' });
    }

    const target = rows[0];
    const alreadySentToday = await db
      .select({ id: notificationLogs.id })
      .from(notificationLogs)
      .where(
        and(
          eq(notificationLogs.workerId, target.workerId),
          eq(notificationLogs.triggerType, 'MANUAL'),
          sql`(${notificationLogs.sentAt} AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date`
        )
      )
      .limit(1);

    if (alreadySentToday.length > 0) {
      return res.status(429).json({
        success: false,
        error: 'Validasi Anti-Spam: Pengingat manual untuk nakes ini sudah terkirim hari ini.',
      });
    }

    const templateRow = await db
      .select()
      .from(waTemplates)
      .where(eq(waTemplates.triggerCode, 'MANUAL'))
      .limit(1);

    const daysRemaining = calculateDaysRemainingWib(target.expiryDate);
    const messageBody =
      typeof custom_message === 'string' && custom_message.trim()
        ? custom_message.trim()
        : renderWaTemplateBody(
            templateRow[0]?.templateBody ||
              'Yth. {nama} ({profesi}), mohon segera menindaklanjuti perpanjangan SIP Nomor {no_sip} yang berakhir pada {tgl_kadaluarsa} (sisa {sisa_hari} hari).',
            {
              nama: target.fullName,
              profesi: target.professionName,
              unit: target.unitName,
              noSip: target.sipNumber,
              tglKadaluarsa: target.expiryDate,
              sisaHari: daysRemaining,
            }
          );

    const phoneTarget = normalizeWhatsappNumber(target.whatsappNumber);
    const dispatch = await dispatchWhatsappMessage(phoneTarget, messageBody);

    const inserted = await db
      .insert(notificationLogs)
      .values({
        sipId: target.sipId,
        workerId: target.workerId,
        triggerType: 'MANUAL',
        phoneTarget,
        messageSent: messageBody,
        deliveryStatus: dispatch.deliveryStatus,
        gatewayResponse: dispatch.gatewayResponse,
      })
      .returning();

    await recordDbAudit({
      userId: req.dbUser?.id,
      action: 'CREATE',
      tableName: 'notification_logs',
      recordId: inserted[0].id,
      description: `Mengirim pengingat WA manual ke ${target.fullName} (+${phoneTarget}) untuk SIP ${target.sipNumber}.`,
    });

    return res.json({
      success: true,
      data: inserted[0],
    });
  } catch (error) {
    console.error('Error sending manual notification:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengirim notifikasi WhatsApp manual.',
    });
  }
}

export async function runCronSimulationController(req: AuthRequest, res: Response) {
  try {
    const result = await runDailySipReminderJob(req.dbUser?.id ?? null, true);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error running cron simulation:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal menjalankan simulasi Cron Job pengingat harian.',
    });
  }
}
