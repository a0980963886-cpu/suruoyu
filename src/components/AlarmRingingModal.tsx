import React, { useEffect } from 'react';
import { BellRing, VolumeX, Clock } from 'lucide-react';
import { startAlarmLoop, stopAlarmLoop } from '../utils/audioAlarm.ts';

interface AlarmRingingModalProps {
  alarmLabel: string;
  alarmTime: string;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
}

export const AlarmRingingModal: React.FC<AlarmRingingModalProps> = ({
  alarmLabel,
  alarmTime,
  onDismiss,
  onSnooze,
}) => {
  useEffect(() => {
    // Start looping alarm chime sound
    startAlarmLoop();

    return () => {
      stopAlarmLoop();
    };
  }, []);

  const handleDismiss = () => {
    stopAlarmLoop();
    onDismiss();
  };

  const handleSnooze = () => {
    stopAlarmLoop();
    onSnooze(5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-amber-300 text-center relative overflow-hidden animate-scale-up">
        {/* Animated background beacon */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-red-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Bell Icon with pulsing ring */}
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 animate-bounce">
          <BellRing className="w-8 h-8 animate-pulse" />
        </div>

        {/* Time display */}
        <div className="text-4xl font-extrabold tracking-tight text-stone-900 font-mono mb-1">
          {alarmTime}
        </div>

        <h3 className="text-lg font-bold text-stone-800 mb-1">⏰ 鬧鐘時間到！</h3>

        <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-2xl mb-5 text-xs text-amber-950 font-serif leading-relaxed">
          <p className="font-bold mb-1">蘇若妤：</p>
          <p className="italic">
            『余彥佐！你那貧瘠的大腦到底睡醒了沒有？現在立刻給老娘睜開眼睛，一秒彈起來！』
          </p>
          <div className="mt-2 text-stone-500 text-[11px] font-sans">
            提醒事項：{alarmLabel || '起床 / 秘書排程'}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <VolumeX className="w-4 h-4 text-amber-400" />
            <span>我清醒了，關閉鬧鐘</span>
          </button>

          <button
            type="button"
            onClick={handleSnooze}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span>再瞇 5 分鐘 (貪睡模式)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
