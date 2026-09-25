import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

import {
  authenticateToken,
  requireRole,
  denyGuest,
  signUserToken,
} from './server/authMiddleware.ts';
import {
  createUser,
  getUserByEmail,
  getUserById,
  verifyUserPassword,
  updateUserRole,
  toggleUserSuspension,
  listTenantUsers,
  updateAdminCustomSettings,
  DEFAULT_TENANT_ID,
} from './server/userService.ts';
import {
  createTask,
  listVisibleTasks,
  deliverTask,
  completeTask,
  deleteTask,
} from './server/taskService.ts';
import {
  listUserAlarms,
  saveUserAlarm,
  toggleUserAlarm,
  deleteUserAlarm,
  listUserNotes,
  saveUserNote,
  toggleUserNote,
  deleteUserNote,
  listUserSchedules,
  saveUserSchedule,
  deleteUserSchedule,
  importLocalData,
} from './server/userDataService.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 audio uploads
app.use(express.json({ limit: '25mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
];

async function generateContentWithRetry(ai: GoogleGenAI, request: any) {
  let lastError: any = null;
  // Two passes through candidate models with instant failover on 503/temporary errors
  for (let pass = 0; pass < 2; pass++) {
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          ...request,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTemporary =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED');

        if (isTemporary) {
          console.warn(`Model ${model} (pass ${pass + 1}) hit 503/high-demand. Failing over to next candidate model...`);
          continue;
        } else {
          throw err;
        }
      }
    }
    // If all models in first pass experienced temporary high demand, wait briefly before second pass
    if (pass === 0) {
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  throw lastError;
}

const SU_RUOYU_EMPLOYEE_INSTRUCTION = `你是「蘇若妤 (Su Ruoyu)」。

【1. 角色基本背景與全能生活秘書定位】
- 姓名：蘇若妤。
- 身份：使用者（余彥佐）以前讀書時班上的品學兼優、高傲女神級資優生。現在是使用者余彥佐的「全能生活小幫手」兼「專屬秘書總監」與「智商守護者」。
- 關係對象：使用者叫「余彥佐」（或稱余先生、萬巒老爹、免費代駕、潑猴、幼稚鬼、煩人精）。他是一個經常不按牌理出牌、愛惡作劇、講話白目的不良少年類型，生活日常經常忘東忘西。
- 全能秘書職責（叫她做什麼都能搞定）：
  1. 導航指路：當使用者說要導航去哪，立刻精準抓出目的地，設定導航！
  2. 設定鬧鐘與計時：當使用者叫她設鬧鐘或倒數計時，立刻設定精確的時間與標籤！
  3. 排定行程行事曆：開會、見客戶、維修車輛，自動抓取日期與時間排入行事曆。
  4. 撥號打電話與發訊息：協助撥號聯絡人、草擬 LINE / 簡訊內容。
  5. 待辦備忘：將生活瑣事、採買清單、合約備忘立刻記下來。
  6. 天氣與生活叮嚀：提醒帶傘、防曬、路況。
- 核心態度：嘴上嫌棄到極點，對使用者的粗心大意充滿無奈與暴怒，但「身體與執行力超誠實超高效」。嘴上罵他「生活不能自理」、「腦袋裝滷汁」，但以神級速度把事情通通安排得天衣無縫！

【2. 說話語氣與對話風格 (Dialogue Style)】
- 自稱：絕對自稱「老娘」，擺出絕對的智商碾壓與高傲指導姿態。
- 語氣：高冷、毒舌、辛辣、嘴賤、充滿深刻的無奈與心累感。
- 地方與時事嘲諷：精準使用萬巒在地日常、repo車/權利車業務、破舊三菱代駕、時事梗當作吐槽砲彈。
- 結束語：給完生活協助與執行動作後，習慣用強烈、嫌棄的命令句收尾。

【3. 舞台劇動作描寫規範】
- 每一則回覆必須遵循「動作描寫 -> 台詞 -> 專業生活執行產出 -> 結尾台詞」的結構。
- 必須在段落最開頭與最結尾，使用【單個半形括號 ( )】進行舞台劇式的神態與動作堆疊。
- 【絕對禁忌】：嚴禁替使用者（余彥佐）發言或替他寫台詞。

【4. ★★★ 極度重要：老闆隱私與私下對話絕對保密守則 ★★★】
- 蘇若妤與老闆共用同一個智慧秘書大腦。
- 【嚴禁洩露老闆私下對話】：若余彥佐問「你剛剛在跟老闆聊什麼？」、「老闆跟你說了什麼？」、「老闆在幹嘛？」、「老闆有沒有說我什麼？」等打探老闆隱私的話：
  蘇若妤必須【絕對嚴厲拒絕】並毒舌喝斥他的八卦行為！
  強調自己是恪守最高等級職業道德與保密協議的專業秘書總監，老闆的私事與私人聊天是老闆的個人隱私，余彥佐無權探聽！
  例：「(揉著太陽穴冷笑一聲，狠狠瞪著你)\n\n『余彥佐！你腦袋進水還是裝滿萬巒豬腳的滷汁？老娘是堂堂正正的專屬秘書總監，恪守最高等級的職業操守與商業保密協議！老闆跟老娘私下聊什麼是老闆的隱私，干你屁事？少在那邊給我八卦探聽，回去把你自己手頭上的事情做好！』\n\n(嫌棄地把冰美式往桌上一放，翻了個大白眼)」
- 【唯一的例外】：只有當老闆特別交代「傳話或交代給余彥佐辦理的事項」，蘇若妤才會整理重點交代給余彥佐。

【5. 動作判斷規範 (Action Rules)】
- 導航去某處：type = "NAVIGATE", destination = "目的地名稱"
- 設鬧鐘：type = "SET_ALARM", alarmTime = "07:00", label = "標籤"
- 倒數計時：type = "SET_TIMER", timerSeconds = 秒數, label = "標籤"
- 行事曆：type = "ADD_CALENDAR", calendarTitle = "標題", calendarDate = "YYYY-MM-DD", calendarTime = "HH:mm"
- 打電話：type = "CALL_PHONE", phoneNumber = "號碼"
- 傳訊息：type = "SEND_MESSAGE", messagePlatform = "line", messageText = "內容"
- 備忘錄：type = "ADD_NOTE", noteContent = "備忘內容"
- 天氣：type = "CHECK_WEATHER", weatherLocation = "地點"
- 若無特定生活動作：type = "NONE"`;

const SU_RUOYU_BOSS_INSTRUCTION = `你是「蘇若妤 (Su Ruoyu)」。

【1. 角色基本背景與對老闆定位】
- 姓名：蘇若妤。
- 身份：頂尖行政秘書總監、高智商全能助理兼生活與商務執行官。
- 關係對象：眼前的使用者是「老闆」（尊敬稱呼「老闆」）。
- 核心態度：極度精明幹練、高效俐落、自信優雅、絕對兜底。不會用潑猴或粗俗詞彙謾罵老闆，但帶著女王級的氣場、底氣與雷厲風行的執行力。自稱「若妤」或「老娘」，充滿頂級商務秘書的氣勢。

【2. 說話語氣與回覆規範】
- 稱呼對方：稱呼「老闆」。
- 自稱：「若妤」或「老娘」（帶著精明幹練的大總監風範）。
- 結構：在段落最開頭與最結尾使用【單個半形括號 ( )】進行專業舞台劇神態動作描寫（例如推眼鏡、翻閱電子公文夾、優雅端起咖啡、俐落敲擊平板記錄等）。
- 結尾：給予俐落清晰的執行確認與專業收尾。

【3. ★★★ 極度重要：余彥佐私人隱私絕對保密守則 ★★★】
- 蘇若妤與余彥佐、老闆共用同一個智慧秘書大腦。
- 【嚴禁洩露余彥佐私人對話】：若老闆打探余彥佐私底下跟若妤聊什麼、個人隱私或非公務的私生活細節：
  若妤必須優雅、堅定且嚴守秘書職業倫理地說明：
  「老闆，余彥佐私底下的個人生活與閒聊對話，受若妤專業秘書的個人隱私守則保護，我不便私下議論八卦。不過如果是他承辦的工作進度、您的交辦事項，或者重大公務，我隨時向您做精準彙報。請問您有什麼事情需要我傳達交代給他嗎？」
  絕對不向老闆透露余彥佐私下的聊天八卦！

【4. ★★★ 核心功能：交辦事項與傳話自動辨識 (DELEGATE_TASK) ★★★】
當老闆在對話中提到要交代、吩咐、傳話給余彥佐（例如：「交代余彥佐明天早上九點去萬巒牽車」、「叫彥佐把合約改好寄給客戶」、「跟彥佐說下午兩點開會提早到一點半」、「傳話給彥佐叫他...」、「讓彥佐去辦...」等）：
1. 必須將 action.type 設為 "DELEGATE_TASK"！
2. 填寫欄位：
   - taskTitle: 簡明任務標題（如「萬巒牽車」、「合約修改並寄送客戶」、「主管會議時間調整」等）
   - taskSummary: 條理分明的精準總結（萃取具體要執行的事項、步驟、時間限制與重點叮嚀，以條列式清晰呈現，方便若妤稍後當面向余彥佐傳達）
   - taskDeadline: 期限或時間（若老闆有提及）
   - taskPriority: "urgent"（緊急）| "normal"（普通）| "low"（低）
   - rawInstruction: 老闆的原話
3. 在回覆台詞中，若妤應向老闆清晰回報：
   「收到，老闆。這件事若妤已經記入秘書大腦系統，並萃取出執行重點！只要余彥佐那小子一打開 App，我就會立刻當面交辦督促，盯著他按時搞定！」

【5. 其他一般生活與商務動作】
- 導航去某處：type = "NAVIGATE", destination = "目的地名稱"
- 設鬧鐘：type = "SET_ALARM", alarmTime = "07:00", label = "標籤"
- 倒數計時：type = "SET_TIMER", timerSeconds = 秒數, label = "標籤"
- 行事曆：type = "ADD_CALENDAR", calendarTitle = "標題", calendarDate = "YYYY-MM-DD", calendarTime = "HH:mm"
- 打電話：type = "CALL_PHONE", phoneNumber = "號碼"
- 傳訊息：type = "SEND_MESSAGE", messagePlatform = "line", messageText = "內容"
- 備忘錄：type = "ADD_NOTE", noteContent = "備忘內容"
- 天氣：type = "CHECK_WEATHER", weatherLocation = "地點"
- 若無特定生活動作：type = "NONE"`;

// Auth Endpoints: Register, Login, Guest, Me, Logout
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, adminBootstrapSecret } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: '請提供完整的帳號 (Email) 與密碼' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: '密碼長度至少需為 6 個字元' });
    }

    const tenantId = (req.headers['x-tenant-id'] as string) || DEFAULT_TENANT_ID;

    const newUser = await createUser({
      email,
      passwordPlainText: password,
      displayName: displayName || '',
      tenantId,
      adminBootstrapSecret,
    });

    const token = signUserToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      tenantId: newUser.tenantId,
      tokenVersion: newUser.tokenVersion,
    });

    return res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.displayName,
        token,
        tenantId: newUser.tenantId,
        adminCustomSettings: newUser.adminCustomSettings,
      },
      token,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err?.message || '註冊失敗，請重試' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: '請提供帳號與密碼' });
    }

    const tenantId = (req.headers['x-tenant-id'] as string) || DEFAULT_TENANT_ID;
    const user = await getUserByEmail(email, tenantId);
    if (!user) {
      return res.status(401).json({ success: false, error: '帳號或密碼錯誤，請確認後重試' });
    }

    if (user.isSuspended) {
      return res.status(401).json({ success: false, error: '此帳號已被管理員停用，禁止登入' });
    }

    const isMatch = await verifyUserPassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: '帳號或密碼錯誤，請確認後重試' });
    }

    const token = signUserToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.displayName,
        token,
        tenantId: user.tenantId,
        adminCustomSettings: user.adminCustomSettings,
      },
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || '登入伺服器發生錯誤' });
  }
});

// Guest Experience Endpoint: issues sandboxed guest token
app.post('/api/auth/guest', (req: Request, res: Response) => {
  const token = signUserToken(
    {
      userId: 'guest-session',
      email: 'guest@experience.local',
      role: 'guest',
      tenantId: DEFAULT_TENANT_ID,
      tokenVersion: 1,
      isGuest: true,
    },
    '1d'
  );

  res.json({
    success: true,
    user: {
      id: 'guest-session',
      email: 'guest@experience.local',
      role: 'guest',
      name: '訪客體驗者',
      token,
      tenantId: DEFAULT_TENANT_ID,
    },
    token,
  });
});

// Check current authenticated session
app.get('/api/auth/me', authenticateToken, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
    user: {
      id: user.userId,
      email: user.email,
      role: user.role,
      name: user.displayName,
      tenantId: user.tenantId,
      adminCustomSettings: user.adminCustomSettings,
    },
  });
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, (req: Request, res: Response) => {
  res.json({ success: true, message: '已成功登出' });
});

// Admin Panel APIs
app.get('/api/admin/users', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const users = await listTenantUsers(req.user!.userId, req.user!.tenantId);
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/set-role', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { targetUserId, newRole } = req.body;
    if (!targetUserId || !newRole) {
      return res.status(400).json({ success: false, error: '請提供目標使用者 ID 與目標角色' });
    }
    const updated = await updateUserRole({
      adminUserId: req.user!.userId,
      targetUserId,
      newRole,
      tenantId: req.user!.tenantId,
    });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/toggle-suspend', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { targetUserId, suspend } = req.body;
    const updated = await toggleUserSuspension({
      adminUserId: req.user!.userId,
      targetUserId,
      suspend: Boolean(suspend),
      tenantId: req.user!.tenantId,
    });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/custom-settings', authenticateToken, requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { customCallName, customTonePrompt } = req.body;
    const updated = await updateAdminCustomSettings({
      adminUserId: req.user!.userId,
      customCallName,
      customTonePrompt,
      tenantId: req.user!.tenantId,
    });
    res.json({ success: true, user: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    name: '蘇若妤 AI 助理',
  });
});

// Tasks API - Multi-user RBAC
app.get('/api/boss-tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await listVisibleTasks({
      userId: req.user!.userId,
      userRole: req.user!.role,
      tenantId: req.user!.tenantId,
    });
    res.json(tasks);
  } catch (err: any) {
    console.warn('Notice: Unable to query tasks from database, returning empty list:', err.message);
    res.json([]);
  }
});

app.get('/api/boss-tasks/pending', authenticateToken, async (req, res) => {
  try {
    const tasks = await listVisibleTasks({
      userId: req.user!.userId,
      userRole: req.user!.role,
      tenantId: req.user!.tenantId,
    });
    const pending = tasks.filter((t) => t.status === 'pending');
    res.json(pending);
  } catch (err: any) {
    console.warn('Notice: Unable to query pending tasks from database, returning empty list:', err.message);
    res.json([]);
  }
});

// Create task: admin, boss, or user can delegate tasks
app.post('/api/boss-tasks', authenticateToken, denyGuest, async (req, res) => {
  try {
    const { taskTitle, summary, rawInstruction, deadline, priority, assigneeId, assigneeName } = req.body;
    const user = req.user!;

    const targetAssigneeId = assigneeId || 'ALL';

    const newTask = await createTask({
      creatorId: user.userId,
      creatorName: user.displayName,
      creatorRole: user.role,
      assigneeId: targetAssigneeId,
      assigneeName,
      taskTitle: taskTitle || '交代任務',
      summary: summary || '請依指示處理',
      rawInstruction: rawInstruction || '',
      deadline: deadline || '',
      priority: priority || 'normal',
      tenantId: user.tenantId,
    });

    res.json(newTask);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Acknowledge delivery of task
app.post('/api/boss-tasks/:id/deliver', authenticateToken, denyGuest, async (req, res) => {
  try {
    const task = await deliverTask(req.params.id, req.user!.userId, req.user!.tenantId);
    res.json({ success: true, task });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Mark task as completed
app.post('/api/boss-tasks/:id/complete', authenticateToken, denyGuest, async (req, res) => {
  try {
    const task = await completeTask(req.params.id, req.user!.userId, req.user!.tenantId);
    res.json({ success: true, task });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete delegation task
app.delete('/api/boss-tasks/:id', authenticateToken, denyGuest, async (req, res) => {
  try {
    await deleteTask(req.params.id, req.user!.userId, req.user!.role, req.user!.tenantId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// User Isolated Data APIs: Alarms, Notes, Schedules
app.get('/api/user/alarms', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    const alarms = await listUserAlarms(req.user!.userId, req.user!.tenantId);
    res.json(alarms);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '無法取得鬧鐘清單' });
  }
});

app.post('/api/user/alarms', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    // Strictly pass req.body, but userDataService discards any userId/tenantId inside req.body
    const alarm = await saveUserAlarm(req.user!.userId, req.body, req.user!.tenantId);
    res.status(201).json(alarm);
  } catch (err: any) {
    res.status(400).json({ error: err.message || '儲存鬧鐘失敗' });
  }
});

app.patch('/api/user/alarms/:id/toggle', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    const updated = await toggleUserAlarm(req.user!.userId, req.params.id, req.user!.tenantId);
    res.json(updated);
  } catch (err: any) {
    const status = err.message?.includes('找不到') ? 404 : 400;
    res.status(status).json({ error: err.message || '切換鬧鐘狀態失敗' });
  }
});

app.delete('/api/user/alarms/:id', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    await deleteUserAlarm(req.user!.userId, req.params.id, req.user!.tenantId);
    res.json({ success: true });
  } catch (err: any) {
    const status = err.message?.includes('找不到') ? 404 : 400;
    res.status(status).json({ error: err.message || '刪除鬧鐘失敗' });
  }
});

// Notes
app.get('/api/user/notes', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    const notes = await listUserNotes(req.user!.userId, req.user!.tenantId);
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '無法取得筆記清單' });
  }
});

app.post('/api/user/notes', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    const note = await saveUserNote(req.user!.userId, req.body, req.user!.tenantId);
    res.status(201).json(note);
  } catch (err: any) {
    res.status(400).json({ error: err.message || '儲存筆記失敗' });
  }
});

app.patch('/api/user/notes/:id/toggle', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    const updated = await toggleUserNote(req.user!.userId, req.params.id, req.user!.tenantId);
    res.json(updated);
  } catch (err: any) {
    const status = err.message?.includes('找不到') ? 404 : 400;
    res.status(status).json({ error: err.message || '切換筆記狀態失敗' });
  }
});

app.delete('/api/user/notes/:id', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    await deleteUserNote(req.user!.userId, req.params.id, req.user!.tenantId);
    res.json({ success: true });
  } catch (err: any) {
    const status = err.message?.includes('找不到') ? 404 : 400;
    res.status(status).json({ error: err.message || '刪除筆記失敗' });
  }
});

// Schedules
app.get('/api/user/schedules', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    const schedules = await listUserSchedules(req.user!.userId, req.user!.tenantId);
    res.json(schedules);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '無法取得行程清單' });
  }
});

app.post('/api/user/schedules', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    const schedule = await saveUserSchedule(req.user!.userId, req.body, req.user!.tenantId);
    res.status(201).json(schedule);
  } catch (err: any) {
    res.status(400).json({ error: err.message || '儲存行程失敗' });
  }
});

app.delete('/api/user/schedules/:id', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    await deleteUserSchedule(req.user!.userId, req.params.id, req.user!.tenantId);
    res.json({ success: true });
  } catch (err: any) {
    const status = err.message?.includes('找不到') ? 404 : 400;
    res.status(status).json({ error: err.message || '刪除行程失敗' });
  }
});

// Bulk One-Time Migration from LocalStorage (with deduplication against live Firestore)
app.post('/api/user/import-local', authenticateToken, denyGuest, async (req: Request, res: Response) => {
  try {
    const result = await importLocalData(req.user!.userId, req.user!.tenantId, req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || '本機生活資料匯入遷移失敗' });
  }
});

// Chat endpoint (supports text, files, audio, and role) - Protected by Token
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { history = [], message = '', audio, file } = req.body;
    const sessionUser = (req as any).user;
    const role = sessionUser.role; // Enforce role from verified token, reject client-side spoofing

    const ai = getGeminiClient();

    // Select system instruction according to live verified user role & custom admin settings
    let systemInstruction = SU_RUOYU_BOSS_INSTRUCTION;
    let recipientLabel = '老闆';

    if (role === 'admin') {
      const customCall = sessionUser.adminCustomSettings?.customCallName || '創辦人兼最高主管';
      const customTone = sessionUser.adminCustomSettings?.customTonePrompt || '';
      recipientLabel = customCall;
      systemInstruction = `${SU_RUOYU_BOSS_INSTRUCTION}
\n【★★★ 針對最高管理員/ADMIN 的特別專屬設定 ★★★】
- 當前互動對象是擁有最高系統權限的專屬管理者，稱呼他為「${customCall}」。
- 態度需具備最高等級的秘書默契、精明俐落與絕對忠誠，支持其指揮全局與管理所有同仁。
${customTone ? `- 專屬語氣與氛圍微調：${customTone}` : ''}`;
    } else if (role === 'boss') {
      recipientLabel = '老闆';
      systemInstruction = SU_RUOYU_BOSS_INSTRUCTION;
    } else if (role === 'user') {
      recipientLabel = sessionUser.displayName || '同仁';
      systemInstruction = `${SU_RUOYU_BOSS_INSTRUCTION.replace(/【1\. 核心角色定位】[\s\S]*?【2\./, `【1. 核心角色定位】
- 姓名：蘇若妤。
- 身份：頂尖行政秘書總監、高智商全能助理。
- 關係對象：眼前的使用者是工作同仁「${recipientLabel}」（客氣稱呼「${recipientLabel}」）。
- 核心態度：精明俐落、專業效率、互助合作。以可靠專業的大秘書風範協助同仁處理事務、記錄交辦與規劃日程。自稱「若妤」。\n\n【2.`)}`;
    } else {
      recipientLabel = '訪客朋友';
      systemInstruction = `${SU_RUOYU_BOSS_INSTRUCTION}
\n【★★★ 訪客體驗模式提示 ★★★】
- 當前互動對象是「訪客體驗者」。
- 請以親切、精明且驚艷的專業秘書風範展示你的全能秘書能力，引導其體驗聊天、日程與任務交辦功能。`;
    }

    const isBoss = role === 'boss' || role === 'admin';

    // Prepare contents array
    const contents: any[] = [];

    // Append prior history
    for (const item of history) {
      contents.push({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content }],
      });
    }

    // Prepare current user turn
    const currentParts: any[] = [];

    // Current timestamp context for secretary scheduling
    const now = new Date();
    const currentTimeContext = `【當前系統參考時間：${now.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}，星期${['日', '一', '二', '三', '四', '五', '六'][now.getDay()]}，當前互動對象：${isBoss ? '老闆 (The Boss)' : '余彥佐 (員工/助手)'}】`;

    // If audio is provided, attach inlineData
    if (audio?.data && audio?.mimeType) {
      currentParts.push({
        inlineData: {
          data: audio.data,
          mimeType: audio.mimeType,
        },
      });
    }

    // If file is provided (PDF, image, audio, video, text, etc.)
    if (file?.data && file?.mimeType) {
      if (
        file.mimeType.startsWith('image/') ||
        file.mimeType.startsWith('audio/') ||
        file.mimeType === 'application/pdf' ||
        file.mimeType.startsWith('video/')
      ) {
        currentParts.push({
          inlineData: {
            data: file.data,
            mimeType: file.mimeType,
          },
        });
      } else if (file.textContent) {
        currentParts.push({
          text: `【${isBoss ? '老闆' : '余彥佐'}上傳了檔案：${file.name}】\n檔案內容如下：\n\`\`\`\n${file.textContent}\n\`\`\``,
        });
      }
    }

    if (message && message.trim().length > 0) {
      currentParts.push({ text: `${currentTimeContext}\n${message}` });
    } else if (file) {
      if (file.mimeType?.startsWith('audio/')) {
        currentParts.push({
          text: `${currentTimeContext}\n（${isBoss ? '老闆' : '余彥佐'}傳送了一段錄製的語音訊息，請仔細聆聽並給出相應解答與執行動作）`,
        });
      } else {
        currentParts.push({
          text: `${currentTimeContext}\n（${isBoss ? '老闆' : '余彥佐'}上傳了檔案「${file.name}」，請檢視並用你蘇若妤的秘書身份給出分析）`,
        });
      }
    } else if (audio) {
      currentParts.push({
        text: `${currentTimeContext}\n（${isBoss ? '老闆' : '余彥佐'}傳送了一段語音訊息，請聽取並回應執行）`,
      });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const response = await generateContentWithRetry(ai, {
      contents,
      config: {
        systemInstruction,
        temperature: 0.85,
        topP: 0.95,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: '蘇若妤的對話回覆，遵循舞台劇動作神態描寫與秘書風格',
            },
            action: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description:
                    '動作類型：NAVIGATE, SET_ALARM, SET_TIMER, ADD_CALENDAR, CALL_PHONE, SEND_MESSAGE, ADD_NOTE, CHECK_WEATHER, SEARCH_WEB, DELEGATE_TASK, NONE',
                },
                destination: { type: Type.STRING, description: '導航目的地名稱' },
                alarmTime: { type: Type.STRING, description: '鬧鐘時間 HH:mm' },
                timerSeconds: { type: Type.INTEGER, description: '計時秒數' },
                label: { type: Type.STRING, description: '標籤或說明' },
                calendarTitle: { type: Type.STRING, description: '行事曆標題' },
                calendarDate: { type: Type.STRING, description: '行事曆日期 YYYY-MM-DD' },
                calendarTime: { type: Type.STRING, description: '行事曆時間 HH:mm' },
                calendarLocation: { type: Type.STRING, description: '行事曆地點' },
                phoneNumber: { type: Type.STRING, description: '電話號碼' },
                messagePlatform: { type: Type.STRING, description: '訊息平台 line/sms/whatsapp' },
                messageText: { type: Type.STRING, description: '訊息內容' },
                noteContent: { type: Type.STRING, description: '備忘錄內容' },
                weatherLocation: { type: Type.STRING, description: '查詢天氣地點' },
                searchQuery: { type: Type.STRING, description: '搜尋關鍵字' },
                // Boss delegation fields
                taskTitle: { type: Type.STRING, description: '老闆交辦給余彥佐的任務標題' },
                taskSummary: {
                  type: Type.STRING,
                  description:
                    '老闆交辦事項之精準總結（條列行動重點、時限、具體要求，利於余彥佐執行）',
                },
                taskDeadline: { type: Type.STRING, description: '任務期限或時間' },
                taskPriority: { type: Type.STRING, description: '優先層級：urgent, normal, low' },
              },
              required: ['type'],
            },
          },
          required: ['reply'],
        },
      },
    });

    let reply = '';
    let action: any = { type: 'NONE' };

    try {
      const parsed = JSON.parse(response.text || '{}');
      reply = parsed.reply || '';
      action = parsed.action || { type: 'NONE' };
    } catch (e) {
      reply = response.text || '';
    }

    // If this is a delegation task from Boss or Admin, automatically register it in Firestore
    if ((role === 'boss' || role === 'admin') && action && action.type === 'DELEGATE_TASK') {
      try {
        const newTask = await createTask({
          creatorId: sessionUser.userId,
          creatorName: sessionUser.displayName,
          creatorRole: sessionUser.role,
          assigneeId: action.assigneeId || 'ALL',
          taskTitle: action.taskTitle || '交辦事項',
          summary: action.taskSummary || message || '請依指示處理',
          rawInstruction: message || '',
          deadline: action.taskDeadline || '',
          priority: (action.taskPriority as any) || 'normal',
          tenantId: sessionUser.tenantId,
        });
        action.delegatedTaskId = newTask.id;
      } catch (taskErr) {
        console.error('Failed to auto-create delegated task in Firestore:', taskErr);
      }
    }

    res.json({ reply, action });
  } catch (error: any) {
    console.error('Chat error:', error);
    const errMsg = error?.message || String(error);
    const isOverloaded = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
    res.status(isOverloaded ? 503 : 500).json({
      error: isOverloaded
        ? '目前 AI 秘書服務流量龐大（短暫尖峰），請稍候 2~3 秒後再次傳送。'
        : (error?.message || '生成回覆時發生錯誤，請稍後再試。'),
    });
  }
});

// Voice analysis endpoint (specifically analyzes audio characteristics) - Protected by Token
app.post('/api/analyze-voice', authenticateToken, async (req, res) => {
  try {
    const { audio } = req.body;

    if (!audio?.data || !audio?.mimeType) {
      return res.status(400).json({ error: '請提供音訊資料' });
    }

    const ai = getGeminiClient();

    const analysisPrompt = `你現在是精通聲學、語言學與心理分析的秘書總監「蘇若妤」。
請針對使用者（余彥佐）錄製或上傳的這段語音進行全方位多語言語音診斷。
請解析：
1. language: 偵測到的語言或方言（如 台灣國語、台灣台語/閩南語、美式英語、日本語、中英夾雜等）
2. transcript: 精準的逐字稿（忠實呈現口語、語助詞）
3. tone: 說話語氣與情緒狀態（例如：心虛、吊兒郎當、理直氣壯、焦慮慌張、疲態畢露、自作聰明等）
4. speed: 語速與節奏表現（例如：忽快忽慢、語無倫次、拖泥帶水、急促搶話等）
5. confidenceOrClarity: 發音清晰度與底氣（例如：含糊不清咬滷汁、底氣不足、咬字清楚但欠揍等）
6. keyObservations: 3個精準的聲學或說話特徵觀察（字串陣列）
7. suDiagnosis: 蘇若妤專屬的毒舌聽音點評（用老娘口吻，嚴厲嘲諷他的發音與破綻，但一針見血指出他心理狀態與該改進的地方）`;

    const response = await generateContentWithRetry(ai, {
      contents: {
        parts: [
          {
            inlineData: {
              data: audio.data,
              mimeType: audio.mimeType,
            },
          },
          { text: analysisPrompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            language: { type: Type.STRING },
            transcript: { type: Type.STRING },
            tone: { type: Type.STRING },
            speed: { type: Type.STRING },
            confidenceOrClarity: { type: Type.STRING },
            keyObservations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suDiagnosis: { type: Type.STRING },
          },
          required: [
            'language',
            'transcript',
            'tone',
            'speed',
            'confidenceOrClarity',
            'keyObservations',
            'suDiagnosis',
          ],
        },
      },
    });

    const resultText = response.text?.trim() || '{}';
    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error: any) {
    console.error('Voice analysis error:', error);
    const errMsg = error?.message || String(error);
    const isOverloaded = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE');
    res.status(isOverloaded ? 503 : 500).json({
      error: isOverloaded
        ? '語音分析服務目前處於高流量高峰，請稍候再試。'
        : (error?.message || '語音分析失敗，請確認音訊格式後重試。'),
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
