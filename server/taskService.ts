import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestoreDb } from './firebaseAdmin.ts';
import { UserRole, DEFAULT_TENANT_ID } from './userService.ts';

export interface TaskItem {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorRole: UserRole;
  assigneeId: string; // specific userId or 'ALL'
  assigneeName?: string;
  taskTitle: string;
  summary: string;
  rawInstruction?: string;
  deadline?: string;
  priority: 'urgent' | 'normal' | 'low';
  createdAt: number;
  status: 'pending' | 'delivered' | 'completed';
  deliveredAt?: number;
  completedAt?: number;
  tenantId: string;
}

export async function createTask(params: {
  creatorId: string;
  creatorName: string;
  creatorRole: UserRole;
  assigneeId: string;
  assigneeName?: string;
  taskTitle: string;
  summary: string;
  rawInstruction?: string;
  deadline?: string;
  priority?: 'urgent' | 'normal' | 'low';
  tenantId?: string;
}): Promise<TaskItem> {
  const tenantId = params.tenantId || DEFAULT_TENANT_ID;

  // RBAC Broadcast Validation: ONLY admin and boss can broadcast to 'ALL'
  if (params.assigneeId === 'ALL' && params.creatorRole !== 'boss' && params.creatorRole !== 'admin') {
    throw new Error('權限不足：普通使用者僅能指定個別對象交辦任務，無法進行全體廣播');
  }

  // Prevent guest from creating tasks
  if (params.creatorRole === 'guest') {
    throw new Error('訪客無法建立正式任務');
  }

  const db = getFirestoreDb();
  const taskRef = db.collection('tenants').doc(tenantId).collection('tasks').doc();

  const now = Date.now();
  const task: TaskItem = {
    id: taskRef.id,
    creatorId: params.creatorId,
    creatorName: params.creatorName,
    creatorRole: params.creatorRole,
    assigneeId: params.assigneeId,
    assigneeName: params.assigneeName || (params.assigneeId === 'ALL' ? '全體同仁' : '指定同仁'),
    taskTitle: params.taskTitle.trim() || '交辦任務',
    summary: params.summary.trim(),
    rawInstruction: params.rawInstruction || '',
    deadline: params.deadline || '',
    priority: params.priority || 'normal',
    createdAt: now,
    status: 'pending',
    tenantId,
  };

  await taskRef.set(task);
  return task;
}

export async function listVisibleTasks(params: {
  userId: string;
  userRole: UserRole;
  tenantId?: string;
}): Promise<TaskItem[]> {
  const tenantId = params.tenantId || DEFAULT_TENANT_ID;

  if (params.userRole === 'guest') {
    return []; // Guests never see formal tasks
  }

  const db = getFirestoreDb();
  const tasksRef = db.collection('tenants').doc(tenantId).collection('tasks');

  // Admin sees all tenant tasks for oversight
  if (params.userRole === 'admin') {
    const snapshot = await tasksRef.orderBy('createdAt', 'desc').limit(100).get();
    return snapshot.docs.map((d: QueryDocumentSnapshot) => d.data() as TaskItem);
  }

  // Boss sees:
  // 1. Tasks created by this boss
  // 2. Tasks assigned to this boss or 'ALL'
  // User sees:
  // 1. Tasks created by this user
  // 2. Tasks assigned directly to this user or 'ALL'
  // In Firestore, we query tasks created by user and tasks assigned to user/ALL
  const [createdSnap, assignedDirectSnap, assignedAllSnap] = await Promise.all([
    tasksRef.where('creatorId', '==', params.userId).get(),
    tasksRef.where('assigneeId', '==', params.userId).get(),
    tasksRef.where('assigneeId', '==', 'ALL').get(),
  ]);

  const taskMap = new Map<string, TaskItem>();
  for (const doc of createdSnap.docs) {
    taskMap.set(doc.id, doc.data() as TaskItem);
  }
  for (const doc of assignedDirectSnap.docs) {
    taskMap.set(doc.id, doc.data() as TaskItem);
  }
  for (const doc of assignedAllSnap.docs) {
    taskMap.set(doc.id, doc.data() as TaskItem);
  }

  const allVisible = Array.from(taskMap.values());
  allVisible.sort((a, b) => b.createdAt - a.createdAt);
  return allVisible;
}

export async function deliverTask(taskId: string, userId: string, tenantId = DEFAULT_TENANT_ID): Promise<TaskItem> {
  const db = getFirestoreDb();
  const taskRef = db.collection('tenants').doc(tenantId).collection('tasks').doc(taskId);
  const doc = await taskRef.get();

  if (!doc.exists) {
    throw new Error('找不到該任務');
  }

  const task = doc.data() as TaskItem;

  // Authorization: Only the assignee (or anyone if assigned to ALL) can mark as delivered
  if (task.assigneeId !== 'ALL' && task.assigneeId !== userId) {
    throw new Error('權限不足：非該任務之被指派人');
  }

  if (task.status === 'pending') {
    await taskRef.update({
      status: 'delivered',
      deliveredAt: Date.now(),
    });
    task.status = 'delivered';
    task.deliveredAt = Date.now();
  }

  return task;
}

export async function completeTask(taskId: string, userId: string, tenantId = DEFAULT_TENANT_ID): Promise<TaskItem> {
  const db = getFirestoreDb();
  const taskRef = db.collection('tenants').doc(tenantId).collection('tasks').doc(taskId);
  const doc = await taskRef.get();

  if (!doc.exists) {
    throw new Error('找不到該任務');
  }

  const task = doc.data() as TaskItem;

  // Authorization: Only the assignee (or anyone if assigned to ALL) or the creator can mark as completed
  if (task.assigneeId !== 'ALL' && task.assigneeId !== userId && task.creatorId !== userId) {
    throw new Error('權限不足：僅有該任務之執行人或交辦人可以回報完成');
  }

  const now = Date.now();
  await taskRef.update({
    status: 'completed',
    completedAt: now,
  });

  task.status = 'completed';
  task.completedAt = now;
  return task;
}

export async function deleteTask(taskId: string, requesterUserId: string, requesterRole: UserRole, tenantId = DEFAULT_TENANT_ID): Promise<void> {
  const db = getFirestoreDb();
  const taskRef = db.collection('tenants').doc(tenantId).collection('tasks').doc(taskId);
  const doc = await taskRef.get();

  if (!doc.exists) {
    return;
  }

  const task = doc.data() as TaskItem;

  // Authorization: Only creator or admin can delete a task
  if (task.creatorId !== requesterUserId && requesterRole !== 'admin') {
    throw new Error('權限不足：僅有交辦建立者或系統管理員可以刪除此任務');
  }

  await taskRef.delete();
}
