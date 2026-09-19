import React, { useState } from 'react';
import { CheckSquare, Square, Check, Copy, ClipboardList } from 'lucide-react';
import { SecretaryAction } from '../../types.ts';

interface NoteCardProps {
  action: SecretaryAction;
}

export const NoteCard: React.FC<NoteCardProps> = ({ action }) => {
  const [completed, setCompleted] = useState(false);
  const [copied, setCopied] = useState(false);
  const content = action.noteContent || '備忘事項';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 via-stone-50 to-purple-500/5 border border-purple-200 shadow-xs max-w-md w-full">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-2xs">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-900">秘書備忘清單已記下</span>
            <p className="text-[11px] text-stone-500">已自動同步至你的生活備忘錄</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200/50 transition-colors"
          title="複製備忘錄"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div
        onClick={() => setCompleted(!completed)}
        className={`cursor-pointer bg-white/95 border rounded-xl p-3 flex items-start gap-2.5 transition-colors ${
          completed ? 'border-purple-200 bg-purple-50/40' : 'border-stone-200/90 hover:border-stone-300'
        }`}
      >
        <button
          type="button"
          className="mt-0.5 text-purple-600 focus:outline-none"
        >
          {completed ? (
            <CheckSquare className="w-4 h-4 text-purple-600" />
          ) : (
            <Square className="w-4 h-4 text-stone-400" />
          )}
        </button>
        <div className="flex-1 text-xs">
          <p className={`font-medium ${completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
            {content}
          </p>
          <span className="text-[10px] text-stone-400 mt-1 block">
            {completed ? '✓ 已標示完成' : '點擊方框可打勾完成'}
          </span>
        </div>
      </div>
    </div>
  );
};
