import React from 'react';
import { Briefcase, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SecretaryAction } from '../../types.ts';

interface BossTaskCardProps {
  action: SecretaryAction;
  onMarkComplete?: (taskId: string) => void;
  isCompleted?: boolean;
}

export const BossTaskCard: React.FC<BossTaskCardProps> = ({
  action,
  onMarkComplete,
  isCompleted = false,
}) => {
  const isUrgent = action.taskPriority === 'urgent';

  return (
    <div className="mt-2.5 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-amber-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-2xs">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
              共用大腦 • 老闆指示交代
            </span>
            <h4 className="text-sm font-bold text-stone-900 tracking-tight">
              {action.taskTitle || '老闆交辦事項'}
            </h4>
          </div>
        </div>

        {isUrgent ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            緊急交辦
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200/80">
            交辦任務
          </span>
        )}
      </div>

      {/* Summary Content */}
      <div className="mt-3 space-y-2 text-xs text-stone-800 leading-relaxed">
        <div className="font-semibold text-stone-700 flex items-center gap-1">
          <span>📋 蘇若妤為您整理之執行總結：</span>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-amber-100 font-sans whitespace-pre-wrap text-stone-800 shadow-2xs">
          {action.taskSummary || '無詳細說明'}
        </div>
      </div>

      {/* Footer Info & Action */}
      <div className="mt-3 pt-2.5 border-t border-amber-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {action.taskDeadline ? (
          <div className="flex items-center gap-1 text-amber-800 font-medium">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>時限：{action.taskDeadline}</span>
          </div>
        ) : (
          <span className="text-stone-400">若妤系統已登記於待辦追蹤</span>
        )}

        {action.delegatedTaskId && onMarkComplete && (
          <button
            type="button"
            disabled={isCompleted}
            onClick={() => onMarkComplete(action.delegatedTaskId!)}
            className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default'
                : 'bg-stone-900 hover:bg-stone-800 text-amber-200 border border-stone-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isCompleted ? '已向老闆回報完成' : '回報執行完畢'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
