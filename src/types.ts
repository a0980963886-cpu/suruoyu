export interface VoiceAnalysisData {
  language: string;
  transcript: string;
  tone: string;
  speed: string;
  confidenceOrClarity: string;
  keyObservations: string[];
  suDiagnosis: string;
}

export interface AttachedFile {
  name: string;
  type: string;
  size: number;
  data: string; // base64
  previewUrl?: string;
  textContent?: string;
}

export type UserRole = 'employee' | 'boss' | 'guest';

export interface BossTask {
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

export type ActionType =
  | 'NAVIGATE'
  | 'SET_ALARM'
  | 'SET_TIMER'
  | 'ADD_CALENDAR'
  | 'CALL_PHONE'
  | 'SEND_MESSAGE'
  | 'ADD_NOTE'
  | 'CHECK_WEATHER'
  | 'SEARCH_WEB'
  | 'DELEGATE_TASK'
  | 'NONE';

export interface SecretaryAction {
  type: ActionType;
  destination?: string;
  alarmTime?: string; // HH:mm
  timerSeconds?: number;
  label?: string;
  calendarTitle?: string;
  calendarDate?: string; // YYYY-MM-DD
  calendarTime?: string; // HH:mm
  calendarLocation?: string;
  phoneNumber?: string;
  messagePlatform?: 'line' | 'sms' | 'whatsapp' | string;
  messageText?: string;
  noteContent?: string;
  weatherLocation?: string;
  searchQuery?: string;
  autoTriggered?: boolean;
  // For boss delegated tasks
  taskTitle?: string;
  taskSummary?: string;
  taskDeadline?: string;
  taskPriority?: 'urgent' | 'normal' | 'low';
  rawInstruction?: string;
  delegatedTaskId?: string;
}

export interface AlarmItem {
  id: string;
  time: string; // HH:mm
  label: string;
  enabled: boolean;
  createdAt: number;
}

export interface TimerItem {
  id: string;
  durationSeconds: number;
  remainingSeconds: number;
  label: string;
  isRunning: boolean;
  createdAt: number;
}

export interface ScheduleItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location?: string;
  details?: string;
  createdAt: number;
}

export interface NoteItem {
  id: string;
  content: string;
  completed: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachedFile?: AttachedFile;
  voiceAnalysis?: VoiceAnalysisData;
  action?: SecretaryAction;
}

export type SupportedLanguage = 
  | 'zh-TW' 
  | 'zh-HK' 
  | 'en-US' 
  | 'ja-JP' 
  | 'ko-KR';

