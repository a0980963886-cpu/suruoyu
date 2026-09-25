import bcrypt from 'bcryptjs';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestoreDb } from './firebaseAdmin.ts';

export type UserRole = 'admin' | 'boss' | 'user' | 'guest';

export interface UserDocument {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  tenantId: string;
  tokenVersion: number;
  isSuspended: boolean;
  adminCustomSettings?: {
    customCallName?: string;
    customTonePrompt?: string;
  };
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_TENANT_ID = 'default-org';

// Memory cache with expiration to reduce excessive Firestore read latency while maintaining live sync
const userCache = new Map<string, { user: UserDocument; cachedAt: number }>();
const CACHE_TTL_MS = 2000; // 2 seconds fast eviction for token revocation

export function invalidateUserCache(userId: string) {
  userCache.delete(userId);
}

export async function getUserByEmail(email: string, tenantId = DEFAULT_TENANT_ID): Promise<UserDocument | null> {
  const cleanEmail = email.trim().toLowerCase();
  const db = getFirestoreDb();
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('users')
    .where('email', '==', cleanEmail)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const user = { id: doc.id, ...(doc.data() as Omit<UserDocument, 'id'>) };
  userCache.set(user.id, { user, cachedAt: Date.now() });
  return user;
}

export async function getUserById(userId: string, tenantId = DEFAULT_TENANT_ID): Promise<UserDocument | null> {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.user;
  }

  const db = getFirestoreDb();
  const doc = await db.collection('tenants').doc(tenantId).collection('users').doc(userId).get();

  if (!doc.exists) {
    return null;
  }

  const user = { id: doc.id, ...(doc.data() as Omit<UserDocument, 'id'>) };
  userCache.set(userId, { user, cachedAt: Date.now() });
  return user;
}

export async function createUser(params: {
  email: string;
  passwordPlainText: string;
  displayName: string;
  tenantId?: string;
  adminBootstrapSecret?: string;
}): Promise<UserDocument> {
  const tenantId = params.tenantId || DEFAULT_TENANT_ID;
  const cleanEmail = params.email.trim().toLowerCase();

  // Check if user already exists
  const existing = await getUserByEmail(cleanEmail, tenantId);
  if (existing) {
    throw new Error('該 Email 已被註冊，請直接登入');
  }

  const db = getFirestoreDb();

  // Secure One-time Admin Bootstrap Check:
  // Requirements:
  // 1. Server must have ADMIN_BOOTSTRAP_SECRET configured.
  // 2. Client must supply adminBootstrapSecret matching ADMIN_BOOTSTRAP_SECRET.
  // 3. Email must also match configured INITIAL_ADMIN_EMAIL (if configured).
  // 4. In Firestore, /tenants/{tenantId}/system/bootstrap must NOT have adminClaimed: true.
  // 5. Once successfully claimed, write adminClaimed: true atomically in transaction.
  const configuredBootstrapSecret = (process.env.ADMIN_BOOTSTRAP_SECRET || '').trim();
  const configuredAdminEmail = (process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  let assignedRole: UserRole = 'user';

  if (params.adminBootstrapSecret && configuredBootstrapSecret) {
    if (params.adminBootstrapSecret.trim() !== configuredBootstrapSecret) {
      throw new Error('管理員初始化金鑰 (Bootstrap Secret) 錯誤，拒絕建立管理者帳號。');
    }

    if (configuredAdminEmail && cleanEmail !== configuredAdminEmail) {
      throw new Error('該 Email 與伺服器配置的 INITIAL_ADMIN_EMAIL 不符，無法使用此初始化金鑰。');
    }

    // Atomically verify and consume the one-time bootstrap state in Firestore
    const bootstrapRef = db.collection('tenants').doc(tenantId).collection('system').doc('bootstrap');
    await db.runTransaction(async (transaction) => {
      const bootstrapDoc = await transaction.get(bootstrapRef);
      if (bootstrapDoc.exists && bootstrapDoc.data()?.adminClaimed === true) {
        throw new Error('系統安全防護：第一個管理員帳號已在先前初始化完成，該一次性金鑰已永久失效且無法重複使用。');
      }

      // Check if any admin already exists in database
      const existingAdminQuery = await transaction.get(
        db.collection('tenants').doc(tenantId).collection('users').where('role', '==', 'admin').limit(1)
      );
      if (!existingAdminQuery.empty) {
        throw new Error('系統安全防護：資料庫中已存在管理員，一次性初始化金鑰已自動作廢。');
      }

      // Mark bootstrap as consumed permanently
      transaction.set(bootstrapRef, {
        adminClaimed: true,
        claimedAt: Date.now(),
        claimedByEmail: cleanEmail,
      });
      assignedRole = 'admin';
    });
  }

  // Hash password using salted bcrypt (10 rounds)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(params.passwordPlainText, salt);

  const newUserRef = db.collection('tenants').doc(tenantId).collection('users').doc();
  const now = Date.now();

  const userDoc: UserDocument = {
    id: newUserRef.id,
    email: cleanEmail,
    passwordHash,
    displayName: params.displayName.trim() || cleanEmail.split('@')[0],
    role: assignedRole,
    tenantId,
    tokenVersion: 1,
    isSuspended: false,
    createdAt: now,
    updatedAt: now,
  };

  await newUserRef.set(userDoc);
  userCache.set(userDoc.id, { user: userDoc, cachedAt: Date.now() });
  return userDoc;
}

export async function verifyUserPassword(passwordPlainText: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(passwordPlainText, passwordHash);
}

export async function updateUserRole(params: {
  adminUserId: string;
  targetUserId: string;
  newRole: 'boss' | 'user';
  tenantId?: string;
}): Promise<UserDocument> {
  const tenantId = params.tenantId || DEFAULT_TENANT_ID;

  // Verify that requester is genuinely an active admin
  const adminUser = await getUserById(params.adminUserId, tenantId);
  if (!adminUser || adminUser.role !== 'admin' || adminUser.isSuspended) {
    throw new Error('權限不足：僅有系統管理員可以調整使用者身分');
  }

  if (params.adminUserId === params.targetUserId) {
    throw new Error('無法變更管理員自身的最高身分');
  }

  const targetUser = await getUserById(params.targetUserId, tenantId);
  if (!targetUser) {
    throw new Error('找不到該使用者帳號');
  }

  const db = getFirestoreDb();
  // Increment tokenVersion by 1 to instantly invalidate any existing active tokens of the target user!
  const newTokenVersion = (targetUser.tokenVersion || 1) + 1;

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('users')
    .doc(params.targetUserId)
    .update({
      role: params.newRole,
      tokenVersion: newTokenVersion,
      updatedAt: Date.now(),
    });

  invalidateUserCache(params.targetUserId);
  return (await getUserById(params.targetUserId, tenantId))!;
}

export async function toggleUserSuspension(params: {
  adminUserId: string;
  targetUserId: string;
  suspend: boolean;
  tenantId?: string;
}): Promise<UserDocument> {
  const tenantId = params.tenantId || DEFAULT_TENANT_ID;

  const adminUser = await getUserById(params.adminUserId, tenantId);
  if (!adminUser || adminUser.role !== 'admin' || adminUser.isSuspended) {
    throw new Error('權限不足：僅有系統管理員可以管理帳號啟用狀態');
  }

  if (params.adminUserId === params.targetUserId) {
    throw new Error('無法停用管理員自身帳號');
  }

  const targetUser = await getUserById(params.targetUserId, tenantId);
  if (!targetUser) {
    throw new Error('找不到該使用者帳號');
  }

  const db = getFirestoreDb();
  const newTokenVersion = (targetUser.tokenVersion || 1) + 1;

  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('users')
    .doc(params.targetUserId)
    .update({
      isSuspended: params.suspend,
      tokenVersion: newTokenVersion,
      updatedAt: Date.now(),
    });

  invalidateUserCache(params.targetUserId);
  return (await getUserById(params.targetUserId, tenantId))!;
}

export async function listTenantUsers(adminUserId: string, tenantId = DEFAULT_TENANT_ID): Promise<Array<Omit<UserDocument, 'passwordHash'>>> {
  const adminUser = await getUserById(adminUserId, tenantId);
  if (!adminUser || adminUser.role !== 'admin' || adminUser.isSuspended) {
    throw new Error('權限不足：僅有系統管理員可以檢視全體帳號名單');
  }

  const db = getFirestoreDb();
  const snapshot = await db.collection('tenants').doc(tenantId).collection('users').orderBy('createdAt', 'desc').get();

  return snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const data = doc.data() as UserDocument;
    const { passwordHash, ...safeUser } = data;
    return { ...safeUser, id: doc.id };
  });
}

export async function updateAdminCustomSettings(params: {
  adminUserId: string;
  customCallName?: string;
  customTonePrompt?: string;
  tenantId?: string;
}): Promise<UserDocument> {
  const tenantId = params.tenantId || DEFAULT_TENANT_ID;
  const adminUser = await getUserById(params.adminUserId, tenantId);
  if (!adminUser || adminUser.role !== 'admin' || adminUser.isSuspended) {
    throw new Error('權限不足：僅有系統管理員可以設定專用語氣');
  }

  const db = getFirestoreDb();
  await db
    .collection('tenants')
    .doc(tenantId)
    .collection('users')
    .doc(params.adminUserId)
    .update({
      adminCustomSettings: {
        customCallName: params.customCallName?.trim() || '',
        customTonePrompt: params.customTonePrompt?.trim() || '',
      },
      updatedAt: Date.now(),
    });

  invalidateUserCache(params.adminUserId);
  return (await getUserById(params.adminUserId, tenantId))!;
}
