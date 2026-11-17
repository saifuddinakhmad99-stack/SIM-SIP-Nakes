import { type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { roles, users } from '../../db/schema.ts';
import { serverConfig } from '../config/env.ts';
import { type AuthRequest } from '../middlewares/auth.middleware.ts';

export async function loginController(req: Request, res: Response) {
  try {
    const { username, password } = req.body || {};

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username dan password wajib diisi.',
      });
    }

    const found = await db
      .select({
        id: users.id,
        uid: users.uid,
        name: users.name,
        nip: users.nip,
        username: users.username,
        email: users.email,
        passwordHash: users.passwordHash,
        roleId: users.roleId,
        status: users.status,
        roleName: roles.roleName,
        permissions: roles.permissions,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.username, username.trim().toLowerCase()))
      .limit(1);

    if (found.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Username atau password tidak sesuai.',
      });
    }

    const user = found[0];
    if (user.status !== 'Aktif') {
      return res.status(403).json({
        success: false,
        error: 'Akun pengguna berstatus nonaktif. Hubungi Admin IT.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Username atau password tidak sesuai.',
      });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        roleName: user.roleName,
      },
      serverConfig.jwtSecret,
      { expiresIn: serverConfig.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    return res.json({
      success: true,
      data: {
        token,
        expires_in: serverConfig.jwtExpiresIn,
        user: {
          id: user.id,
          name: user.name,
          nip: user.nip,
          username: user.username,
          email: user.email,
          role: user.roleName,
          permissions: user.permissions,
        },
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan pada layanan autentikasi.',
    });
  }
}

export async function getCurrentUserController(req: AuthRequest, res: Response) {
  if (!req.dbUser) {
    return res.status(401).json({
      success: false,
      error: 'Sesi pengguna tidak ditemukan.',
    });
  }

  return res.json({
    success: true,
    data: {
      id: req.dbUser.id,
      uid: req.dbUser.uid,
      name: req.dbUser.name,
      nip: req.dbUser.nip,
      username: req.dbUser.username,
      email: req.dbUser.email,
      role: req.dbUser.roleName,
      permissions: req.dbUser.permissions,
      status: req.dbUser.status,
    },
  });
}
