import React, { useState } from 'react';
import { Bell, BellRing, Volume2, CheckCircle2 } from 'lucide-react';
import { SecretaryAction } from '../../types.ts';
import { playNotificationDing } from '../../utils/audioAlarm.ts';

interface AlarmCardProps {
  action: SecretaryAction;
  onToggleEnabled?: (time: string) => void;
}

export const AlarmCard: React.FC<AlarmCardProps> = ({ action }) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [isTestingSound, setIsTestingSound] = useState(false);

  const time = action.alarmTime || '07:00';
  const label = action.label || '起床 / 秘書提醒';

  const handleTestSound = () => {
    setIsTestingSound(true);
    playNotificationDing();
    setTimeout(() => setIsTestingSound(false), 800);
  };

  // Calculate approximate countdown to alarm time
  const getNextAlarmDescription = () => {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    const diffMs = target.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours === 0) {
      return `約 ${diffMins} 分鐘後響鈴`;
    }
    return `約 ${diffHours} 小時 ${diffMins} 分鐘後響鈴`;
  };

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-stone-50 to-indigo-500/5 border border-indigo-200/80 shadow-xs max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs">
            {isEnabled ? <BellRing className="w-4 h-4 animate-bounce" /> : <Bell className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900">鬧鐘設定完成</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-medium">
                <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                已排程啟用
              </span>
            </div>
            <p className="text-[11px] text-stone-500">{label}</p>
          </div>
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          onClick={() => setIsEnabled(!isEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isEnabled ? 'bg-indigo-600' : 'bg-stone-300'
          }`}
          title={isEnabled ? '關閉鬧鐘' : '開啟鬧鐘'}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Big Digital Clock Display */}
      <div className="bg-white/95 border border-stone-200/90 rounded-xl p-3 mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-stone-900 font-mono">
            {time}
          </span>
          <span className="text-xs font-medium text-stone-400">24H 每日重複</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-indigo-600 block">
            {isEnabled ? getNextAlarmDescription() : '已停用'}
          </span>
          <span className="text-[10px] text-stone-400">合成電子鈴聲提醒</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleTestSound}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <Volume2 className={`w-3.5 h-3.5 ${isTestingSound ? 'text-indigo-600 animate-pulse' : ''}`} />
          <span>{isTestingSound ? '鈴聲測試中...' : '試聽鬧鐘鈴聲'}</span>
        </button>
      </div>
    </div>
  );
};
