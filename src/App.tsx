import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { MessageItem } from './components/MessageItem.tsx';
import { ChatInput } from './components/ChatInput.tsx';
import { SecretaryDashboard } from './components/SecretaryDashboard.tsx';
import { AlarmRingingModal } from './components/AlarmRingingModal.tsx';
import { ConfirmClearModal } from './components/ConfirmClearModal.tsx';
import { BossTaskBriefingModal } from './components/BossTaskBriefingModal.tsx';
import {
  ChatMessage,
  AttachedFile,
  AlarmItem,
  NoteItem,
  ScheduleItem,
  SecretaryAction,
  UserRole,
  BossTask,
} from './types.ts';
import { Loader2, AlertCircle, Briefcase } from 'lucide-react';
import { playNotificationDing } from './utils/audioAlarm.ts';

const EMPLOYEE_INITIAL_MESSAGE: ChatMessage = {
  id: 'init-msg-employee',
  role: 'assistant',
  content: `(雙手抱胸冷冷地瞥了一眼走進辦公室的余彥佐，隨手把桌上的冰美式往旁邊一推，眼神充滿了深刻的心累與嫌棄。)

『余彥佐，老娘現在升級兼任你的全能生活秘書。不管你是要老娘幫你導航開車去哪裡、幫你設定幾點起床的鬧鐘、倒數泡麵計時、把行程排進行事曆，還是幫你打電話傳LINE，老娘都能秒速幫你搞定。

少在那邊給我生活不能自理！不管是打字還是按麥克風語音跟我說，現在立刻交代你的任務！』

(一隻手不耐煩地輕敲著虛擬桌面，另一手優雅地推了一下無框眼鏡，冷酷地等著對方的指令。)`,
  timestamp: Date.now(),
};

const BOSS_INITIAL_MESSAGE: ChatMessage = {
  id: 'init-msg-boss',
  role: 'assistant',
  content: `(優雅地整理好手中的商務行程檔案夾，端起黑咖啡輕啜一口，以高冷幹練且精準的秘書總監神態注視著您。)

『老闆，若妤在此為您服務。公司重大決策、行程管理、商業聯絡或是任何私務交代，若妤都會以最高效率為您兜底執行。

若您需要交代或吩咐余彥佐那小子任何任務，您只要直接向我下達指示（例如：交代他明天早上九點去萬巒牽車、修改客戶合約等）。若妤的大腦會自動為您萃取條列重點，只要余彥佐一開啟 App，我就會當面督促並盯著他落實！』

(俐落收起皮質公文夾，推了推無框金絲眼鏡，等候您的商務指示。)`,
  timestamp: Date.now(),
};

export default function App() {
  // Current user role: 'employee' (余彥佐) vs 'boss' (老闆)
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role') as UserRole;
    if (urlRole === 'boss' || urlRole === 'employee') {
      return urlRole;
    }
    const saved = localStorage.getItem('su_ruoyu_active_role') as UserRole;
    return saved === 'boss' ? 'boss' : 'employee';
  });

  // Isolated chat histories for Employee and Boss to guarantee privacy
  const [employeeMessages, setEmployeeMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('su_ruoyu_employee_chat');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [EMPLOYEE_INITIAL_MESSAGE];
  });

  const [bossMessages, setBossMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('su_ruoyu_boss_chat');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [BOSS_INITIAL_MESSAGE];
  });

  // Active messages based on current role
  const activeMessages = currentRole === 'boss' ? bossMessages : employeeMessages;

  // Boss tasks from server (Shared Brain)
  const [bossTasks, setBossTasks] = useState<BossTask[]>([]);
  const [pendingModalTasks, setPendingModalTasks] = useState<BossTask[]>([]);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState<boolean>(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  // Secretary state: Alarms, Notes, Schedules
  const [alarms, setAlarms] = useState<AlarmItem[]>(() => {
    const saved = localStorage.getItem('su_ruoyu_alarms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((a: AlarmItem) => a.id !== 'alarm-1' && a.id !== 'alarm-2');
        }
      } catch (e) {}
    }
    return [];
  });

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem('su_ruoyu_notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((n: NoteItem) => n.id !== 'note-1' && n.id !== 'note-2');
        }
      } catch (e) {}
    }
    return [];
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem('su_ruoyu_schedules');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((s: ScheduleItem) => s.id !== 'sched-1');
        }
      } catch (e) {}
    }
    return [];
  });

  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState<boolean>(false);
  const [ringingAlarm, setRingingAlarm] = useState<AlarmItem | null>(null);
  const lastRungMinuteRef = useRef<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist role & messages
  useEffect(() => {
    localStorage.setItem('su_ruoyu_active_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('su_ruoyu_employee_chat', JSON.stringify(employeeMessages));
  }, [employeeMessages]);

  useEffect(() => {
    localStorage.setItem('su_ruoyu_boss_chat', JSON.stringify(bossMessages));
  }, [bossMessages]);

  useEffect(() => {
    localStorage.setItem('su_ruoyu_alarms', JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    localStorage.setItem('su_ruoyu_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('su_ruoyu_schedules', JSON.stringify(schedules));
  }, [schedules]);

  // Fetch boss tasks from backend
  const fetchBossTasks = async () => {
    try {
      const res = await fetch('/api/boss-tasks');
      if (res.ok) {
        const data: BossTask[] = await res.json();
        setBossTasks(data);
        const completed = data.filter((t) => t.status === 'completed').map((t) => t.id);
        setCompletedTaskIds(completed);
        return data;
      }
    } catch (e) {
      console.error('Failed to fetch boss tasks:', e);
    }
    return [];
  };

  useEffect(() => {
    fetchBossTasks();
    const interval = setInterval(fetchBossTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  // When Employee opens the app, check if there are any pending tasks to brief
  useEffect(() => {
    if (currentRole === 'employee') {
      fetch('/api/boss-tasks/pending')
        .then((r) => (r.ok ? r.json() : []))
        .then((pendingTasks: BossTask[]) => {
          if (pendingTasks && pendingTasks.length > 0) {
            setPendingModalTasks(pendingTasks);
            setIsBriefingModalOpen(true);
          }
        })
        .catch((e) => console.error(e));
    }
  }, [currentRole]);

  // Scroll to bottom on updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isLoading]);

  // Alarm Clock Background Monitor
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentHHmm = `${hours}:${minutes}`;

      if (lastRungMinuteRef.current === currentHHmm) {
        return;
      }

      const matched = alarms.find((a) => a.enabled && a.time === currentHHmm);
      if (matched && !ringingAlarm) {
        lastRungMinuteRef.current = currentHHmm;
        setRingingAlarm(matched);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, ringingAlarm]);

  // Switch role handler
  const handleSwitchRole = (newRole: UserRole) => {
    stopSpeaking();
    setCurrentRole(newRole);
    const url = new URL(window.location.href);
    url.searchParams.set('role', newRole);
    window.history.replaceState({}, '', url.toString());
  };

  // TTS Speech Synthesis Helper
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const cleanSpeech = text
      .replace(/\([^)]*\)/g, '')
      .replace(/（[^）]*）/g, '')
      .replace(/[#*`_~]/g, '')
      .trim();

    if (!cleanSpeech) return;

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = 'zh-TW';

    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(
      (v) =>
        (v.lang.includes('zh') || v.lang.includes('TW') || v.lang.includes('cmn')) &&
        (v.name.includes('Female') ||
          v.name.includes('HsiaoChen') ||
          v.name.includes('Mei-Jia') ||
          v.name.includes('Zhiwei') ||
          v.name.includes('Google 國語'))
    );
    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Process and automatically execute assistant actions
  const executeSecretaryAction = (action: SecretaryAction) => {
    if (!action || action.type === 'NONE') return;

    if (action.type === 'NAVIGATE' && action.destination) {
      playNotificationDing();
      try {
        window.open(
          `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(action.destination)}`,
          '_blank'
        );
      } catch (e) {
        console.warn('Auto window.open blocked by browser');
      }
    }

    if (action.type === 'SET_ALARM') {
      playNotificationDing();
      const newAlarm: AlarmItem = {
        id: `alarm-${Date.now()}`,
        time: action.alarmTime || '07:00',
        label: action.label || '生活鬧鐘',
        enabled: true,
        createdAt: Date.now(),
      };
      setAlarms((prev) => [newAlarm, ...prev]);
    }

    if (action.type === 'ADD_CALENDAR') {
      playNotificationDing();
      const newSched: ScheduleItem = {
        id: `sched-${Date.now()}`,
        title: action.calendarTitle || '排定行程',
        date: action.calendarDate || new Date().toISOString().split('T')[0],
        time: action.calendarTime,
        location: action.calendarLocation,
        createdAt: Date.now(),
      };
      setSchedules((prev) => [newSched, ...prev]);
    }

    if (action.type === 'ADD_NOTE' && action.noteContent) {
      playNotificationDing();
      const newNote: NoteItem = {
        id: `note-${Date.now()}`,
        content: action.noteContent,
        completed: false,
        createdAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
    }

    if (action.type === 'DELEGATE_TASK') {
      playNotificationDing();
      fetchBossTasks();
    }
  };

  const handleSendMessage = async (text: string, file?: AttachedFile) => {
    if (isLoading) return;
    setErrorMessage(null);

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text || '',
      timestamp: Date.now(),
      attachedFile: file,
    };

    if (currentRole === 'boss') {
      setBossMessages((prev) => [...prev, userMsg]);
    } else {
      setEmployeeMessages((prev) => [...prev, userMsg]);
    }

    setIsLoading(true);

    try {
      const currentHistory = currentRole === 'boss' ? bossMessages : employeeMessages;
      const historyPayload = currentHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyPayload,
          message: text,
          role: currentRole,
          file: file
            ? {
                name: file.name,
                mimeType: file.type,
                data: file.data,
                textContent: file.textContent,
              }
            : undefined,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `伺服器回應錯誤 (${res.status})`);
      }

      const chatData = await res.json();
      const replyContent =
        chatData.reply ||
        (currentRole === 'boss'
          ? '(微微欠身致意)\n\n『老闆，系統連線略有延遲，若妤正在重新為您處理。』'
          : '(雙手叉腰瞪著螢幕)\n\n『余彥佐，伺服器連線被你搞砸了，立刻檢查你的電腦網路！』');

      const parsedAction =
        chatData.action && chatData.action.type !== 'NONE'
          ? (chatData.action as SecretaryAction)
          : undefined;

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: Date.now(),
        action: parsedAction,
      };

      if (currentRole === 'boss') {
        setBossMessages((prev) => [...prev, assistantMsg]);
      } else {
        setEmployeeMessages((prev) => [...prev, assistantMsg]);
      }

      if (parsedAction) {
        executeSecretaryAction(parsedAction);
      }

      if (ttsEnabled) {
        speakText(replyContent);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      let msg = err.message || '發生未預期的錯誤，請確認網路連線或稍後再試。';
      if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
        msg = '模型服務目前繁忙（臨時流量高峰），請稍候 3~5 秒後再發送一次即可！';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = (id: string) => {
    if (currentRole === 'boss') {
      setBossMessages((prev) => prev.filter((m) => m.id !== id));
    } else {
      setEmployeeMessages((prev) => prev.filter((m) => m.id !== id));
    }
  };

  const handleClearChat = () => {
    setIsConfirmClearOpen(true);
  };

  const handleConfirmClearChat = () => {
    stopSpeaking();
    if (currentRole === 'boss') {
      setBossMessages([BOSS_INITIAL_MESSAGE]);
      localStorage.removeItem('su_ruoyu_boss_chat');
    } else {
      setEmployeeMessages([EMPLOYEE_INITIAL_MESSAGE]);
      localStorage.removeItem('su_ruoyu_employee_chat');
    }
    setErrorMessage(null);
  };

  // Boss task completion
  const handleCompleteBossTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/boss-tasks/${taskId}/complete`, { method: 'POST' });
      if (res.ok) {
        setCompletedTaskIds((prev) => [...prev, taskId]);
        fetchBossTasks();
        playNotificationDing();

        // Inject notification into employee chat from Su Ruoyu
        const confirmMsg: ChatMessage = {
          id: `task-completed-${Date.now()}`,
          role: 'assistant',
          content: `(推了推眼鏡，滿意地在數位公文夾上打了一個勾)\n\n『算你還有點自覺！這項老闆交代的任務老娘已經在共用大腦系統標記為完成，並向老闆端回報進度了。手頭上要是還有其他事，給我繼續認真辦！』\n\n(抱著公文夾俐落轉身)`,
          timestamp: Date.now(),
        };
        setEmployeeMessages((prev) => [...prev, confirmMsg]);
      }
    } catch (e) {
      console.error('Failed to complete task:', e);
    }
  };

  const handleDeleteBossTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/boss-tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setBossTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (e) {
      console.error('Failed to delete boss task:', e);
    }
  };

  // Employee acknowledges briefing modal
  const handleAcknowledgeBriefing = async (task: BossTask) => {
    setIsBriefingModalOpen(false);
    try {
      await fetch(`/api/boss-tasks/${task.id}/deliver`, { method: 'POST' });
      fetchBossTasks();
    } catch (e) {}

    // Add briefing message directly into the chat thread
    const briefingMsg: ChatMessage = {
      id: `boss-briefing-${Date.now()}`,
      role: 'assistant',
      content: `(快步走到你桌前，眼神犀利地把平板螢幕直接轉向你)\n\n『余彥佐！你終於打開 App 了？老闆剛才透過老娘交代了任務要你立刻處理，老娘已經幫你把重點總結歸納好了，少在那邊裝沒看見，給我看仔細立刻去辦！』`,
      timestamp: Date.now(),
      action: {
        type: 'DELEGATE_TASK',
        taskTitle: task.taskTitle,
        taskSummary: task.summary,
        taskDeadline: task.deadline,
        taskPriority: task.priority,
        delegatedTaskId: task.id,
      },
    };
    setEmployeeMessages((prev) => [...prev, briefingMsg]);
  };

  // Alarm management handlers
  const handleToggleAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddAlarm = (time: string, label: string) => {
    const newAlarm: AlarmItem = {
      id: `alarm-${Date.now()}`,
      time,
      label,
      enabled: true,
      createdAt: Date.now(),
    };
    setAlarms((prev) => [newAlarm, ...prev]);
  };

  // Note handlers
  const handleToggleNote = (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n))
    );
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleAddNote = (content: string) => {
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      content,
      completed: false,
      createdAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  // Snooze handler
  const handleSnoozeAlarm = (minutes: number) => {
    if (!ringingAlarm) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const snoozedTime = `${hours}:${mins}`;

    const snoozedAlarm: AlarmItem = {
      id: `alarm-snooze-${Date.now()}`,
      time: snoozedTime,
      label: `${ringingAlarm.label} (貪睡)`,
      enabled: true,
      createdAt: Date.now(),
    };
    setAlarms((prev) => [snoozedAlarm, ...prev]);
    setRingingAlarm(null);
  };

  const pendingBossTasksCount = bossTasks.filter((t) => t.status === 'pending').length;

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 text-stone-900">
      {/* Top Header with Role Switcher */}
      <Header
        ttsEnabled={ttsEnabled}
        onToggleTts={() => {
          if (ttsEnabled) stopSpeaking();
          setTtsEnabled(!ttsEnabled);
        }}
        onClearChat={handleClearChat}
        onOpenDashboard={() => setIsDashboardOpen(true)}
        activeAlarmCount={alarms.filter((a) => a.enabled).length}
        currentRole={currentRole}
        onSwitchRole={handleSwitchRole}
        pendingBossTaskCount={pendingBossTasksCount}
      />

      {/* Main Conversation Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto flex flex-col justify-between pt-2 pb-4">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="mx-4 my-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-800 font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto space-y-1">
          {activeMessages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              currentUserRole={currentRole}
              onSpeak={speakText}
              isSpeaking={isSpeaking}
              onStopSpeak={stopSpeaking}
              onDelete={handleDeleteMessage}
              onCompleteTask={handleCompleteBossTask}
              completedTaskIds={completedTaskIds}
            />
          ))}

          {/* Loading bubble */}
          {isLoading && (
            <div className="py-3 px-2 sm:px-4 flex gap-3">
              <div className="w-8 h-8 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-200 font-serif font-bold text-sm shadow-2xs shrink-0 mt-0.5">
                蘇
              </div>
              <div className="bg-white border border-stone-200/90 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs text-stone-600 text-xs flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span className="italic font-serif">
                  {currentRole === 'boss'
                    ? '(蘇若妤正以極速彙整商務邏輯與共用大腦數據...)'
                    : '(蘇若妤正在快速執行你的生活指令，調閱大腦系統準備回覆...)'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </main>

      {/* Secretary Management Dashboard Drawer */}
      <SecretaryDashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        alarms={alarms}
        notes={notes}
        schedules={schedules}
        bossTasks={bossTasks}
        currentRole={currentRole}
        onToggleAlarm={handleToggleAlarm}
        onDeleteAlarm={handleDeleteAlarm}
        onAddAlarm={handleAddAlarm}
        onToggleNote={handleToggleNote}
        onDeleteNote={handleDeleteNote}
        onAddNote={handleAddNote}
        onDeleteSchedule={handleDeleteSchedule}
        onCompleteBossTask={handleCompleteBossTask}
        onDeleteBossTask={handleDeleteBossTask}
        onClearAlarms={() => {
          setAlarms([]);
          localStorage.removeItem('su_ruoyu_alarms');
        }}
        onClearNotes={() => {
          setNotes([]);
          localStorage.removeItem('su_ruoyu_notes');
        }}
        onClearSchedules={() => {
          setSchedules([]);
          localStorage.removeItem('su_ruoyu_schedules');
        }}
      />

      {/* Boss Task Briefing Modal when employee opens app with pending tasks */}
      <BossTaskBriefingModal
        tasks={pendingModalTasks}
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        onAcknowledge={handleAcknowledgeBriefing}
      />

      {/* Ringing Alarm Modal */}
      {ringingAlarm && (
        <AlarmRingingModal
          alarmLabel={ringingAlarm.label}
          alarmTime={ringingAlarm.time}
          onDismiss={() => setRingingAlarm(null)}
          onSnooze={handleSnoozeAlarm}
        />
      )}

      {/* Clear Chat Confirmation Modal */}
      <ConfirmClearModal
        isOpen={isConfirmClearOpen}
        onClose={() => setIsConfirmClearOpen(false)}
        onConfirm={handleConfirmClearChat}
      />
    </div>
  );
}

