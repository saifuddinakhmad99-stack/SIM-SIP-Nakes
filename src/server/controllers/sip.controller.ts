import fs from 'fs';
import path from 'path';
import { type Response } from 'express';
import { asc, eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import {
  healthWorkers,
  professions,
  sipDocuments,
  units,
} from '../../db/schema.ts';
import { serverConfig } from '../config/env.ts';
import { type AuthRequest } from '../middlewares/auth.middleware.ts';
import { recordDbAudit } from '../services/audit.service.ts';
import {
  calculateDaysRemainingWib,
  normalizeWhatsappNumber,
} from '../utils/sanitize.ts';

function computeComplianceStatus(daysRemaining: number): 'aman' | 'peringatan' | 'kritis' | 'kadaluarsa' {
  if (daysRemaining <= 0) return 'kadaluarsa';
  if (daysRemaining <= 30) return 'kritis';
  if (daysRemaining <= 180) return 'peringatan';
  return 'aman';
}

export async function listSipDocumentsController(req: AuthRequest, res: Response) {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const professionIdFilter = req.query.profession_id ? Number(req.query.profession_id) : null;
    const unitIdFilter = req.query.unit_id ? Number(req.query.unit_id) : null;
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.toLowerCase() : '';

    const rows = await db
      .select({
        id: sipDocuments.id,
        workerId: healthWorkers.id,
        nipNik: healthWorkers.nipNik,
        fullName: healthWorkers.fullName,
        professionId: professions.id,
        professionName: professions.professionName,
        unitId: units.id,
        unitCode: units.unitCode,
        unitName: units.unitName,
        unitCategory: units.category,
        whatsappNumber: healthWorkers.whatsappNumber,
        strNumber: sipDocuments.strNumber,
        sipNumber: sipDocuments.sipNumber,
        issuedDate: sipDocuments.issuedDate,
        expiryDate: sipDocuments.expiryDate,
        scanFilePath: sipDocuments.scanFilePath,
        renewalStatus: sipDocuments.renewalStatus,
        notes: sipDocuments.notes,
        updatedAt: sipDocuments.updatedAt,
      })
      .from(sipDocuments)
      .innerJoin(healthWorkers, eq(sipDocuments.workerId, healthWorkers.id))
      .innerJoin(professions, eq(healthWorkers.professionId, professions.id))
      .innerJoin(units, eq(healthWorkers.unitId, units.id))
      .orderBy(asc(sipDocuments.expiryDate));

    const enriched = rows
      .map((r) => {
        const daysRemaining = calculateDaysRemainingWib(r.expiryDate);
        const complianceStatus = computeComplianceStatus(daysRemaining);
        return {
          ...r,
          daysRemaining,
          complianceStatus,
        };
      })
      .filter((item) => {
        if (professionIdFilter && item.professionId !== professionIdFilter) return false;
        if (unitIdFilter && item.unitId !== unitIdFilter) return false;
        if (statusFilter && statusFilter !== 'semua' && item.complianceStatus !== statusFilter) {
          return false;
        }
        if (search) {
          const hit =
            item.fullName.toLowerCase().includes(search) ||
            item.sipNumber.toLowerCase().includes(search) ||
            item.nipNik.toLowerCase().includes(search) ||
            item.unitName.toLowerCase().includes(search);
          if (!hit) return false;
        }
        return true;
      });

    return res.json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    console.error('Error listing SIP documents:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil daftar dokumen SIP dari basis data.',
    });
  }
}

export async function createSipDocumentController(req: AuthRequest, res: Response) {
  try {
    const {
      nip_nik,
      full_name,
      profession_id,
      unit_id,
      whatsapp_number,
      str_number,
      sip_number,
      issued_date,
      expiry_date,
      renewal_status,
      notes,
    } = req.body || {};

    if (!nip_nik || !full_name || !profession_id || !unit_id || !whatsapp_number || !sip_number || !issued_date || !expiry_date) {
      return res.status(400).json({
        success: false,
        error: 'Field wajib (nip_nik, full_name, profession_id, unit_id, whatsapp_number, sip_number, issued_date, expiry_date) harus lengkap.',
      });
    }

    if (String(expiry_date) < String(issued_date)) {
      return res.status(400).json({
        success: false,
        error: 'Tanggal kadaluarsa tidak boleh lebih awal dari tanggal terbit.',
      });
    }

    const normalizedPhone = normalizeWhatsappNumber(String(whatsapp_number));

    const created = await db.transaction(async (tx) => {
      const existingWorker = await tx
        .select()
        .from(healthWorkers)
        .where(eq(healthWorkers.nipNik, String(nip_nik)))
        .limit(1);

      let workerId: number;
      if (existingWorker.length > 0) {
        workerId = existingWorker[0].id;
        await tx
          .update(healthWorkers)
          .set({
            fullName: String(full_name),
            professionId: Number(profession_id),
            unitId: Number(unit_id),
            whatsappNumber: normalizedPhone,
            updatedAt: new Date(),
          })
          .where(eq(healthWorkers.id, workerId));
      } else {
        const insertedWorkers = await tx
          .insert(healthWorkers)
          .values({
            nipNik: String(nip_nik),
            fullName: String(full_name),
            professionId: Number(profession_id),
            unitId: Number(unit_id),
            whatsappNumber: normalizedPhone,
            isActive: true,
          })
          .returning();
        workerId = insertedWorkers[0].id;
      }

      const daysRem = calculateDaysRemainingWib(String(expiry_date));
      const computedStatus =
        renewal_status || (daysRem <= 0 ? 'Kadaluarsa' : 'Aktif');

      const insertedSip = await tx
        .insert(sipDocuments)
        .values({
          workerId,
          strNumber: String(str_number || '-'),
          sipNumber: String(sip_number),
          issuedDate: String(issued_date),
          expiryDate: String(expiry_date),
          renewalStatus: computedStatus,
          notes: notes ? String(notes) : null,
        })
        .returning();

      return insertedSip[0];
    });

    await recordDbAudit({
      userId: req.dbUser?.id,
      action: 'CREATE',
      tableName: 'sip_documents',
      recordId: created.id,
      description: `Menambahkan SIP ${created.sipNumber} untuk nakes ${full_name} (berakhir ${created.expiryDate}).`,
    });

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error: unknown) {
    console.error('Error creating SIP document:', error);
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Nomor SIP sudah terdaftar di dalam sistem.',
      });
    }
    if (pgCode === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Referensi profesi_id atau unit_id tidak ditemukan.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Gagal menyimpan data SIP baru.',
    });
  }
}

export async function updateSipDocumentController(req: AuthRequest, res: Response) {
  try {
    const sipId = Number(req.params.id);
    if (!Number.isInteger(sipId) || sipId <= 0) {
      return res.status(400).json({ success: false, error: 'ID SIP tidak valid.' });
    }

    const existing = await db
      .select()
      .from(sipDocuments)
      .where(eq(sipDocuments.id, sipId))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Data SIP tidak ditemukan.' });
    }

    const {
      full_name,
      profession_id,
      unit_id,
      whatsapp_number,
      str_number,
      sip_number,
      issued_date,
      expiry_date,
      renewal_status,
      notes,
    } = req.body || {};

    const nextIssued = issued_date ? String(issued_date) : existing[0].issuedDate;
    const nextExpiry = expiry_date ? String(expiry_date) : existing[0].expiryDate;
    if (nextExpiry < nextIssued) {
      return res.status(400).json({
        success: false,
        error: 'Tanggal kadaluarsa tidak boleh lebih awal dari tanggal terbit.',
      });
    }

    const updated = await db.transaction(async (tx) => {
      if (full_name || profession_id || unit_id || whatsapp_number) {
        const workerPatch: Partial<typeof healthWorkers.$inferInsert> = {
          updatedAt: new Date(),
        };
        if (full_name) workerPatch.fullName = String(full_name);
        if (profession_id) workerPatch.professionId = Number(profession_id);
        if (unit_id) workerPatch.unitId = Number(unit_id);
        if (whatsapp_number) {
          workerPatch.whatsappNumber = normalizeWhatsappNumber(String(whatsapp_number));
        }
        await tx
          .update(healthWorkers)
          .set(workerPatch)
          .where(eq(healthWorkers.id, existing[0].workerId));
      }

      const sipPatch: Partial<typeof sipDocuments.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (str_number !== undefined) sipPatch.strNumber = String(str_number);
      if (sip_number !== undefined) sipPatch.sipNumber = String(sip_number);
      if (issued_date !== undefined) sipPatch.issuedDate = nextIssued;
      if (expiry_date !== undefined) sipPatch.expiryDate = nextExpiry;
      if (renewal_status !== undefined) sipPatch.renewalStatus = String(renewal_status);
      if (notes !== undefined) sipPatch.notes = notes ? String(notes) : null;

      const rows = await tx
        .update(sipDocuments)
        .set(sipPatch)
        .where(eq(sipDocuments.id, sipId))
        .returning();

      return rows[0];
    });

    await recordDbAudit({
      userId: req.dbUser?.id,
      action: 'UPDATE',
      tableName: 'sip_documents',
      recordId: sipId,
      description: `Memperbarui dokumen SIP ${updated.sipNumber} (kadaluarsa ${updated.expiryDate}).`,
    });

    return res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating SIP document:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal memperbarui data SIP.',
    });
  }
}

export async function deleteSipDocumentController(req: AuthRequest, res: Response) {
  try {
    const sipId = Number(req.params.id);
    if (!Number.isInteger(sipId) || sipId <= 0) {
      return res.status(400).json({ success: false, error: 'ID SIP tidak valid.' });
    }

    const deleted = await db
      .delete(sipDocuments)
      .where(eq(sipDocuments.id, sipId))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ success: false, error: 'Dokumen SIP tidak ditemukan.' });
    }

    // Remove stored scan file if present
    if (deleted[0].scanFilePath) {
      const resolvedPath = path.resolve(
        serverConfig.uploadDir,
        path.basename(deleted[0].scanFilePath)
      );
      if (resolvedPath.startsWith(serverConfig.uploadDir) && fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
      }
    }

    await recordDbAudit({
      userId: req.dbUser?.id,
      action: 'DELETE',
      tableName: 'sip_documents',
      recordId: sipId,
      description: `Menghapus dokumen SIP ${deleted[0].sipNumber}.`,
    });

    return res.json({
      success: true,
      message: 'Dokumen SIP berhasil dihapus.',
    });
  } catch (error) {
    console.error('Error deleting SIP document:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal menghapus dokumen SIP.',
    });
  }
}

export async function uploadSipScanController(req: AuthRequest, res: Response) {
  try {
    const sipId = Number(req.params.id);
    if (!Number.isInteger(sipId) || sipId <= 0) {
      return res.status(400).json({ success: false, error: 'ID SIP tidak valid.' });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Berkas scan_file (PDF/JPG/PNG maks 2 MB) wajib disertakan.',
      });
    }

    const existing = await db
      .select()
      .from(sipDocuments)
      .where(eq(sipDocuments.id, sipId))
      .limit(1);

    if (existing.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, error: 'Dokumen SIP tidak ditemukan.' });
    }

    const storedRelativeName = req.file.filename;
    const updated = await db
      .update(sipDocuments)
      .set({
        scanFilePath: storedRelativeName,
        updatedAt: new Date(),
      })
      .where(eq(sipDocuments.id, sipId))
      .returning();

    // Remove previous scan file cleanly
    if (existing[0].scanFilePath && existing[0].scanFilePath !== storedRelativeName) {
      const oldFile = path.resolve(
        serverConfig.uploadDir,
        path.basename(existing[0].scanFilePath)
      );
      if (oldFile.startsWith(serverConfig.uploadDir) && fs.existsSync(oldFile)) {
        fs.unlinkSync(oldFile);
      }
    }

    await recordDbAudit({
      userId: req.dbUser?.id,
      action: 'UPDATE',
      tableName: 'sip_documents',
      recordId: sipId,
      description: `Mengunggah berkas scan SIP (${req.file.originalname}, ${(req.file.size / 1024).toFixed(1)} KB) untuk SIP ${existing[0].sipNumber}.`,
    });

    return res.json({
      success: true,
      data: {
        id: updated[0].id,
        scan_file_path: updated[0].scanFilePath,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('Error uploading SIP scan:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal menyimpan berkas scan SIP.',
    });
  }
}

export async function downloadSipScanController(req: AuthRequest, res: Response) {
  try {
    const sipId = Number(req.params.id);
    if (!Number.isInteger(sipId) || sipId <= 0) {
      return res.status(400).json({ success: false, error: 'ID SIP tidak valid.' });
    }

    const existing = await db
      .select()
      .from(sipDocuments)
      .where(eq(sipDocuments.id, sipId))
      .limit(1);

    if (existing.length === 0 || !existing[0].scanFilePath) {
      return res.status(404).json({
        success: false,
        error: 'Berkas scan SIP tidak ditemukan.',
      });
    }

    const safeFile = path.resolve(
      serverConfig.uploadDir,
      path.basename(existing[0].scanFilePath)
    );
    if (!safeFile.startsWith(serverConfig.uploadDir) || !fs.existsSync(safeFile)) {
      return res.status(404).json({
        success: false,
        error: 'Berkas scan tidak tersedia di penyimpanan.',
      });
    }

    return res.sendFile(safeFile);
  } catch (error) {
    console.error('Error downloading SIP scan:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil berkas scan SIP.',
    });
  }
}

export async function listReferenceMetaController(_req: AuthRequest, res: Response) {
  try {
    const [unitRows, professionRows] = await Promise.all([
      db.select().from(units).orderBy(asc(units.unitName)),
      db.select().from(professions).orderBy(asc(professions.professionName)),
    ]);

    return res.json({
      success: true,
      data: {
        units: unitRows,
        professions: professionRows,
      },
    });
  } catch (error) {
    console.error('Error fetching reference metadata:', error);
    return res.status(500).json({
      success: false,
      error: 'Gagal mengambil data referensi unit dan profesi.',
    });
  }
}
