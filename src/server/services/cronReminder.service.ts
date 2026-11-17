import cron from 'node-cron';
import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  healthWorkers,
  notificationLogs,
  professions,
  sipDocuments,
  units,
  waTemplates,
} from '../../db/schema.ts';
import { serverConfig } from '../config/env.ts';
import { normalizeWhatsappNumber } from '../utils/sanitize.ts';
import { recordDbAudit } from './audit.service.ts';
import {
  dispatchWhatsappMessage,
  renderWaTemplateBody,
  sleepMs,
} from './whatsapp.service.ts';

const DEFAULT_FALLBACK_TEMPLATE =
  'Yth. {nama} ({profesi}), Sub-Bagian SDM RSUD Sidoarjo Barat menginformasikan bahwa SIP Nomor {no_sip} akan berakhir pada {tgl_kadaluarsa} (sisa {sisa_hari} hari). Mohon segera menyiapkan berkas perpanjangan SIP.';

export interface CronReminderDetail {
  sipId: number;
  workerId: number;
  fullName: string;
  professionName: string;
  sipNumber: string;
  triggerType: 'H180' | 'H90' | 'H30';
  daysRemaining: number;
  status: 'Terkirim' | 'Gagal' | 'Dicegah Anti-Spam';
  reason: string;
}

export interface CronJobExecutionResult {
  executedAtWib: string;
  scannedCandidates: number;
  sentCount: number;
  failedCount: number;
  skippedAntiSpamCount: number;
  details: CronReminderDetail[];
}

export async function runDailySipReminderJob(
  triggeredByUserId: number | null = null,
  isSimulation = false
): Promise<CronJobExecutionResult> {
  const details: CronReminderDetail[] = [];
  let sentCount = 0;
  let failedCount = 0;
  let skippedAntiSpamCount = 0;

  try {
    // 1. Query active SIP documents with exact expiry_date - CURRENT_DATE (WIB) in (180, 90, 30)
    const candidates = await db
      .select({
        sipId: sipDocuments.id,
        workerId: healthWorkers.id,
        fullName: healthWorkers.fullName,
        whatsappNumber: healthWorkers.whatsappNumber,
        professionName: professions.professionName,
        unitName: units.unitName,
        sipNumber: sipDocuments.sipNumber,
        expiryDate: sipDocuments.expiryDate,
        daysRemaining: sql<number>`(${sipDocuments.expiryDate}::date - (NOW() AT TIME ZONE 'Asia/Jakarta')::date)::int`,
      })
      .from(sipDocuments)
      .innerJoin(healthWorkers, eq(sipDocuments.workerId, healthWorkers.id))
      .innerJoin(professions, eq(healthWorkers.professionId, professions.id))
      .innerJoin(units, eq(healthWorkers.unitId, units.id))
      .where(
        and(
          eq(healthWorkers.isActive, true),
          ne(sipDocuments.renewalStatus, 'Kadaluarsa'),
          sql`(${sipDocuments.expiryDate}::date - (NOW() AT TIME ZONE 'Asia/Jakarta')::date) IN (180, 90, 30)`
        )
      );

    // Load active WA templates
    const templatesRows = await db
      .select()
      .from(waTemplates)
      .where(eq(waTemplates.isActive, true));
    const templateMap = new Map(
      templatesRows.map((t) => [t.triggerCode, t.templateBody])
    );

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      const triggerType: 'H180' | 'H90' | 'H30' =
        candidate.daysRemaining === 180
          ? 'H180'
          : candidate.daysRemaining === 90
          ? 'H90'
          : 'H30';

      // 2. Anti-Spam check: already sent to this worker for this trigger_type on the same WIB calendar date?
      const existingToday = await db
        .select({ id: notificationLogs.id })
        .from(notificationLogs)
        .where(
          and(
            eq(notificationLogs.workerId, candidate.workerId),
            eq(notificationLogs.triggerType, triggerType),
            sql`(${notificationLogs.sentAt} AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date`
          )
        )
        .limit(1);

      if (existingToday.length > 0) {
        skippedAntiSpamCount++;
        details.push({
          sipId: candidate.sipId,
          workerId: candidate.workerId,
          fullName: candidate.fullName,
          professionName: candidate.professionName,
          sipNumber: candidate.sipNumber,
          triggerType,
          daysRemaining: candidate.daysRemaining,
          status: 'Dicegah Anti-Spam',
          reason: `Pengingat ${triggerType} hari ini sudah pernah dikirim sebelumnya.`,
        });
        continue;
      }

      // 3. Render dynamic message from template
      const templateBody =
        templateMap.get(triggerType) ||
        templateMap.get('H180') ||
        DEFAULT_FALLBACK_TEMPLATE;

      const renderedMessage = renderWaTemplateBody(templateBody, {
        nama: candidate.fullName,
        profesi: candidate.professionName,
        unit: candidate.unitName,
        noSip: candidate.sipNumber,
        tglKadaluarsa: candidate.expiryDate,
        sisaHari: candidate.daysRemaining,
      });

      const phoneTarget = normalizeWhatsappNumber(candidate.whatsappNumber);

      // 4. Dispatch HTTP POST to WhatsApp Gateway (+ 2.5s throttling delay between consecutive sends)
      if (sentCount + failedCount > 0) {
        await sleepMs(serverConfig.waGateway.delayMs);
      }

      const dispatch = await dispatchWhatsappMessage(phoneTarget, renderedMessage);

      // 5. Save response to notification_logs
      await db.insert(notificationLogs).values({
        sipId: candidate.sipId,
        workerId: candidate.workerId,
        triggerType,
        phoneTarget,
        messageSent: renderedMessage,
        deliveryStatus: dispatch.deliveryStatus,
        gatewayResponse: dispatch.gatewayResponse,
      });

      if (dispatch.success) {
        sentCount++;
      } else {
        failedCount++;
      }

      details.push({
        sipId: candidate.sipId,
        workerId: candidate.workerId,
        fullName: candidate.fullName,
        professionName: candidate.professionName,
        sipNumber: candidate.sipNumber,
        triggerType,
        daysRemaining: candidate.daysRemaining,
        status: dispatch.deliveryStatus,
        reason: dispatch.gatewayResponse,
      });
    }

    await recordDbAudit({
      userId: triggeredByUserId,
      action: 'CRON_RUN',
      tableName: 'notification_logs',
      recordId: isSimulation ? 'SIMULATION' : 'SCHEDULED_0800_WIB',
      description: `${isSimulation ? 'Simulasi manual Cron Job' : 'Cron Job otomatis 08.00 WIB'}: ${candidates.length} kandidat dipindai, ${sentCount} terkirim, ${failedCount} gagal, ${skippedAntiSpamCount} dicegah Anti-Spam.`,
    });

    return {
      executedAtWib: new Date().toLocaleString('sv-SE', {
        timeZone: 'Asia/Jakarta',
      }),
      scannedCandidates: candidates.length,
      sentCount,
      failedCount,
      skippedAntiSpamCount,
      details,
    };
  } catch (error) {
    console.error('Daily SIP reminder Cron Job failed:', error);
    throw new Error('Gagal menjalankan pemindaian Cron Job pengingat SIP.', {
      cause: error,
    });
  }
}

let scheduledTask: ReturnType<typeof cron.schedule> | null = null;

export function startCronScheduler() {
  if (scheduledTask) return scheduledTask;

  // Runs automatically every day at 08:00 WIB (Asia/Jakarta)
  scheduledTask = cron.schedule(
    '0 8 * * *',
    () => {
      console.log('[SIM-SIP CRON] Menjalankan pemindaian otomatis SIP pukul 08.00 WIB...');
      runDailySipReminderJob(null, false).catch((err) => {
        console.error('[SIM-SIP CRON] Error during scheduled execution:', err);
      });
    },
    {
      timezone: 'Asia/Jakarta',
    }
  );

  return scheduledTask;
}
