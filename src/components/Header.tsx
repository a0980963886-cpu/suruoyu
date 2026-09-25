import React from 'react';
import {
  Volume2,
  VolumeX,
  Trash2,
  ShieldCheck,
  LayoutDashboard,
  Briefcase,
  User,
  LogOut,
  Shield,
  Sparkles,
} from 'lucide-react';
import { UserRole } from '../types.ts';

interface HeaderProps {
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onClearChat: () => void;
  onOpenDashboard: () => void;
  activeAlarmCount?: number;
  currentRole?: UserRole;
  userName?: string;
  pendingBossTaskCount?: number;
  onLogout?: () => void;
  onOpenAdminPanel?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  ttsEnabled,
  onToggleTts,
  onClearChat,
  onOpenDashboard,
  activeAlarmCount = 0,
  currentRole = 'user',
  userName = '',
  pendingBossTaskCount = 0,
  onLogout,
  onOpenAdminPanel,
}) => {
  const isAdmin = currentRole === 'admin';
  const isBoss = currentRole === 'boss' || isAdmin;
  const isGuest = currentRole === 'guest';

  const getRoleBadge = () => {
    switch (currentRole) {
      case 'admin':
        return {
          icon: <Shield className="w-3.5 h-3.5 text-purple-700 shrink-0" />,
          label: '👑 Admin 最高管理',
          className: 'bg-purple-100 text-purple-950 border-purple-300',
        };
      case 'boss':
        return {
          icon: <Briefcase className="w-3.5 h-3.5 text-amber-800 shrink-0" />,
          label: '💼 老闆模式',
          className: 'bg-amber-100/90 text-amber-950 border-amber-300',
        };
      case 'guest':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
          label: '✨ 訪客體驗',
          className: 'bg-amber-50 text-amber-900 border-amber-200',
        };
      case 'user':
      default:
        return {
          icon: <User className="w-3.5 h-3.5 text-stone-700 shrink-0" />,
          label: `👤 同仁 (${userName || '使用者'})`,
          className: 'bg-stone-100 text-stone-800 border-stone-300',
        };
    }
  };

  const badge = getRoleBadge();

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-stone-50/95 backdrop-blur-md px-3 sm:px-4 py-2.5">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Identity - 左上角格子裡面是「蘇」 */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-stone-900 via-stone-800 to-stone-700 flex items-center justify-center text-amber-200 shadow-sm border border-stone-700/30">
              <span className="font-serif font-bold text-lg">蘇</span>
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-stone-50 rounded-full"
              title="若妤在線中"
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base font-semibold text-stone-900 tracking-tight">蘇若妤</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100/70 text-amber-900 border border-amber-200/60">
                <ShieldCheck className="w-3 h-3 text-amber-700" />
                {isAdmin ? '最高管理者專屬秘書' : isBoss ? '總監級商務秘書' : '全能秘書總監'}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200">
                Firestore 共用大腦
              </span>
            </div>
            <p className="text-xs text-stone-500 truncate flex items-center gap-1">
              <span>
                {isAdmin
                  ? '全局掌控 • 權限調整'
                  : isBoss
                  ? '商務決策 • 任務交辦'
                  : '智慧生活與工作小幫手'}
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-stone-400 italic">
                {isAdmin
                  ? '「若妤隨時聽候您的最高指揮」'
                  : isBoss
                  ? '「請老闆隨時指示，若妤隨時兜底」'
                  : '「導航、鬧鐘、日程隨你吩咐」'}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Controls (Identity Badge + Admin + Dashboard + TTS + Clear + Logout) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Identity Fixed Badge */}
          <div
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border shadow-2xs ${badge.className}`}
          >
            {badge.icon}
            <span className="font-semibold text-[11px] sm:text-xs">
              {badge.label}
            </span>
          </div>

          {/* Admin Control Center Button (Only for Admin) */}
          {isAdmin && onOpenAdminPanel && (
            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="開啟系統管理面板"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden md:inline">管理中心</span>
            </button>
          )}

          {/* Pending Tasks Alert Badge */}
          {pendingBossTaskCount > 0 && (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="有待辦任務！"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">交辦任務</span>
              <span>({pendingBossTaskCount})</span>
            </button>
          )}

          {/* Dashboard Button */}
          <button
            type="button"
            id="open-dashboard-btn"
            onClick={onOpenDashboard}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 hover:border-stone-300 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="查看生活小幫手總覽 (鬧鐘/備忘/行程/交辦任務)"
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-600" />
            <span className="hidden md:inline">小幫手</span>
            {activeAlarmCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeAlarmCount}
              </span>
            )}
          </button>

          {/* TTS Toggle */}
          <button
            type="button"
            id="toggle-tts-btn"
            onClick={onToggleTts}
            className={`p-2 rounded-xl text-xs transition-colors border cursor-pointer ${
              ttsEnabled
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-100'
            }`}
            title={ttsEnabled ? '語音朗讀：開啟' : '語音朗讀：關閉'}
          >
            {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Clear chat */}
          <button
            type="button"
            id="clear-chat-btn"
            onClick={onClearChat}
            className="p-2 rounded-xl text-xs text-stone-500 bg-white border border-stone-200 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
            title="清空對話紀錄"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              id="logout-btn"
              onClick={onLogout}
              className="p-2 rounded-xl text-xs text-stone-600 bg-white border border-stone-200 hover:text-stone-900 hover:bg-stone-100 hover:border-stone-300 transition-colors cursor-pointer flex items-center gap-1"
              title={isGuest ? '離開訪客體驗' : '安全登出（廢止憑證）'}
            >
              <LogOut className="w-4 h-4 text-stone-600" />
              <span className="hidden lg:inline text-xs">{isGuest ? '離開體驗' : '登出'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

