import { type Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  auditLogs,
  healthWorkers,
  notificationLogs,
  professions,
  roles,
  sipDocuments,
  users,
} from '../../db/schema.ts';
import { type AuthRequest } from '../middlewares/auth.middleware.ts';
import { calculateDaysRemainingWib } from '../utils/sanitize.ts';

export async function getAnalyticsSummaryController(_req: AuthRequest, res: Response) {
  try {
    const rows = await db
      .select({
        sipId: sipDocuments.id,
        expiryDate: sipDocuments.expiryDate,
        renewalStatus: sipDocuments.renewalStatus,
        professionName: professions.professionName,
      })
      .from(sipDocuments)
      .innerJoin(healthWorkers, eq(sipDocuments.workerId, healthWorkers.id))
      .innerJoin(professions, eq(healthWorkers.professionId, professions.id))
      .where(eq(healthWorkers.isActive, true));

    let aman = 0;
    let peringatan = 0;
    let kritis = 0;
    let kadaluarsa = 0;

    const professionMap = new Map<
      string,
      {
        profession: string;
        total: number;
        aman: number;
        peringatan: number;
        kritis: number;
        kadaluarsa: number;
      }
    >();

    // Monthly 6-month projection buckets in WIB
    const nowJakarta = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
    );
    const monthlyProjection: Array<{
      monthKey: string;
      label: string;
      expiringCount: number;
    }> = [];

    for (let i = 0; i < 6; i++) {
      const d = new Date(nowJakarta.getFullYear(), nowJakarta.getMonth() + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        year: 'numeric',
      }).format(d);
      monthlyProjection.push({ monthKey, label, expiringCount: 0 });
    }

    for (const row of rows) {
      const days = calculateDaysRemainingWib(row.expiryDate);
      const profEntry = professionMap.get(row.professionName) || {
        profession: row.professionName,
        total: 0,
        aman: 0,
        peringatan: 0,
        kritis: 0,
        kadaluarsa: 0,
      };
      profEntry.total++;

      if (days <= 0) {
        kadaluarsa++;
        profEntry.kadaluarsa++;
      } else if (days <= 30) {
        kritis++;
        profEntry.kritis++;
      } else if (days <= 180) {
        peringatan++;
        profEntry.peringatan++;
      } else {
        aman++;
        profEntry.aman++;
      }
      professionMap.set(row.professionName, profEntry);

      const ym = row.expiryDate.slice(0, 7);
      const bucket = monthlyProjection.find((m) => m.monthKey === ym);
      if (bucket) {
        bucket.expiringCount++;
      }
    }

    const totalWorkers = rows.length;
    const validWorkers = totalWorkers - kadaluarsa;
    const complianceRatePct =
      totalWorkers > 0 ? Number(((validWorkers / totalWorkers) * 100).toFixed(1)) : 100;

    const currentMonthPrefix = `${nowJakarta.getFullYear()}-${String(
      nowJakarta.getMonth() + 1
    ).padStart(2, '0')}`;

    const allLogs = await db
      .select({
        deliveryStatus: notificationLogs.deliveryStatus,
        sentAt: notificationLogs.sentAt,
      })
      .from(notificationLogs);

    const waSentThisMonth = allLogs.filter((l) => {
      const wibDate = new Date(l.sentAt).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Jakarta',
      });
      return wibDate.startsWith(currentMonthPrefix) && l.deliveryStatus === 'Terkirim';
    }).length;

    return res.json({
      success: true,
      data: {
        timezone: 'Asia/Jakarta',
        summary: {
          total_nakes: totalWorkers,
          status_aman_gt_180: aman,
          status_peringatan_31_180: peringatan,
          status_kritis_1_30: kritis,
          status_kadaluarsa_lte_0: kadaluarsa,
          wa_terkirim_bulan_ini: waSentThisMonth,
          tingkat_kepatuhan_persen: complianceRatePct,
        },
        by_profession: Array.from(professionMap.values()),
        wave_projection_6_months: monthlyProjection,
      },
    });
  } catch (error) {
    console.error('Error generating analytics summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal menghitung ringkasan analytics kepatuhan SIP.',
    });
  }
}

export async function getAuditLogsController(req: AuthRequest, res: Response) {
  try {
    const actionFilter = typeof req.query.action === 'string' ? req.query.action.toUpperCase() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    const rows = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        operatorName: users.name,
        operatorRole: roles.roleName,
        action: auditLogs.action,
        tableName: auditLogs.tableName,
        recordId: auditLogs.recordId,
        description: auditLogs.description,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .leftJoin(roles, eq(users.roleId, roles.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(300);

    const filtered = rows.filter((r) => {
      if (actionFilter && actionFilter !== 'SEMUA' && r.action !== actionFilter) {
        return false;
      }
      if (search) {
        const hit =
          (r.operatorName || '').toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search) ||
          r.tableName.toLowerCase().includes(search);
        if (!hit) return false;
      }
      return true;
    });

    return res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil catatan Audit Logs.',
    });
  }
}
