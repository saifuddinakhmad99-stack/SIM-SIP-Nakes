import { Router } from 'express';
import {
  getCurrentUserController,
  loginController,
} from '../controllers/auth.controller.ts';
import {
  createSipDocumentController,
  deleteSipDocumentController,
  downloadSipScanController,
  listReferenceMetaController,
  listSipDocumentsController,
  updateSipDocumentController,
  uploadSipScanController,
} from '../controllers/sip.controller.ts';
import {
  getNotificationLogsController,
  getWaTemplatesController,
  runCronSimulationController,
  sendManualNotificationController,
  updateWaTemplateController,
} from '../controllers/notification.controller.ts';
import {
  getAnalyticsSummaryController,
  getAuditLogsController,
} from '../controllers/analytics.controller.ts';
import {
  authenticateRequest,
  requireRole,
} from '../middlewares/auth.middleware.ts';
import { loginRateLimiter } from '../middlewares/security.middleware.ts';
import { uploadSipScanMiddleware } from '../middlewares/upload.middleware.ts';

export const v1Router = Router();

// A. Modul Autentikasi & RBAC
v1Router.post('/auth/login', loginRateLimiter, loginController);
v1Router.get('/auth/me', authenticateRequest, getCurrentUserController);

// Referensi Unit & Profesi
v1Router.get('/meta/references', authenticateRequest, listReferenceMetaController);

// B. Modul Manajemen Data SIP & Nakes (CRUD + Upload Scan <= 2 MB)
v1Router.get(
  '/sip-documents',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM', 'Operator SDM', 'Viewer']),
  listSipDocumentsController
);
v1Router.post(
  '/sip-documents',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM', 'Operator SDM']),
  createSipDocumentController
);
v1Router.put(
  '/sip-documents/:id',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM', 'Operator SDM']),
  updateSipDocumentController
);
v1Router.delete(
  '/sip-documents/:id',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM', 'Operator SDM']),
  deleteSipDocumentController
);
v1Router.post(
  '/sip-documents/:id/upload',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM', 'Operator SDM']),
  uploadSipScanMiddleware,
  uploadSipScanController
);
v1Router.get(
  '/sip-documents/:id/scan',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM', 'Operator SDM', 'Viewer']),
  downloadSipScanController
);

// C. Modul Notifikasi WhatsApp & Simulasi Cron Job Harian (08.00 WIB)
v1Router.get(
  '/notifications/logs',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM', 'Operator SDM']),
  getNotificationLogsController
);
v1Router.get(
  '/notifications/templates',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM']),
  getWaTemplatesController
);
v1Router.put(
  '/notifications/templates/:triggerCode',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM']),
  updateWaTemplateController
);
v1Router.post(
  '/notifications/send-manual',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM', 'Operator SDM']),
  sendManualNotificationController
);
v1Router.post(
  '/notifications/run-cron-simulation',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM']),
  runCronSimulationController
);

// D. Modul Analytics & Audit Trail
v1Router.get(
  '/analytics/summary',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM', 'Operator SDM', 'Viewer']),
  getAnalyticsSummaryController
);
v1Router.get(
  '/audit-logs',
  authenticateRequest,
  requireRole(['Admin IT', 'Kasi SDM']),
  getAuditLogsController
);
