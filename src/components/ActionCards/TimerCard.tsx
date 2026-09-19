import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, CheckCircle } from 'lucide-react';
import { SecretaryAction } from '../../types.ts';
import { playTimerDoneSound } from '../../utils/audioAlarm.ts';

interface TimerCardProps {
  action: SecretaryAction;
}

export const TimerCard: React.FC<TimerCardProps> = ({ action }) => {
  const initialSeconds = action.timerSeconds || 180;
  const label = action.label || '計時提醒';

  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            setIsCompleted(true);
            playTimerDoneSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, secondsLeft]);

  const handleToggle = () => {
    if (isCompleted) {
      handleReset();
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setSecondsLeft(initialSeconds);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percent = initialSeconds > 0 ? ((initialSeconds - secondsLeft) / initialSeconds) * 100 : 100;

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-stone-50 to-emerald-500/5 border border-emerald-300/70 shadow-xs max-w-md w-full">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
            <Timer className={`w-4 h-4 ${isRunning ? 'animate-spin-slow' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900">倒數計時器</span>
              {isCompleted ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  時間到！
                </span>
              ) : isRunning ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-medium animate-pulse">
                  計時中
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700 font-medium">
                  已暫停
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-500">{label}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggle}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
              isRunning
                ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
            title={isRunning ? '暫停' : '繼續'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg text-xs text-stone-500 bg-white hover:bg-stone-100 border border-stone-200 transition-colors"
            title="重設"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="bg-white/95 border border-stone-200/90 rounded-xl p-3 mb-2 flex items-center justify-between">
        <span className="text-3xl font-extrabold tracking-tight text-stone-900 font-mono">
          {formatTime(secondsLeft)}
        </span>
        <span className="text-xs text-stone-400">總計 {Math.round(initialSeconds / 60)} 分鐘</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isCompleted ? 'bg-red-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
