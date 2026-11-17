import { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../../db/index.ts';
import { roles, users } from '../../db/schema.ts';
import { adminAuth } from '../../lib/firebase-admin.ts';
import { serverConfig } from '../config/env.ts';

export type DbRoleName = 'Admin IT' | 'Kasi SDM' | 'Operator SDM' | 'Viewer';

export interface AuthenticatedDbUser {
  id: number;
  uid: string | null;
  name: string;
  nip: string;
  username: string;
  email: string | null;
  roleId: number;
  roleName: DbRoleName;
  permissions: Record<string, boolean>;
  status: string;
}

export interface AuthRequest extends Request {
  dbUser?: AuthenticatedDbUser;
}

interface JwtPayload {
  sub: number;
  username: string;
  roleName: DbRoleName;
}

export async function getOrSyncFirebaseUser(
  uid: string,
  email: string | undefined,
  displayName: string | undefined
): Promise<AuthenticatedDbUser> {
  try {
    const existingByUid = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        nip: users.nip,
        username: users.username,
        email: users.email,
        roleId: users.roleId,
        status: users.status,
        roleName: roles.roleName,
        permissions: roles.permissions,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.uid, uid))
      .limit(1);

    if (existingByUid.length > 0) {
      const row = existingByUid[0];
      return {
        ...row,
        roleName: row.roleName as DbRoleName,
      };
    }

    // Check if an existing seeded user matches by email and link Firebase UID
    const safeEmail = email || `${uid}@firebase.local`;
    if (email) {
      const byEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (byEmail.length > 0) {
        await db
          .update(users)
          .set({ uid, updatedAt: new Date() })
          .where(eq(users.id, byEmail[0].id));

        const linked = await db
          .select({
            id: users.id,
            uid: users.uid,
            name: users.name,
            nip: users.nip,
            username: users.username,
            email: users.email,
            roleId: users.roleId,
            status: users.status,
            roleName: roles.roleName,
            permissions: roles.permissions,
          })
          .from(users)
          .innerJoin(roles, eq(users.roleId, roles.id))
          .where(eq(users.id, byEmail[0].id))
          .limit(1);

        if (linked.length > 0) {
          return {
            ...linked[0],
            roleName: linked[0].roleName as DbRoleName,
          };
        }
      }
    }

    // Ensure default Viewer role exists for newly signed-in Google accounts
    let viewerRole = await db
      .select()
      .from(roles)
      .where(eq(roles.roleName, 'Viewer'))
      .limit(1);

    if (viewerRole.length === 0) {
      viewerRole = await db
        .insert(roles)
        .values({
          roleName: 'Viewer',
          permissions: {
            canViewDashboard: true,
            canViewDataSip: true,
            canViewAnalytics: true,
            canCreateEditDeleteSip: false,
            canSendWaManual: false,
            canViewWaLogs: false,
            canRunCronJob: false,
            canExportReports: false,
            canViewAuditLogs: false,
            canManageUsers: false,
            canManageSettings: false,
          },
        })
        .onConflictDoNothing()
        .returning();
      if (viewerRole.length === 0) {
        viewerRole = await db
          .select()
          .from(roles)
          .where(eq(roles.roleName, 'Viewer'))
          .limit(1);
      }
    }

    const fallbackPasswordHash = await bcrypt.hash(`firebase-${uid}`, 10);
    const baseUsername = safeEmail.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '');

    await db
      .insert(users)
      .values({
        uid,
        name: displayName || baseUsername || 'Pengguna Google',
        nip: '-',
        username: `${baseUsername}.${uid.slice(0, 5)}`.toLowerCase(),
        email: safeEmail,
        passwordHash: fallbackPasswordHash,
        roleId: viewerRole[0].id,
        status: 'Aktif',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: safeEmail,
          updatedAt: new Date(),
        },
      });

    const synced = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        nip: users.nip,
        username: users.username,
        email: users.email,
        roleId: users.roleId,
        status: users.status,
        roleName: roles.roleName,
        permissions: roles.permissions,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.uid, uid))
      .limit(1);

    return {
      ...synced[0],
      roleName: synced[0].roleName as DbRoleName,
    };
  } catch (error) {
    console.error('Failed to synchronize Firebase user with PostgreSQL:', error);
    throw new Error('Gagal memverifikasi sesi pengguna.', { cause: error });
  }
}

export async function authenticateRequest(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Token autentikasi Bearer diperlukan.',
    });
  }

  const token = authHeader.slice(7).trim();

  // 1. Attempt internal JWT verification (issued by POST /api/v1/auth/login)
  try {
    const decoded = jwt.verify(token, serverConfig.jwtSecret) as unknown as JwtPayload;
    const rows = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        nip: users.nip,
        username: users.username,
        email: users.email,
        roleId: users.roleId,
        status: users.status,
        roleName: roles.roleName,
        permissions: roles.permissions,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, decoded.sub))
      .limit(1);

    if (rows.length === 0 || rows[0].status !== 'Aktif') {
      return res.status(401).json({
        success: false,
        error: 'Akun pengguna tidak ditemukan atau sudah dinonaktifkan.',
      });
    }

    req.dbUser = {
      ...rows[0],
      roleName: rows[0].roleName as DbRoleName,
    };
    return next();
  } catch {
    // Not a local JWT; fall through to Firebase ID Token verification
  }

  // 2. Attempt Firebase Auth ID Token verification
  try {
    const decodedFirebase = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrSyncFirebaseUser(
      decodedFirebase.uid,
      decodedFirebase.email,
      decodedFirebase.name
    );

    if (dbUser.status !== 'Aktif') {
      return res.status(403).json({
        success: false,
        error: 'Akun pengguna dalam status nonaktif.',
      });
    }

    req.dbUser = dbUser;
    return next();
  } catch (error) {
    console.error('Authentication verification failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Token tidak valid atau sudah kedaluwarsa.',
    });
  }
}

export function requireRole(allowedRoles: DbRoleName[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Pengguna belum terautentikasi.',
      });
    }
    if (!allowedRoles.includes(req.dbUser.roleName)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Hak akses ${req.dbUser.roleName} tidak diizinkan melakukan tindakan ini.`,
      });
    }
    return next();
  };
}

export function requirePermission(permissionKey: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Pengguna belum terautentikasi.',
      });
    }
    if (!req.dbUser.permissions?.[permissionKey]) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Peran ${req.dbUser.roleName} tidak memiliki izin ${permissionKey}.`,
      });
    }
    return next();
  };
}
