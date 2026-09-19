import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { Volume2, Copy, Check, User, FileText, File, Trash2, Briefcase } from 'lucide-react';
import { ChatMessage, UserRole } from '../types.ts';
import { VoiceAnalysisCard } from './VoiceAnalysisCard.tsx';
import { NavigationCard } from './ActionCards/NavigationCard.tsx';
import { AlarmCard } from './ActionCards/AlarmCard.tsx';
import { TimerCard } from './ActionCards/TimerCard.tsx';
import { CalendarCard } from './ActionCards/CalendarCard.tsx';
import { CallMessageCard } from './ActionCards/CallMessageCard.tsx';
import { NoteCard } from './ActionCards/NoteCard.tsx';
import { WeatherCard } from './ActionCards/WeatherCard.tsx';
import { BossTaskCard } from './ActionCards/BossTaskCard.tsx';

interface MessageItemProps {
  message: ChatMessage;
  currentUserRole?: UserRole;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  onStopSpeak?: () => void;
  onDelete?: (id: string) => void;
  onCompleteTask?: (taskId: string) => void;
  completedTaskIds?: string[];
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUserRole = 'employee',
  onSpeak,
  isSpeaking = false,
  onStopSpeak,
  onDelete,
  onCompleteTask,
  completedTaskIds = [],
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to format stage directions in Su Ruoyu's replies
  const renderAssistantContent = (text: string) => {
    const parts = text.split(/(\([^)]*\)|（[^）]*）)/g);

    return (
      <div className="space-y-2">
        {parts.map((part, idx) => {
          if (!part) return null;
          const isStageDirection =
            (part.startsWith('(') && part.endsWith(')')) ||
            (part.startsWith('（') && part.endsWith('）'));

          if (isStageDirection) {
            return (
              <div
                key={idx}
                className="text-stone-500 font-serif italic text-xs py-1 px-2.5 rounded-lg bg-stone-100/70 border border-stone-200/50"
              >
                {part}
              </div>
            );
          }

          return (
            <div
              key={idx}
              className="prose prose-stone prose-sm max-w-none text-stone-800 leading-relaxed font-sans"
            >
              <Markdown>{part}</Markdown>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`py-3 px-2 sm:px-4 flex gap-3 transition-opacity group ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar - 蘇 */}
      <div className="shrink-0 mt-0.5">
        {isUser ? (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs shadow-2xs border ${
              currentUserRole === 'boss'
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : currentUserRole === 'guest'
                ? 'bg-blue-100 border-blue-300 text-blue-900'
                : 'bg-stone-200 border-stone-300 text-stone-600'
            }`}
          >
            {currentUserRole === 'boss' ? (
              <Briefcase className="w-4 h-4" />
            ) : currentUserRole === 'guest' ? (
              <User className="w-4 h-4 text-blue-700" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-200 font-serif font-bold text-sm shadow-2xs">
            蘇
          </div>
        )}
      </div>

      {/* Bubble Container */}
      <div
        className={`max-w-[85%] sm:max-w-[78%] flex flex-col ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {/* Name / Role */}
        <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-stone-500">
          <span className="font-medium">
            {isUser
              ? currentUserRole === 'boss'
                ? '老闆 (你)'
                : currentUserRole === 'guest'
                ? '訪客 (你)'
                : '余彥佐 (你)'
              : '蘇若妤'}
          </span>
          <span className="text-stone-300">•</span>
          <span>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {/* Delete this single message */}
          {onDelete && message.id !== 'init-msg' && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition-opacity p-0.5 ml-1"
              title="刪除此則訊息"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Attached file preview if user uploaded a file */}
        {message.attachedFile && (
          <div className="mb-2 p-2 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center gap-2.5 max-w-sm">
            {message.attachedFile.type.startsWith('image/') && message.attachedFile.previewUrl ? (
              <img
                src={message.attachedFile.previewUrl}
                alt={message.attachedFile.name}
                className="w-12 h-12 rounded-xl object-cover border border-stone-200"
              />
            ) : message.attachedFile.type.startsWith('audio/') && message.attachedFile.previewUrl ? (
              <audio
                src={message.attachedFile.previewUrl}
                controls
                className="h-8 max-w-[220px] accent-amber-600"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                {message.attachedFile.type === 'application/pdf' ? (
                  <FileText className="w-4 h-4 text-red-600" />
                ) : (
                  <File className="w-4 h-4 text-stone-600" />
                )}
              </div>
            )}

            <div className="min-w-0 pr-1">
              <span className="text-xs font-medium text-stone-800 truncate block">
                {message.attachedFile.name}
              </span>
              <span className="text-[10px] text-stone-400 block">
                {message.attachedFile.type || '檔案'}
              </span>
            </div>
          </div>
        )}

        {/* Message Bubble (Only render if there is actual message text) */}
        {message.content && message.content.trim().length > 0 && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm shadow-2xs ${
              isUser
                ? 'bg-stone-900 text-stone-50 rounded-tr-xs'
                : 'bg-white border border-stone-200/90 text-stone-800 rounded-tl-xs'
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
            ) : (
              renderAssistantContent(message.content)
            )}
          </div>
        )}

        {/* Secretary Action Card Rendering */}
        {!isUser && message.action && message.action.type !== 'NONE' && (
          <div className="w-full">
            {message.action.type === 'NAVIGATE' && (
              <NavigationCard action={message.action} />
            )}
            {message.action.type === 'SET_ALARM' && (
              <AlarmCard action={message.action} />
            )}
            {message.action.type === 'SET_TIMER' && (
              <TimerCard action={message.action} />
            )}
            {message.action.type === 'ADD_CALENDAR' && (
              <CalendarCard action={message.action} />
            )}
            {(message.action.type === 'CALL_PHONE' || message.action.type === 'SEND_MESSAGE') && (
              <CallMessageCard action={message.action} />
            )}
            {message.action.type === 'ADD_NOTE' && (
              <NoteCard action={message.action} />
            )}
            {message.action.type === 'CHECK_WEATHER' && (
              <WeatherCard action={message.action} />
            )}
            {message.action.type === 'DELEGATE_TASK' && (
              <BossTaskCard
                action={message.action}
                onMarkComplete={onCompleteTask}
                isCompleted={
                  message.action.delegatedTaskId
                    ? completedTaskIds.includes(message.action.delegatedTaskId)
                    : false
                }
              />
            )}
          </div>
        )}

        {/* Voice Analysis Report if available */}
        {message.voiceAnalysis && (
          <div className="w-full">
            <VoiceAnalysisCard data={message.voiceAnalysis} />
          </div>
        )}

        {/* Assistant Action Bar (Copy, TTS) */}
        {!isUser && message.content && (
          <div className="flex items-center gap-1.5 mt-1.5 px-1 text-stone-400 text-xs">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded-lg hover:text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1 text-[11px]"
              title="複製回覆內容"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">已複製</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>複製</span>
                </>
              )}
            </button>

            {onSpeak && (
              <button
                type="button"
                onClick={() => (isSpeaking ? onStopSpeak?.() : onSpeak(message.content))}
                className={`p-1 rounded-lg transition-colors flex items-center gap-1 text-[11px] ${
                  isSpeaking
                    ? 'text-amber-600 font-medium'
                    : 'hover:text-stone-700 hover:bg-stone-100'
                }`}
                title={isSpeaking ? '停止朗讀' : '由語音朗讀'}
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                <span>{isSpeaking ? '朗讀中' : '朗讀'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
