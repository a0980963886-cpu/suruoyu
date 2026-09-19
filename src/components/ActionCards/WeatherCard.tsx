import React from 'react';
import { CloudSun, Umbrella, Wind, Thermometer, ExternalLink } from 'lucide-react';
import { SecretaryAction } from '../../types.ts';

interface WeatherCardProps {
  action: SecretaryAction;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ action }) => {
  const location = action.weatherLocation || '當地地區';
  const weatherSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    `${location} 天氣`
  )}`;

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-stone-50 to-sky-500/5 border border-sky-200 shadow-xs max-w-md w-full">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-2xs">
            <CloudSun className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-900">天氣與出門指南</span>
            <p className="text-[11px] text-stone-500">{location} 氣象概況</p>
          </div>
        </div>

        <a
          href={weatherSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200/50 transition-colors"
          title="在 Google 查看詳細氣象雷達"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="bg-white/95 border border-stone-200/90 rounded-xl p-3 mb-2.5 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-stone-500">{location}</div>
          <div className="text-xl font-bold text-stone-900 flex items-center gap-1.5 mt-0.5">
            <Thermometer className="w-4 h-4 text-sky-600" />
            <span>28°C ~ 32°C</span>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
            多雲時晴 / 局部雷陣雨
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 mb-2">
        <div className="bg-stone-50/80 border border-stone-200/60 rounded-lg p-2 flex items-center gap-2">
          <Umbrella className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>降雨機率 30% 建議備折傘</span>
        </div>
        <div className="bg-stone-50/80 border border-stone-200/60 rounded-lg p-2 flex items-center gap-2">
          <Wind className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          <span>微風舒適、注意防曬</span>
        </div>
      </div>

      <a
        href={weatherSearchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-1.5 px-3 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
      >
        <span>查看中央氣象署完整預報</span>
        <ExternalLink className="w-3 h-3 text-stone-400" />
      </a>
    </div>
  );
};
