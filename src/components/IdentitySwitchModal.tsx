import React, { useState } from 'react';
import {
  User,
  Briefcase,
  Users,
  Copy,
  Check,
  X,
  Share2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { UserRole } from '../types.ts';

interface IdentitySwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
}

export const IdentitySwitchModal: React.FC<IdentitySwitchModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onSelectRole,
}) => {
  const [copiedRole, setCopiedRole] = useState<string | null>(null);

  if (!isOpen) return null;

  const getShareUrl = (role: UserRole) => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('role', role);
      return url.toString();
    } catch (e) {
      return `${window.location.origin}/?role=${role}`;
    }
  };

  const handleCopyLink = (role: UserRole, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = getShareUrl(role);
    navigator.clipboard.writeText(link);
    setCopiedRole(role);
    setTimeout(() => setCopiedRole(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-100 text-amber-900">
                <Share2 className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-stone-900">
                蘇若妤身分辨識與切換
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              蘇若妤會根據當前身分調整對話語氣、稱謂與權限。你可以即時切換身分，或直接複製專屬連結給對方使用。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles List */}
        <div className="py-4 space-y-3 overflow-y-auto flex-1">
          {/* Role 1: 余彥佐 (本人) */}
          <div
            onClick={() => {
              onSelectRole('employee');
              onClose();
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
              currentRole === 'employee'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
                : 'bg-white border-stone-200 hover:border-amber-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    currentRole === 'employee'
                      ? 'bg-stone-900 text-amber-200'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-stone-900">余彥佐 (本人)</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                      專屬生活秘書
                    </span>
                    {currentRole === 'employee' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 使用中
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    蘇若妤毒舌嘴賤但超高效，為你打理導航、鬧鐘、日程、備忘，督促你生活自理。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between gap-2 text-xs">
              <span className="text-stone-400 text-[11px]">專屬網址參數：?role=employee</span>
              <button
                type="button"
                onClick={(e) => handleCopyLink('employee', e)}
                className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedRole === 'employee' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">已複製連結</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>複製本人連結</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Role 2: 老闆 (總裁) */}
          <div
            onClick={() => {
              onSelectRole('boss');
              onClose();
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
              currentRole === 'boss'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
                : 'bg-white border-stone-200 hover:border-amber-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    currentRole === 'boss'
                      ? 'bg-amber-700 text-amber-100'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-stone-900">公司老闆 (總裁)</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium">
                      商務總監兜底
                    </span>
                    {currentRole === 'boss' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 使用中
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    蘇若妤稱呼您為「老闆」，言行幹練端莊；您交代的吩咐會自動總結成任務，余彥佐打開 App 時若妤會當面督促他去辦！
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between gap-2 text-xs">
              <span className="text-amber-800/70 text-[11px]">給老闆專用連結（不串通私人對話）</span>
              <button
                type="button"
                onClick={(e) => handleCopyLink('boss', e)}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                {copiedRole === 'boss' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span className="font-bold">已複製老闆連結！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-100" />
                    <span>複製老闆專屬網址</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Role 3: 訪客 / 其他人 */}
          <div
            onClick={() => {
              onSelectRole('guest');
              onClose();
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
              currentRole === 'guest'
                ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-400/30'
                : 'bg-white border-stone-200 hover:border-blue-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    currentRole === 'guest'
                      ? 'bg-blue-700 text-blue-100'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-stone-900">訪客 / 朋友 / 其他人</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-medium">
                      禮貌接待
                    </span>
                    {currentRole === 'guest' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> 使用中
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                    絕不叫錯名字成「余彥佐」，亦不使用粗俗毒舌詞彙。禮貌稱呼「貴賓」或尊姓，可代為記錄留言轉告給余彥佐。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-blue-200/60 flex items-center justify-between gap-2 text-xs">
              <span className="text-blue-800/70 text-[11px]">給其他人用（絕不洩露隱私）</span>
              <button
                type="button"
                onClick={(e) => handleCopyLink('guest', e)}
                className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedRole === 'guest' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">已複製訪客連結</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-blue-500" />
                    <span>複製訪客專屬網址</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tip footer */}
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-500 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-stone-700">獨立隱私保護：</strong>
            每個身分模式的聊天紀錄皆相互獨立隔離。把老闆連結傳給老闆使用時，老闆不會看到你平時被蘇若妤吐槽的對話內容！
          </p>
        </div>
      </div>
    </div>
  );
};
