import React from 'react';
import { Briefcase, AlertTriangle, ArrowRight, X, Clock } from 'lucide-react';
import { BossTask } from '../types.ts';

interface BossTaskBriefingModalProps {
  tasks: BossTask[];
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (task: BossTask) => void;
}

export const BossTaskBriefingModal: React.FC<BossTaskBriefingModalProps> = ({
  tasks,
  isOpen,
  onClose,
  onAcknowledge,
}) => {
  if (!isOpen || tasks.length === 0) return null;

  const currentTask = tasks[0];
  const isUrgent = currentTask.priority === 'urgent';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-amber-200 shadow-2xl overflow-hidden animate-scale-up">
        {/* Banner Top */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 p-5 text-stone-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-900 flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              蘇
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-amber-300">
                  秘書大腦專屬警報
                </span>
                {isUrgent && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    緊急交辦
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                余彥佐！老闆交代你做事了！
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-stone-600 italic bg-amber-50/70 p-3 rounded-2xl border border-amber-200/60 font-serif leading-relaxed">
            『余彥佐！你終於打開 App 了？老闆剛才透過老娘交代了任務要你立刻處理，老娘已經幫你把重點總結歸納好了，少在那邊裝沒看見，給我認真聽清楚！』
          </div>

          {/* Task Card Box */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span className="font-semibold text-stone-800 flex items-center gap-1.5 text-sm">
                <Briefcase className="w-4 h-4 text-amber-600" />
                {currentTask.taskTitle || '老闆交代事項'}
              </span>
              <span className="text-[11px] font-mono text-stone-400">
                {new Date(currentTask.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-stone-200/80 text-xs text-stone-800 whitespace-pre-wrap leading-relaxed shadow-2xs font-sans">
              {currentTask.summary}
            </div>

            {currentTask.deadline && (
              <div className="text-xs text-amber-800 flex items-center gap-1.5 font-medium pt-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>時限要求：{currentTask.deadline}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <span className="text-[11px] text-stone-400">
            {tasks.length > 1 ? `尚有其他 ${tasks.length - 1} 項待辦` : '已登記於秘書待辦系統'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors"
            >
              稍後再看
            </button>

            <button
              type="button"
              onClick={() => onAcknowledge(currentTask)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-200 font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <span>收到，老娘我看完了</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
