import path from 'path';

// Enforce WIB (Asia/Jakarta) globally across Node.js runtime
process.env.TZ = 'Asia/Jakarta';

export type WaGatewayProvider = 'FONNTE' | 'WABLAS' | 'META_CLOUD' | 'SIMULATION';

export const serverConfig = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  timezone: 'Asia/Jakarta',
  jwtSecret:
    process.env.JWT_SECRET || 'sim-sip-rsud-sidoarjo-barat-dev-jwt-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigins: (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  uploadDir: path.resolve(process.cwd(), 'storage', 'sip-scans'),
  maxUploadSizeBytes: 2 * 1024 * 1024, // 2 MB
  waGateway: {
    provider: (process.env.WA_GATEWAY_PROVIDER || 'SIMULATION').toUpperCase() as WaGatewayProvider,
    url: process.env.WA_GATEWAY_URL || '',
    token: process.env.WA_GATEWAY_TOKEN || '',
    phoneNumberId: process.env.WA_META_PHONE_NUMBER_ID || '',
    delayMs: Number(process.env.WA_BATCH_DELAY_MS) || 2500,
  },
};
