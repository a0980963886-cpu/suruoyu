import React, { useState } from 'react';
import { Navigation, ExternalLink, MapPin, Copy, Check, Compass } from 'lucide-react';
import { SecretaryAction } from '../../types.ts';

interface NavigationCardProps {
  action: SecretaryAction;
}

export const NavigationCard: React.FC<NavigationCardProps> = ({ action }) => {
  const [copied, setCopied] = useState(false);
  const destination = action.destination || '目的地';

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination
  )}`;
  const appleMapsUrl = `https://maps.apple.com/?daddr=${encodeURIComponent(destination)}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;

  const handleCopy = () => {
    navigator.clipboard.writeText(destination);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenNav = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-stone-50 to-amber-500/5 border border-amber-300/60 shadow-xs max-w-md w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-2xs">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900">手機導航已就緒</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                自動定位支援
              </span>
            </div>
            <p className="text-[11px] text-stone-500">蘇若妤已為您設定好目的地</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200/50 transition-colors"
          title="複製目的地"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Destination display */}
      <div className="bg-white/90 border border-stone-200/80 rounded-xl p-3 mb-3 flex items-center gap-2.5">
        <MapPin className="w-5 h-5 text-red-500 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase font-semibold tracking-wider text-stone-400">
            目的地 (Destination)
          </div>
          <div className="text-sm font-bold text-stone-900 truncate">{destination}</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Main Google Maps Button */}
        <button
          type="button"
          onClick={() => handleOpenNav(googleMapsUrl)}
          className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Navigation className="w-4 h-4 text-amber-400" />
          <span>立即啟動手機導航 (Google Maps)</span>
          <ExternalLink className="w-3 h-3 text-stone-400" />
        </button>

        {/* Alternative Navigators */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => handleOpenNav(appleMapsUrl)}
            className="py-1.5 px-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <span>🍎 Apple 地圖導航</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenNav(wazeUrl)}
            className="py-1.5 px-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <span>🚗 Waze 即時路況</span>
          </button>
        </div>
      </div>
    </div>
  );
};
