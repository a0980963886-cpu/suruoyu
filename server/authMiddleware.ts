import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getUserById, UserRole, DEFAULT_TENANT_ID } from './userService.ts';

// In development or preview environments where AUTH_SECRET_KEY / JWT_SECRET is not explicitly injected in process.env,
// generate an ephemeral high-entropy secret (256-bit) per container lifecycle so the dev server runs smoothly.
// In strict production mode (NODE_ENV === 'production'), strictly enforce FAIL-CLOSED if both keys are missing.
let devFallbackSecret: string | null = null;

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tokenVersion: number;
  isGuest?: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  displayName: string;
  tenantId: string;
  isGuest: boolean;
  tokenVersion: number;
  adminCustomSettings?: {
    customCallName?: string;
    customTonePrompt?: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      token?: string;
    }
  }
}

export function getJwtSecret(): string {
  const secret = process.env.AUTH_SECRET_KEY || process.env.JWT_SECRET;
  if (!secret) {
    // In production, strictly enforce FAIL-CLOSED
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FAIL-CLOSED 安全中斷：伺服器未設定 AUTH_SECRET_KEY 或 JWT_SECRET，禁止簽發與驗證 Token。');
    }
    // In non-production / development / test, lazily generate a container-scoped random 256-bit secret if not set
    if (!devFallbackSecret) {
      devFallbackSecret = crypto.randomBytes(32).toString('hex');
      console.warn('⚠️ [安全提示] 偵測到未設定 AUTH_SECRET_KEY 或 JWT_SECRET，開發環境已自動啟用單次執行個體高熵隨機金鑰。');
    }
    return devFallbackSecret;
  }
  return secret;
}

export function signUserToken(payload: TokenPayload, expiresIn: string = '7d'): string {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, {
    issuer: 'su-ruoyu-ai-studio',
    audience: payload.tenantId || DEFAULT_TENANT_ID,
    expiresIn,
  } as jwt.SignOptions);
}

// Core Authentication Middleware with dynamic token revocation check
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '請先登入系統' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: '無效的身分憑證' });
  }

  let secret: string;
  try {
    secret = getJwtSecret();
  } catch (err: any) {
    return res.status(500).json({ error: err.message || '伺服器金鑰未配置' });
  }

  try {
    // Verify signature, issuer, and unwrap token
    const decoded = jwt.verify(token, secret, {
      issuer: 'su-ruoyu-ai-studio',
    }) as TokenPayload;

    // Audience verification: verify tenant audience
    const tokenTenant = decoded.tenantId || DEFAULT_TENANT_ID;
    const reqTenant = (req.headers['x-tenant-id'] as string) || DEFAULT_TENANT_ID;
    if (tokenTenant !== reqTenant) {
      return res.status(401).json({ error: '登入憑證之租戶受眾 (Audience) 不符，禁止跨租戶存取' });
    }

    // Handle Guest tokens
    if (decoded.isGuest) {
      req.user = {
        userId: 'guest-session',
        email: 'guest@experience.local',
        role: 'guest',
        displayName: '訪客體驗者',
        tenantId: tokenTenant,
        isGuest: true,
        tokenVersion: 1,
      };
      req.token = token;
      return next();
    }

    // Authenticated formal user: ALWAYS verify against database for live status and revocation!
    const userDoc = await getUserById(decoded.userId, tokenTenant);
    if (!userDoc) {
      return res.status(401).json({ error: '使用者帳號不存在或已註銷' });
    }

    // 1. Suspension verification: immediately respond with 401 so clients deauth
    if (userDoc.isSuspended) {
      return res.status(401).json({ error: '此帳號已被管理員停用，登入憑證已失效' });
    }

    // 2. Token Version verification for immediate revocation (role changed, password reset, or logged out)
    if (userDoc.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: '登入憑證已失效（帳號權限已變更或已在其他裝置登出），請重新登入' });
    }

    // 3. Attach authoritative role and details directly from database, preventing stale token spoofing
    req.user = {
      userId: userDoc.id,
      email: userDoc.email,
      role: userDoc.role, // Authoritative live role from DB
      displayName: userDoc.displayName,
      tenantId: userDoc.tenantId,
      isGuest: false,
      tokenVersion: userDoc.tokenVersion,
      adminCustomSettings: userDoc.adminCustomSettings,
    };
    req.token = token;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登入已過期，請重新登入' });
    }
    return res.status(401).json({ error: '登入憑證簽章驗證失敗' });
  }
}

// Role Authorization Middleware
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: '請先登入系統' });
    }

    if (user.isGuest && !allowedRoles.includes('guest')) {
      return res.status(403).json({ error: '訪客無權存取此功能，請先註冊或登入正式帳號' });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: '權限不足，無法執行此操作' });
    }

    next();
  };
}

// Strict Guest Deny Middleware
export function denyGuest(req: Request, res: Response, next: NextFunction) {
  if (req.user?.isGuest || req.user?.role === 'guest') {
    return res.status(403).json({ error: '訪客模式不支援此持久化操作，請先註冊正式帳號' });
  }
  next();
}
