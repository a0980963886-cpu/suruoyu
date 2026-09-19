import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckSquare,
  Plus,
  Trash2,
  Volume2,
  Calendar,
  Sparkles,
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { AlarmItem, NoteItem, ScheduleItem, BossTask, UserRole } from '../types.ts';
import { playNotificationDing } from '../utils/audioAlarm.ts';

interface SecretaryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  alarms: AlarmItem[];
  notes: NoteItem[];
  schedules: ScheduleItem[];
  bossTasks?: BossTask[];
  currentRole?: UserRole;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onAddAlarm: (time: string, label: string) => void;
  onToggleNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onAddNote: (content: string) => void;
  onDeleteSchedule: (id: string) => void;
  onCompleteBossTask?: (taskId: string) => void;
  onDeleteBossTask?: (taskId: string) => void;
  onClearAlarms?: () => void;
  onClearNotes?: () => void;
  onClearSchedules?: () => void;
}

export const SecretaryDashboard: React.FC<SecretaryDashboardProps> = ({
  isOpen,
  onClose,
  alarms,
  notes,
  schedules,
  bossTasks = [],
  currentRole = 'employee',
  onToggleAlarm,
  onDeleteAlarm,
  onAddAlarm,
  onToggleNote,
  onDeleteNote,
  onAddNote,
  onDeleteSchedule,
  onCompleteBossTask,
  onDeleteBossTask,
  onClearAlarms,
  onClearNotes,
  onClearSchedules,
}) => {
  const [activeTab, setActiveTab] = useState<'bossTasks' | 'alarms' | 'notes' | 'schedule'>('bossTasks');
  const [newAlarmTime, setNewAlarmTime] = useState('07:30');
  const [newAlarmLabel, setNewAlarmLabel] = useState('早晨起床');
  const [newNoteText, setNewNoteText] = useState('');

  if (!isOpen) return null;

  const handleCreateAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlarmTime) return;
    onAddAlarm(newAlarmTime, newAlarmLabel || '秘書提醒');
    setNewAlarmLabel('');
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    onAddNote(newNoteText.trim());
    setNewNoteText('');
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-md bg-stone-50 h-full shadow-2xl flex flex-col border-l border-stone-200">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-stone-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center font-bold text-sm shadow-xs">
              蘇
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <span>生活小幫手總覽</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-semibold">
                  秘書總監管轄
                </span>
              </h2>
              <p className="text-[11px] text-stone-500">鬧鐘、日程與代辦清單</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 border-b border-stone-200 bg-stone-100/70 p-1 gap-1 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('bossTasks')}
            className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors ${
              activeTab === 'bossTasks'
                ? 'bg-white text-amber-950 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-amber-600" />
            <span>老闆交代 ({bossTasks.filter((t) => t.status === 'pending').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alarms')}
            className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors ${
              activeTab === 'alarms'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
            <span>鬧鐘 ({alarms.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors ${
              activeTab === 'notes'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
            <span>備忘 ({notes.filter((n) => !n.completed).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-colors ${
              activeTab === 'schedule'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>行程 ({schedules.length})</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 0: BOSS TASKS */}
          {activeTab === 'bossTasks' && (
            <div className="space-y-3">
              {/* Privacy Guarantee Banner */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">共用大腦保密防護協議：</span>
                  <p className="text-[11px] text-amber-900/80 mt-0.5">
                    老闆與若妤的閒聊對話余彥佐無法窺探；余彥佐的私密紀錄老闆亦不可見。此處僅統整老闆指定交代之任務與指示重點。
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
                <span>
                  {currentRole === 'boss' ? '您交代給余彥佐的事項清單' : '老闆吩咐傳達之交辦任務'}
                </span>
                <span className="text-[11px]">共 {bossTasks.length} 項</span>
              </div>

              {bossTasks.length === 0 ? (
                <div className="text-center py-10 px-4 bg-white border border-dashed border-stone-200 rounded-2xl space-y-2">
                  <Briefcase className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs text-stone-500 font-medium">目前無任何交辦事項</p>
                  <p className="text-[11px] text-stone-400">
                    {currentRole === 'boss'
                      ? '直接對蘇若妤說：「交代余彥佐明天早上九點去萬巒牽車」，系統會自動總結並登記！'
                      : '老闆有任何吩咐時，蘇若妤會在打開 App 時自動向您總結簡報！'}
                  </p>
                </div>
              ) : (
                bossTasks.map((task) => {
                  const isDone = task.status === 'completed';
                  const isUrgent = task.priority === 'urgent';

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-stone-100/60 border-stone-200 opacity-75'
                          : 'bg-white border-amber-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isUrgent && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              緊急
                            </span>
                          )}
                          <h4
                            className={`text-xs font-bold ${
                              isDone ? 'line-through text-stone-400' : 'text-stone-900'
                            }`}
                          >
                            {task.taskTitle}
                          </h4>
                        </div>

                        {onDeleteBossTask && (
                          <button
                            type="button"
                            onClick={() => onDeleteBossTask(task.id)}
                            className="text-stone-300 hover:text-red-600 p-0.5 transition-colors cursor-pointer"
                            title="刪除此紀錄"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Summary */}
                      <div className="mt-2 text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100 whitespace-pre-wrap leading-relaxed">
                        {task.summary}
                      </div>

                      {/* Footer Info & Action */}
                      <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2 text-stone-400">
                          {task.deadline && (
                            <span className="flex items-center gap-1 text-amber-800 font-medium">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {task.deadline}
                            </span>
                          )}
                          <span>
                            {new Date(task.createdAt).toLocaleDateString([], {
                              month: 'numeric',
                              day: 'numeric',
                            })}{' '}
                            {new Date(task.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {onCompleteBossTask && (
                          <button
                            type="button"
                            disabled={isDone}
                            onClick={() => onCompleteBossTask(task.id)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default'
                                : 'bg-stone-900 hover:bg-stone-800 text-amber-200 shadow-2xs cursor-pointer'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isDone ? '已向老闆回報完成' : '回報執行完畢'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          {/* TAB 1: ALARMS */}
          {activeTab === 'alarms' && (
            <div className="space-y-4">
              {/* Quick Add Alarm Form */}
              <form
                onSubmit={handleCreateAlarm}
                className="p-3.5 bg-white border border-stone-200 rounded-2xl shadow-2xs space-y-2.5"
              >
                <div className="text-xs font-bold text-stone-700 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>手動新增生活鬧鐘</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={newAlarmTime}
                    onChange={(e) => setNewAlarmTime(e.target.value)}
                    required
                    className="p-2 border border-stone-200 rounded-xl text-sm font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="標籤 (例: 吃早餐)"
                    value={newAlarmLabel}
                    onChange={(e) => setNewAlarmLabel(e.target.value)}
                    className="p-2 border border-stone-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                >
                  排入鬧鐘清單
                </button>
              </form>

              {/* Alarms List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-500 px-1">
                  <span>已設定的鬧鐘 ({alarms.length})</span>
                  {alarms.length > 0 && onClearAlarms && (
                    <button
                      type="button"
                      onClick={() => onClearAlarms()}
                      className="text-stone-400 hover:text-red-600 transition-colors font-normal text-[11px] cursor-pointer"
                    >
                      清空全部鬧鐘
                    </button>
                  )}
                </div>
                {alarms.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs bg-white border border-dashed border-stone-200 rounded-2xl">
                    尚未設定任何鬧鐘。你也可以直接跟蘇若妤說：「幫我設早上7點的鬧鐘」
                  </div>
                ) : (
                  alarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <div className="text-xl font-extrabold font-mono text-stone-900 tracking-tight">
                          {alarm.time}
                        </div>
                        <div className="text-xs text-stone-500">{alarm.label}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => playNotificationDing()}
                          className="p-1.5 text-stone-400 hover:text-indigo-600 rounded-lg hover:bg-stone-100"
                          title="試聽聲音"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleAlarm(alarm.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            alarm.enabled ? 'bg-indigo-600' : 'bg-stone-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              alarm.enabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteAlarm(alarm.id)}
                          className="p-1.5 text-stone-300 hover:text-red-600 rounded-lg hover:bg-stone-100 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <form onSubmit={handleCreateNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="記下待辦事項或備忘..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 p-2.5 bg-white border border-stone-200 rounded-xl text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shrink-0"
                >
                  新增
                </button>
              </form>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-500 px-1">
                  <span>待辦與備忘 ({notes.length})</span>
                  {notes.length > 0 && onClearNotes && (
                    <button
                      type="button"
                      onClick={() => onClearNotes()}
                      className="text-stone-400 hover:text-red-600 transition-colors font-normal text-[11px] cursor-pointer"
                    >
                      清空全部備忘
                    </button>
                  )}
                </div>
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-stone-400 text-xs bg-white border border-dashed border-stone-200 rounded-2xl">
                    無備忘事項。可隨時跟蘇若妤說：「幫我記下來明天要買機油」
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleNote(note.id)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            note.completed
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'border-stone-300'
                          }`}
                        >
                          {note.completed && <CheckSquare className="w-3.5 h-3.5" />}
                        </div>
                        <span
                          className={`text-xs truncate ${
                            note.completed ? 'line-through text-stone-400' : 'text-stone-800'
                          }`}
                        >
                          {note.content}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1 text-stone-300 hover:text-red-600 rounded-lg shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500 px-1">
                <span>登記行程 ({schedules.length})</span>
                {schedules.length > 0 && onClearSchedules && (
                  <button
                    type="button"
                    onClick={() => onClearSchedules()}
                    className="text-stone-400 hover:text-red-600 transition-colors font-normal text-[11px] cursor-pointer"
                  >
                    清空全部行程
                  </button>
                )}
              </div>
              {schedules.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs bg-white border border-dashed border-stone-200 rounded-2xl">
                  目前無登記行程。可跟蘇若妤說：「幫我把明天下午2點的會議加到行事曆」
                </div>
              ) : (
                schedules.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-stone-200 rounded-xl space-y-1 shadow-2xs relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-xs text-stone-900">{item.title}</div>
                      <button
                        type="button"
                        onClick={() => onDeleteSchedule(item.id)}
                        className="text-stone-300 hover:text-red-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[11px] text-blue-600 font-mono">
                      {item.date} {item.time || ''}
                    </div>
                    {item.location && (
                      <div className="text-[11px] text-stone-500">地點：{item.location}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-3 border-t border-stone-200 bg-white text-[11px] text-stone-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            蘇若妤全能智慧生活助理
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-600 hover:text-stone-900 font-semibold"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
