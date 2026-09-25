import crypto from 'node:crypto';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestoreDb } from './firebaseAdmin.ts';
import { DEFAULT_TENANT_ID } from './userService.ts';

export interface UserAlarm {
  id: string;
  time: string; // HH:mm
  label: string;
  enabled: boolean;
  repeatDays?: number[];
  createdAt: number;
}

export interface UserNote {
  id: string;
  content: string;
  completed: boolean;
  color?: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UserSchedule {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location?: string;
  details?: string;
  description?: string;
  createdAt: number;
}

export interface ImportLocalDataResult {
  success: boolean;
  importedAlarmsCount: number;
  importedNotesCount: number;
  importedSchedulesCount: number;
  skippedAlarmsCount: number;
  skippedNotesCount: number;
  skippedSchedulesCount: number;
  failedAlarms: any[];
  failedNotes: any[];
  failedSchedules: any[];
  hasFailures: boolean;
  alarms: UserAlarm[];
  notes: UserNote[];
  schedules: UserSchedule[];
}

function sanitizeId(id?: string, prefix = 'item'): string {
  if (id && typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    return id;
  }
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function validateTime(time?: string): string {
  if (!time || typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) {
    throw new Error('鬧鐘或行程時間格式錯誤，必須為 HH:mm (00:00 ~ 23:59)');
  }
  return time.trim();
}

function validateOptionalTime(time?: string): string | undefined {
  if (!time || typeof time !== 'string') return undefined;
  const trimmed = time.trim();
  if (!trimmed) return undefined;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    throw new Error('時間格式錯誤，必須為 HH:mm (00:00 ~ 23:59)');
  }
  return trimmed;
}

function validateDate(date?: string): string {
  if (!date || typeof date !== 'string') {
    throw new Error('行程日期格式錯誤，必須為 YYYY-MM-DD');
  }
  const trimmed = date.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new Error('行程日期格式錯誤，必須為 YYYY-MM-DD');
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2100) {
    throw new Error('行程年份超出合理範圍 (1900 ~ 2100)');
  }
  if (month < 1 || month > 12) {
    throw new Error('行程月份無效 (必須介於 01 ~ 12)');
  }

  // Exact calendar days in month (handling leap years)
  // Month is 0-indexed in JS Date constructor (0 for Jan, 1 for Feb, etc.)
  // Passing day 0 of month gives the last day of the previous month:
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    throw new Error(`行程日期無效：${year} 年 ${month} 月僅有 ${daysInMonth} 天，不存在 ${day} 號`);
  }

  return trimmed;
}

// ---------------- ALARMS ----------------
export async function listUserAlarms(userId: string, tenantId = DEFAULT_TENANT_ID): Promise<UserAlarm[]> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const db = getFirestoreDb();
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('users')
    .doc(userId)
    .collection('alarms')
    .orderBy('time', 'asc')
    .get();

  return snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() as Omit<UserAlarm, 'id'>) }));
}

export async function saveUserAlarm(
  userId: string,
  rawAlarm: Partial<UserAlarm> & { [key: string]: any },
  tenantId = DEFAULT_TENANT_ID
): Promise<UserAlarm> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const validTime = validateTime(rawAlarm.time);
  const cleanLabel = (rawAlarm.label && typeof rawAlarm.label === 'string' ? rawAlarm.label.trim() : '生活鬧鐘').slice(0, 100);
  const isEnabled = rawAlarm.enabled !== false;
  const repeatDays = Array.isArray(rawAlarm.repeatDays)
    ? rawAlarm.repeatDays.filter((d) => typeof d === 'number' && d >= 0 && d <= 6).slice(0, 7)
    : [];

  const itemId = sanitizeId(rawAlarm.id, 'alarm');
  const db = getFirestoreDb();
  const docRef = db.collection('tenants').doc(tenantId).collection('users').doc(userId).collection('alarms').doc(itemId);

  const item: UserAlarm = {
    id: itemId,
    time: validTime,
    label: cleanLabel,
    enabled: isEnabled,
    repeatDays,
    createdAt: typeof rawAlarm.createdAt === 'number' ? rawAlarm.createdAt : Date.now(),
  };

  await docRef.set(item);
  return item;
}

export async function toggleUserAlarm(userId: string, alarmId: string, tenantId = DEFAULT_TENANT_ID): Promise<UserAlarm> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const cleanId = sanitizeId(alarmId);
  const db = getFirestoreDb();
  const docRef = db.collection('tenants').doc(tenantId).collection('users').doc(userId).collection('alarms').doc(cleanId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('找不到指定的鬧鐘項目');
  }
  const current = doc.data() as UserAlarm;
  const updated: UserAlarm = {
    ...current,
    id: cleanId,
    enabled: !current.enabled,
  };
  await docRef.set(updated);
  return updated;
}

export async function deleteUserAlarm(userId: string, alarmId: string, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const cleanId = sanitizeId(alarmId);
  const db = getFirestoreDb();
  const docRef = db.collection('tenants').doc(tenantId).collection('users').doc(userId).collection('alarms').doc(cleanId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('找不到指定的鬧鐘項目或已刪除');
  }
  await docRef.delete();
}

// ---------------- NOTES ----------------
export async function listUserNotes(userId: string, tenantId = DEFAULT_TENANT_ID): Promise<UserNote[]> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const db = getFirestoreDb();
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('users')
    .doc(userId)
    .collection('notes')
    .orderBy('updatedAt', 'desc')
    .get();

  return snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() as Omit<UserNote, 'id'>) }));
}

export async function saveUserNote(
  userId: string,
  rawNote: Partial<UserNote> & { [key: string]: any },
  tenantId = DEFAULT_TENANT_ID
): Promise<UserNote> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const content = typeof rawNote.content === 'string' ? rawNote.content.trim() : '';
  if (!content) {
    throw new Error('筆記內容不可為空');
  }
  if (content.length > 5000) {
    throw new Error('筆記內容不可超過 5,000 字');
  }

  const itemId = sanitizeId(rawNote.id, 'note');
  const now = Date.now();
  const db = getFirestoreDb();
  const docRef = db.collection('tenants').doc(tenantId).collection('users').doc(userId).collection('notes').doc(itemId);

  const item: UserNote = {
    id: itemId,
    content,
    completed: Boolean(rawNote.completed),
    color: (typeof rawNote.color === 'string' ? rawNote.color.trim() : '#FEF08A').slice(0, 30),
    pinned: Boolean(rawNote.pinned),
    createdAt: typeof rawNote.createdAt === 'number' ? rawNote.createdAt : now,
    updatedAt: now,
  };

  await docRef.set(item);
  return item;
}

export async function toggleUserNote(userId: string, noteId: string, tenantId = DEFAULT_TENANT_ID): Promise<UserNote> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const cleanId = sanitizeId(noteId);
  const db = getFirestoreDb();
  const docRef = db.collection('tenants').doc(tenantId).collection('users').doc(userId).collection('notes').doc(cleanId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('找不到指定的筆記項目');
  }
  const current = doc.data() as UserNote;
  const updated: UserNote = {
    ...current,
    id: cleanId,
    completed: !current.completed,
    updatedAt: Date.now(),
  };
  await docRef.set(updated);
  return updated;
}

export async function deleteUserNote(userId: string, noteId: string, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const cleanId = sanitizeId(noteId);
  const db = getFirestoreDb();
  const docRef = db.collection('tenants').doc(tenantId).collection('users').doc(userId).collection('notes').doc(cleanId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('找不到指定的筆記項目或已刪除');
  }
  await docRef.delete();
}

// ---------------- SCHEDULES ----------------
export async function listUserSchedules(userId: string, tenantId = DEFAULT_TENANT_ID): Promise<UserSchedule[]> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const db = getFirestoreDb();
  const snapshot = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('users')
    .doc(userId)
    .collection('schedules')
    .orderBy('date', 'asc')
    .get();

  return snapshot.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() as Omit<UserSchedule, 'id'>) }));
}

export async function saveUserSchedule(
  userId: string,
  rawSched: Partial<UserSchedule> & { [key: string]: any },
  tenantId = DEFAULT_TENANT_ID
): Promise<UserSchedule> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const title = typeof rawSched.title === 'string' ? rawSched.title.trim() : '';
  if (!title) {
    throw new Error('行程標題不可為空');
  }
  if (title.length > 200) {
    throw new Error('行程標題不可超過 200 字');
  }

  const validDate = validateDate(rawSched.date);
  const validTime = validateOptionalTime(rawSched.time);
  const location = (typeof rawSched.location === 'string' ? rawSched.location.trim() : '').slice(0, 200);
  const details = (typeof (rawSched.details || rawSched.description) === 'string' ? (rawSched.details || rawSched.description)!.trim() : '').slice(0, 2000);

  const itemId = sanitizeId(rawSched.id, 'sched');
  const db = getFirestoreDb();
  const docRef = db.collection('tenants').doc(tenantId).collection('users').doc(userId).collection('schedules').doc(itemId);

  const item: UserSchedule = {
    id: itemId,
    title,
    date: validDate,
    time: validTime,
    location,
    details,
    description: details,
    createdAt: typeof rawSched.createdAt === 'number' ? rawSched.createdAt : Date.now(),
  };

  await docRef.set(item);
  return item;
}

export async function deleteUserSchedule(userId: string, scheduleId: string, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');
  const cleanId = sanitizeId(scheduleId);
  const db = getFirestoreDb();
  const docRef = db.collection('tenants').doc(tenantId).collection('users').doc(userId).collection('schedules').doc(cleanId);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('找不到指定的行程項目或已刪除');
  }
  await docRef.delete();
}

// ---------------- ONE-TIME LOCAL MIGRATION DEDUPLICATION ----------------
export async function importLocalData(
  userId: string,
  tenantId = DEFAULT_TENANT_ID,
  data: {
    alarms?: any[];
    notes?: any[];
    schedules?: any[];
  }
): Promise<ImportLocalDataResult> {
  if (!userId) throw new Error('未提供有效的使用者身分 (userId)');

  // 1. Fetch current live cloud data as authoritative ground truth
  const existingAlarms = await listUserAlarms(userId, tenantId);
  const existingNotes = await listUserNotes(userId, tenantId);
  const existingSchedules = await listUserSchedules(userId, tenantId);

  let importedAlarmsCount = 0;
  let skippedAlarmsCount = 0;
  let importedNotesCount = 0;
  let skippedNotesCount = 0;
  let importedSchedulesCount = 0;
  let skippedSchedulesCount = 0;

  const failedAlarms: any[] = [];
  const failedNotes: any[] = [];
  const failedSchedules: any[] = [];

  // Process Alarms Deduplication & Migration
  if (Array.isArray(data.alarms)) {
    for (const raw of data.alarms) {
      if (!raw || typeof raw !== 'object') continue;
      let time = '';
      let label = '生活鬧鐘';
      try {
        time = validateTime(raw.time);
        label = (typeof raw.label === 'string' ? raw.label.trim() : '生活鬧鐘').slice(0, 100);
      } catch (validationErr) {
        // Invalid data format is marked as failed to import so user does not lose record silently
        failedAlarms.push({ ...raw, failureReason: (validationErr as Error).message });
        continue;
      }

      // Deduplication: check if an alarm with exact same time and label already exists
      const isDuplicate = existingAlarms.some(
        (a) => a.time === time && (a.label || '生活鬧鐘').trim() === label
      );
      if (isDuplicate) {
        skippedAlarmsCount++;
        continue;
      }

      try {
        const saved = await saveUserAlarm(
          userId,
          {
            time,
            label,
            enabled: raw.enabled !== false,
            repeatDays: raw.repeatDays,
            createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
          },
          tenantId
        );
        existingAlarms.push(saved);
        importedAlarmsCount++;
      } catch (err: any) {
        failedAlarms.push({ ...raw, failureReason: err.message || '資料庫寫入失敗' });
      }
    }
  }

  // Process Notes Deduplication & Migration
  if (Array.isArray(data.notes)) {
    for (const raw of data.notes) {
      if (!raw || typeof raw !== 'object') continue;
      const content = typeof raw.content === 'string' ? raw.content.trim() : '';
      if (!content) {
        skippedNotesCount++;
        continue;
      }

      if (content.length > 5000) {
        failedNotes.push({ ...raw, failureReason: '筆記內容超過 5000 字元長度限制' });
        continue;
      }

      // Deduplication: check if a note with exact same content already exists
      const isDuplicate = existingNotes.some((n) => n.content.trim() === content);
      if (isDuplicate) {
        skippedNotesCount++;
        continue;
      }

      try {
        const saved = await saveUserNote(
          userId,
          {
            content,
            completed: Boolean(raw.completed),
            color: raw.color,
            pinned: Boolean(raw.pinned),
            createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
          },
          tenantId
        );
        existingNotes.push(saved);
        importedNotesCount++;
      } catch (err: any) {
        failedNotes.push({ ...raw, failureReason: err.message || '資料庫寫入失敗' });
      }
    }
  }

  // Process Schedules Deduplication & Migration
  if (Array.isArray(data.schedules)) {
    for (const raw of data.schedules) {
      if (!raw || typeof raw !== 'object') continue;
      const title = typeof raw.title === 'string' ? raw.title.trim() : '';
      if (!title) {
        skippedSchedulesCount++;
        continue;
      }

      let date = '';
      let time: string | undefined = undefined;
      try {
        date = validateDate(raw.date);
        time = validateOptionalTime(raw.time);
      } catch (validationErr) {
        failedSchedules.push({ ...raw, failureReason: (validationErr as Error).message });
        continue;
      }

      // Deduplication: check if a schedule with exact same title, date, and time already exists
      const isDuplicate = existingSchedules.some(
        (s) => s.title.trim() === title && s.date === date && (s.time || '') === (time || '')
      );
      if (isDuplicate) {
        skippedSchedulesCount++;
        continue;
      }

      try {
        const saved = await saveUserSchedule(
          userId,
          {
            title,
            date,
            time,
            location: raw.location,
            details: raw.details || raw.description,
            createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
          },
          tenantId
        );
        existingSchedules.push(saved);
        importedSchedulesCount++;
      } catch (err: any) {
        failedSchedules.push({ ...raw, failureReason: err.message || '資料庫寫入失敗' });
      }
    }
  }

  const hasFailures = failedAlarms.length > 0 || failedNotes.length > 0 || failedSchedules.length > 0;

  return {
    success: !hasFailures,
    importedAlarmsCount,
    importedNotesCount,
    importedSchedulesCount,
    skippedAlarmsCount,
    skippedNotesCount,
    skippedSchedulesCount,
    failedAlarms,
    failedNotes,
    failedSchedules,
    hasFailures,
    alarms: existingAlarms,
    notes: existingNotes,
    schedules: existingSchedules,
  };
}
