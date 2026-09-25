import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.tsx';
import { MessageItem } from './components/MessageItem.tsx';
import { ChatInput } from './components/ChatInput.tsx';
import { SecretaryDashboard } from './components/SecretaryDashboard.tsx';
import { AlarmRingingModal } from './components/AlarmRingingModal.tsx';
import { ConfirmClearModal } from './components/ConfirmClearModal.tsx';
import { BossTaskBriefingModal } from './components/BossTaskBriefingModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { AdminPanelModal } from './components/AdminPanelModal.tsx';
import {
  ChatMessage,
  AttachedFile,
  AlarmItem,
  NoteItem,
  ScheduleItem,
  SecretaryAction,
  UserRole,
  BossTask,
  AuthUser,
} from './types.ts';
import { Loader2, AlertCircle, Briefcase, CloudUpload, CheckCircle2 } from 'lucide-react';
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
  // Authentication state
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('su_ruoyu_auth_token') || null;
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const savedUser = localStorage.getItem('su_ruoyu_auth_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {}
    }
    return null;
  });
  const [isVerifyingAuth, setIsVerifyingAuth] = useState<boolean>(true);

  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);

  // Current user role: derived directly from authenticated session
  const currentRole: UserRole = authUser?.role || 'user';

  // Isolated chat histories for Users and Boss/Admin
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
  const isBossOrAdmin = currentRole === 'boss' || currentRole === 'admin';
  const activeMessages = isBossOrAdmin ? bossMessages : employeeMessages;

  // Boss tasks from server (Shared Brain)
  const [bossTasks, setBossTasks] = useState<BossTask[]>([]);
  const [pendingModalTasks, setPendingModalTasks] = useState<BossTask[]>([]);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState<boolean>(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  // Secretary state: Alarms, Notes, Schedules (InMemory state for Guest, Cloud Firestore for Authenticated users)
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  // Migration state for legacy browser localStorage
  const [pendingMigration, setPendingMigration] = useState<{
    alarms: AlarmItem[];
    notes: NoteItem[];
    schedules: ScheduleItem[];
  } | null>(null);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);

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

  // Check legacy localStorage for un-migrated life data
  const checkLegacyLocalStorage = () => {
    try {
      const rawAlarms = localStorage.getItem('su_ruoyu_alarms');
      const rawNotes = localStorage.getItem('su_ruoyu_notes');
      const rawScheds = localStorage.getItem('su_ruoyu_schedules');

      let parsedAlarms: AlarmItem[] = [];
      let parsedNotes: NoteItem[] = [];
      let parsedScheds: ScheduleItem[] = [];

      if (rawAlarms) {
        const arr = JSON.parse(rawAlarms);
        if (Array.isArray(arr)) {
          parsedAlarms = arr.filter((a) => a && a.time);
        }
      }
      if (rawNotes) {
        const arr = JSON.parse(rawNotes);
        if (Array.isArray(arr)) {
          parsedNotes = arr.filter((n) => n && n.content);
        }
      }
      if (rawScheds) {
        const arr = JSON.parse(rawScheds);
        if (Array.isArray(arr)) {
          parsedScheds = arr.filter((s) => s && s.title && s.date);
        }
      }

      if (parsedAlarms.length > 0 || parsedNotes.length > 0 || parsedScheds.length > 0) {
        setPendingMigration({
          alarms: parsedAlarms,
          notes: parsedNotes,
          schedules: parsedScheds,
        });
      } else {
        setPendingMigration(null);
      }
    } catch (e) {
      console.warn('Error reading legacy storage:', e);
    }
  };

  // Fetch authoritative user life data from Cloud Firestore
  const fetchUserData = async () => {
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    const storedUser = authUser || (localStorage.getItem('su_ruoyu_auth_user') ? JSON.parse(localStorage.getItem('su_ruoyu_auth_user')!) : null);
    if (!token || storedUser?.role === 'guest') return;

    try {
      const [alarmsRes, notesRes, schedulesRes] = await Promise.all([
        fetch('/api/user/alarms', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/notes', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/user/schedules', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (alarmsRes.ok && alarmsRes.headers.get('content-type')?.includes('application/json')) {
        const data = await alarmsRes.json();
        setAlarms(data);
      } else if (alarmsRes.status === 401) {
        handleLogout();
        return;
      }

      if (notesRes.ok && notesRes.headers.get('content-type')?.includes('application/json')) {
        const data = await notesRes.json();
        setNotes(data);
      }

      if (schedulesRes.ok && schedulesRes.headers.get('content-type')?.includes('application/json')) {
        const data = await schedulesRes.json();
        setSchedules(data);
      }
    } catch (e) {
      console.error('Failed to fetch user cloud data:', e);
    }
  };

  // Validate auth session with backend on startup
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('su_ruoyu_auth_token');
      if (!token) {
        setAuthToken(null);
        setAuthUser(null);
        setIsVerifyingAuth(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const isJson = res.headers.get('content-type')?.includes('application/json');
        if (res.ok && isJson) {
          const data = await res.json();
          if (data.user) {
            const verifiedUser: AuthUser = {
              id: data.user.id,
              email: data.user.email,
              role: data.user.role,
              name: data.user.name,
              token: token,
              tenantId: data.user.tenantId,
              adminCustomSettings: data.user.adminCustomSettings,
            };
            setAuthUser(verifiedUser);
            setAuthToken(token);
            localStorage.setItem('su_ruoyu_auth_user', JSON.stringify(verifiedUser));

            if (verifiedUser.role !== 'guest') {
              fetchUserData();
              checkLegacyLocalStorage();
            }
          } else {
            handleLogout();
          }
        } else if (res.status === 401) {
          // Token expired, invalid or revoked
          handleLogout();
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setIsVerifyingAuth(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (user: AuthUser) => {
    setAuthToken(user.token);
    setAuthUser(user);
    localStorage.setItem('su_ruoyu_auth_token', user.token);
    localStorage.setItem('su_ruoyu_auth_user', JSON.stringify(user));
    setErrorMessage(null);

    if (user.role !== 'guest') {
      fetchUserData();
      checkLegacyLocalStorage();
    }
  };

  const handleLogout = async () => {
    stopSpeaking();
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        console.error('Failed to notify backend of logout:', e);
      }
    }
    setAuthToken(null);
    setAuthUser(null);
    setAlarms([]);
    setNotes([]);
    setSchedules([]);
    setBossTasks([]);
    setPendingMigration(null);
    localStorage.removeItem('su_ruoyu_auth_token');
    localStorage.removeItem('su_ruoyu_auth_user');
  };

  // Fetch boss tasks from backend (Authenticated)
  const fetchBossTasks = async () => {
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) return [];

    try {
      const res = await fetch('/api/boss-tasks', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data: BossTask[] = await res.json();
        setBossTasks(data);
        const completed = data.filter((t) => t.status === 'completed').map((t) => t.id);
        setCompletedTaskIds(completed);
        return data;
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to fetch boss tasks:', e);
    }
    return [];
  };

  useEffect(() => {
    if (authToken) {
      fetchBossTasks();
      const interval = setInterval(fetchBossTasks, 5000);
      return () => clearInterval(interval);
    }
  }, [authToken]);

  // When User opens the app, check if there are any pending tasks assigned to them to brief
  useEffect(() => {
    if (authToken && currentRole === 'user') {
      fetch('/api/boss-tasks/pending', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
        .then((r) => {
          if (r.status === 401) {
            handleLogout();
            return [];
          }
          const isJson = r.headers.get('content-type')?.includes('application/json');
          return r.ok && isJson ? r.json() : [];
        })
        .then((pendingTasks: BossTask[]) => {
          if (pendingTasks && pendingTasks.length > 0) {
            setPendingModalTasks(pendingTasks);
            setIsBriefingModalOpen(true);
          }
        })
        .catch((e) => console.error(e));
    }
  }, [authToken, currentRole]);

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

  // Cloud & Memory Handlers for Alarms, Notes, Schedules
  const handleToggleAlarm = async (id: string) => {
    if (authUser?.role === 'guest') {
      setAlarms((prev) =>
        prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
      );
      return;
    }
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/user/alarms/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = await res.json();
        setAlarms((prev) => prev.map((a) => (a.id === id ? updated : a)));
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to toggle alarm:', e);
    }
  };

  const handleDeleteAlarm = async (id: string) => {
    if (authUser?.role === 'guest') {
      setAlarms((prev) => prev.filter((a) => a.id !== id));
      return;
    }
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/user/alarms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAlarms((prev) => prev.filter((a) => a.id !== id));
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to delete alarm:', e);
    }
  };

  const handleAddAlarm = async (time: string, label: string) => {
    if (authUser?.role === 'guest') {
      const newAlarm: AlarmItem = {
        id: `alarm-${Date.now()}`,
        time,
        label,
        enabled: true,
        createdAt: Date.now(),
      };
      setAlarms((prev) => [newAlarm, ...prev]);
      return;
    }
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) return;

    try {
      const res = await fetch('/api/user/alarms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ time, label, enabled: true }),
      });
      if (res.ok) {
        const saved = await res.json();
        setAlarms((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to add alarm:', e);
    }
  };

  // Note handlers
  const handleToggleNote = async (id: string) => {
    if (authUser?.role === 'guest') {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n))
      );
      return;
    }
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/user/notes/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updated = await res.json();
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to toggle note:', e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (authUser?.role === 'guest') {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      return;
    }
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/user/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  const handleAddNote = async (content: string) => {
    if (authUser?.role === 'guest') {
      const newNote: NoteItem = {
        id: `note-${Date.now()}`,
        content,
        completed: false,
        createdAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      return;
    }
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) return;

    try {
      const res = await fetch('/api/user/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, completed: false }),
      });
      if (res.ok) {
        const saved = await res.json();
        setNotes((prev) => [saved, ...prev.filter((n) => n.id !== saved.id)]);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to add note:', e);
    }
  };

  // Schedule handlers
  const handleAddSchedule = async (
    title: string,
    date: string,
    time?: string,
    location?: string,
    details?: string
  ) => {
    if (authUser?.role === 'guest') {
      const newSched: ScheduleItem = {
        id: `sched-${Date.now()}`,
        title,
        date,
        time,
        location,
        details,
        createdAt: Date.now(),
      };
      setSchedules((prev) => [newSched, ...prev]);
      return;
    }
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) return;

    try {
      const res = await fetch('/api/user/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, date, time, location, details }),
      });
      if (res.ok) {
        const saved = await res.json();
        setSchedules((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to add schedule:', e);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (authUser?.role === 'guest') {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      return;
    }
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) return;

    try {
      const res = await fetch(`/api/user/schedules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to delete schedule:', e);
    }
  };

  const handleClearAlarms = async () => {
    const isGuest = authUser?.role === 'guest';
    const currentAlarms = [...alarms];
    setAlarms([]);
    if (!isGuest) {
      const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
      if (token) {
        await Promise.all(
          currentAlarms.map((a) =>
            fetch(`/api/user/alarms/${a.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {})
          )
        );
      }
    }
  };

  const handleClearNotes = async () => {
    const isGuest = authUser?.role === 'guest';
    const currentNotes = [...notes];
    setNotes([]);
    if (!isGuest) {
      const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
      if (token) {
        await Promise.all(
          currentNotes.map((n) =>
            fetch(`/api/user/notes/${n.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {})
          )
        );
      }
    }
  };

  const handleClearSchedules = async () => {
    const isGuest = authUser?.role === 'guest';
    const currentScheds = [...schedules];
    setSchedules([]);
    if (!isGuest) {
      const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
      if (token) {
        await Promise.all(
          currentScheds.map((s) =>
            fetch(`/api/user/schedules/${s.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {})
          )
        );
      }
    }
  };

  // Migration Handlers
  const handleExecuteMigration = async () => {
    if (!pendingMigration) return;
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token || authUser?.role === 'guest') return;

    setIsMigrating(true);
    setMigrationMessage(null);
    try {
      const res = await fetch('/api/user/import-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          alarms: pendingMigration.alarms,
          notes: pendingMigration.notes,
          schedules: pendingMigration.schedules,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || '匯入遷移失敗');
      }

      const result = await res.json();
      if (result.alarms) setAlarms(result.alarms);
      if (result.notes) setNotes(result.notes);
      if (result.schedules) setSchedules(result.schedules);

      // Requirement 6: Only remove legacy localStorage items if ALL data was successfully migrated with NO failures.
      // If partial failures occurred, retain unimported failed items in localStorage and pendingMigration so data is never lost!
      if (result.hasFailures) {
        const remainingAlarms = result.failedAlarms || [];
        const remainingNotes = result.failedNotes || [];
        const remainingSchedules = result.failedSchedules || [];

        if (remainingAlarms.length > 0) {
          localStorage.setItem('su_ruoyu_alarms', JSON.stringify(remainingAlarms));
        } else {
          localStorage.removeItem('su_ruoyu_alarms');
        }

        if (remainingNotes.length > 0) {
          localStorage.setItem('su_ruoyu_notes', JSON.stringify(remainingNotes));
        } else {
          localStorage.removeItem('su_ruoyu_notes');
        }

        if (remainingSchedules.length > 0) {
          localStorage.setItem('su_ruoyu_schedules', JSON.stringify(remainingSchedules));
        } else {
          localStorage.removeItem('su_ruoyu_schedules');
        }

        setPendingMigration({
          alarms: remainingAlarms,
          notes: remainingNotes,
          schedules: remainingSchedules,
        });

        const failedTotal = remainingAlarms.length + remainingNotes.length + remainingSchedules.length;
        setMigrationMessage(
          `部分生活資料已寫入雲端（${result.importedAlarmsCount} 鬧鐘、${result.importedNotesCount} 筆記、${result.importedSchedulesCount} 行程），但有 ${failedTotal} 筆資料寫入失敗，已嚴格保留在您的本機資料中，未被清除。`
        );
      } else {
        // Complete success: safely clear legacy localStorage items
        localStorage.removeItem('su_ruoyu_alarms');
        localStorage.removeItem('su_ruoyu_notes');
        localStorage.removeItem('su_ruoyu_schedules');
        setPendingMigration(null);
        setMigrationMessage(
          `生活資料已全數順利遷移至雲端！共匯入 ${result.importedAlarmsCount} 項鬧鐘、${result.importedNotesCount} 則筆記、${result.importedSchedulesCount} 筆行程（重複項自動略過），本機快取已安全清除。`
        );
      }
      setTimeout(() => setMigrationMessage(null), 7000);
    } catch (err: any) {
      setMigrationMessage(`匯入失敗：${err.message || '資料庫連線中斷，已保留本機全部資料'}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismissMigration = () => {
    localStorage.removeItem('su_ruoyu_alarms');
    localStorage.removeItem('su_ruoyu_notes');
    localStorage.removeItem('su_ruoyu_schedules');
    setPendingMigration(null);
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
      handleAddAlarm(action.alarmTime || '07:00', action.label || '生活鬧鐘');
    }

    if (action.type === 'ADD_CALENDAR') {
      playNotificationDing();
      handleAddSchedule(
        action.calendarTitle || '排定行程',
        action.calendarDate || new Date().toISOString().split('T')[0],
        action.calendarTime,
        action.calendarLocation
      );
    }

    if (action.type === 'ADD_NOTE' && action.noteContent) {
      playNotificationDing();
      handleAddNote(action.noteContent);
    }

    if (action.type === 'DELEGATE_TASK') {
      playNotificationDing();
      fetchBossTasks();
    }
  };

  const handleSendMessage = async (text: string, file?: AttachedFile) => {
    if (isLoading) return;
    setErrorMessage(null);

    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) {
      handleLogout();
      return;
    }

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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
        if (res.status === 401) {
          handleLogout();
          return;
        }
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
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) {
      handleLogout();
      return;
    }

    try {
      const res = await fetch(`/api/boss-tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to complete task:', e);
    }
  };

  const handleDeleteBossTask = async (taskId: string) => {
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) {
      handleLogout();
      return;
    }

    try {
      const res = await fetch(`/api/boss-tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setBossTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (e) {
      console.error('Failed to delete boss task:', e);
    }
  };

  // Employee acknowledges briefing modal
  const handleAcknowledgeBriefing = async (task: BossTask) => {
    setIsBriefingModalOpen(false);
    const token = authToken || localStorage.getItem('su_ruoyu_auth_token');
    if (!token) {
      handleLogout();
      return;
    }

    try {
      await fetch(`/api/boss-tasks/${task.id}/deliver`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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

  // Unauthenticated or Verifying session
  if (isVerifyingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-stone-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-serif font-bold text-2xl shadow-lg animate-pulse">
            蘇
          </div>
          <div className="flex items-center gap-2 text-stone-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>正在驗證身分安全金鑰...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!authToken || !authUser) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <AuthModal onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone-50 text-stone-900">
      {/* Top Header with Authenticated Role Badge and Logout */}
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
        userName={authUser.name}
        pendingBossTaskCount={pendingBossTasksCount}
        onLogout={handleLogout}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
      />

      {/* Main Conversation Canvas */}
      <main className="flex-1 max-w-4xl w-full mx-auto flex flex-col justify-between pt-2 pb-4">
        {/* LocalStorage Data Migration Alert Banner */}
        {pendingMigration && authUser && authUser.role !== 'guest' && (
          <div className="mx-4 my-2 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CloudUpload className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-stone-900 text-sm">
                  偵測到本機舊版生活資料，是否一次性遷移至雲端資料庫？
                </p>
                <p className="text-stone-600 mt-0.5">
                  包含 {pendingMigration.alarms.length} 項鬧鐘、{pendingMigration.notes.length} 則筆記、{pendingMigration.schedules.length} 筆行程。匯入時會自動比對並剔除重複項目，確認匯入成功後將安全清除本機暫存。
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleDismissMigration}
                disabled={isMigrating}
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-200 text-xs font-medium cursor-pointer transition"
              >
                捨棄本機資料
              </button>
              <button
                type="button"
                onClick={handleExecuteMigration}
                disabled={isMigrating}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium cursor-pointer flex items-center gap-1.5 shadow-xs transition"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>遷移中...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>確定匯入雲端</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Migration feedback message banner */}
        {migrationMessage && (
          <div className="mx-4 my-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{migrationMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setMigrationMessage(null)}
              className="text-emerald-500 hover:text-emerald-800 font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

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
        onClearAlarms={handleClearAlarms}
        onClearNotes={handleClearNotes}
        onClearSchedules={handleClearSchedules}
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

      {/* Admin Panel Modal */}
      {authUser && (
        <AdminPanelModal
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          currentUser={authUser}
        />
      )}
    </div>
  );
}

