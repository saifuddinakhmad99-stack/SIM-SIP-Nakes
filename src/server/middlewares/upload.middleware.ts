import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { type NextFunction, type Request, type Response } from 'express';
import { serverConfig } from '../config/env.ts';

// Ensure secure upload directory exists
if (!fs.existsSync(serverConfig.uploadDir)) {
  fs.mkdirSync(serverConfig.uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, serverConfig.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeSipId = String(req.params.id || 'doc').replace(/[^a-zA-Z0-9_-]/g, '');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `sip-${safeSipId}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: serverConfig.maxUploadSizeBytes,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error('Format berkas hanya diizinkan PDF, JPG, atau PNG.'));
      return;
    }
    cb(null, true);
  },
});

export function uploadSipScanMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  upload.single('scan_file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'Ukuran berkas scan SIP melebihi batas maksimal 2 MB.',
        });
      }
      return res.status(400).json({
        success: false,
        error: `Gagal mengunggah berkas: ${err.message}`,
      });
    }
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'Berkas scan SIP tidak valid.',
      });
    }
    return next();
  });
}
