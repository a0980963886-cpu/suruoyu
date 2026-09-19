import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Shared Brain Boss Task interface & persistence
export interface ServerBossTask {
  id: string;
  taskTitle: string;
  summary: string;
  rawInstruction?: string;
  deadline?: string;
  priority?: 'urgent' | 'normal' | 'low';
  createdAt: number;
  status: 'pending' | 'delivered' | 'completed';
  deliveredAt?: number;
  completedAt?: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const TASKS_FILE = path.join(DATA_DIR, 'boss_tasks.json');

let bossTasks: ServerBossTask[] = [];

function loadBossTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      const data = fs.readFileSync(TASKS_FILE, 'utf-8');
      bossTasks = JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load boss tasks:', err);
  }
}

function saveBossTasks() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(TASKS_FILE, JSON.stringify(bossTasks, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save boss tasks:', err);
  }
}

loadBossTasks();

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

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

async function generateContentWithRetry(ai: GoogleGenAI, request: any) {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
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
          console.warn(`Model ${model} attempt ${attempt + 1} hit temporary limit/503. Retrying or switching model...`);
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        } else {
          throw err;
        }
      }
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    name: '蘇若妤 AI 助理',
    pendingBossTasks: bossTasks.filter((t) => t.status === 'pending').length,
  });
});

// Boss Tasks API
app.get('/api/boss-tasks', (req, res) => {
  res.json(bossTasks);
});

app.get('/api/boss-tasks/pending', (req, res) => {
  const pending = bossTasks.filter((t) => t.status === 'pending');
  res.json(pending);
});

app.post('/api/boss-tasks', (req, res) => {
  const { taskTitle, summary, rawInstruction, deadline, priority } = req.body;
  const newTask: ServerBossTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    taskTitle: taskTitle || '老闆交代任務',
    summary: summary || '請余彥佐依老闆指示處理',
    rawInstruction: rawInstruction || '',
    deadline: deadline || '',
    priority: priority || 'normal',
    createdAt: Date.now(),
    status: 'pending',
  };
  bossTasks.unshift(newTask);
  saveBossTasks();
  res.json(newTask);
});

app.post('/api/boss-tasks/:id/deliver', (req, res) => {
  const task = bossTasks.find((t) => t.id === req.params.id);
  if (task && task.status === 'pending') {
    task.status = 'delivered';
    task.deliveredAt = Date.now();
    saveBossTasks();
  }
  res.json({ success: true, task });
});

app.post('/api/boss-tasks/:id/complete', (req, res) => {
  const task = bossTasks.find((t) => t.id === req.params.id);
  if (task) {
    task.status = 'completed';
    task.completedAt = Date.now();
    saveBossTasks();
  }
  res.json({ success: true, task });
});

app.delete('/api/boss-tasks/:id', (req, res) => {
  bossTasks = bossTasks.filter((t) => t.id !== req.params.id);
  saveBossTasks();
  res.json({ success: true });
});

// Chat endpoint (supports text, files, audio, and role)
app.post('/api/chat', async (req, res) => {
  try {
    const { history = [], message = '', audio, file, role = 'employee' } = req.body;

    const ai = getGeminiClient();

    // Select system instruction according to user role
    const isBoss = role === 'boss';
    const systemInstruction = isBoss ? SU_RUOYU_BOSS_INSTRUCTION : SU_RUOYU_EMPLOYEE_INSTRUCTION;

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

    // If this is a delegation task from Boss, automatically register it in shared brain
    if (isBoss && action && action.type === 'DELEGATE_TASK') {
      const newTask: ServerBossTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        taskTitle: action.taskTitle || '老闆交代事項',
        summary: action.taskSummary || message || '請余彥佐依老闆指示處理',
        rawInstruction: message || '',
        deadline: action.taskDeadline || '',
        priority: (action.taskPriority as any) || 'normal',
        createdAt: Date.now(),
        status: 'pending',
      };
      bossTasks.unshift(newTask);
      saveBossTasks();
      action.delegatedTaskId = newTask.id;
    }

    res.json({ reply, action });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error?.message || '生成回覆時發生錯誤，請稍後再試。',
    });
  }
});

// Voice analysis endpoint (specifically analyzes audio characteristics)
app.post('/api/analyze-voice', async (req, res) => {
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
    res.status(500).json({
      error: error?.message || '語音分析失敗，請確認音訊格式後重試。',
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
