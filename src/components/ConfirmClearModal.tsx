import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}

export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '清空所有對話紀錄？',
  description = '此操作將清除您與蘇若妤的所有對話訊息與紀錄，並重置為初始對話狀態。此動作無法復原。',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-center relative overflow-hidden animate-scale-up">
        {/* Close icon */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon */}
        <div className="mx-auto mb-3.5 w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shadow-xs">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-stone-900 mb-2">{title}</h3>
        <p className="text-xs text-stone-500 leading-relaxed mb-6 px-1">
          {description}
        </p>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>確定清空</span>
          </button>
        </div>
      </div>
    </div>
  );
};
