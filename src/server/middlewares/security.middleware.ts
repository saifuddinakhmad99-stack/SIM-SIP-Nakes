import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { type NextFunction, type Request, type Response } from 'express';
import { serverConfig } from '../config/env.ts';
import { sanitizePlainText } from '../utils/sanitize.ts';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: false,
});

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin || serverConfig.corsOrigins.length === 0) {
      callback(null, true);
      return;
    }
    if (serverConfig.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origin tidak diizinkan oleh kebijakan CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak permintaan API. Silakan coba beberapa saat lagi.',
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Terlalu banyak percobaan login. Akun dibatasi sementara selama 15 menit.',
  },
});

function sanitizeRecursive(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizePlainText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeRecursive(item));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Preserve password fields untouched before Bcrypt comparison/hashing
      if (k === 'password' || k === 'password_hash') {
        out[k] = v;
      } else {
        out[k] = sanitizeRecursive(v);
      }
    }
    return out;
  }
  return value;
}

export function sanitizeBodyMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeRecursive(req.body);
  }
  next();
}
