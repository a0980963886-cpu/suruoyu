import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Mic, Gauge, Brain, FileText, CheckCircle2 } from 'lucide-react';
import { VoiceAnalysisData } from '../types.ts';

interface VoiceAnalysisCardProps {
  data: VoiceAnalysisData;
}

export const VoiceAnalysisCard: React.FC<VoiceAnalysisCardProps> = ({ data }) => {
  const [expanded, setExpanded] = useState<boolean>(true);

  return (
    <div className="mt-3 rounded-2xl border border-amber-200/80 bg-amber-50/50 overflow-hidden text-stone-800 text-xs shadow-xs">
      {/* Header Summary */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 bg-amber-100/40 hover:bg-amber-100/70 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 font-semibold text-amber-900">
            <Mic className="w-3.5 h-3.5 text-amber-700" />
            聲學與多語言語音診斷
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/80 border border-amber-200 text-[11px] text-amber-800 font-medium">
            {data.language || '偵測語言'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-200/70 text-[11px] text-amber-900 font-medium">
            語氣：{data.tone || '無特殊特徵'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-stone-500 text-[11px]">
          <span>{expanded ? '收合報告' : '展開報告'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-3.5 space-y-3">
          {/* Transcript */}
          {data.transcript && (
            <div className="bg-white/80 rounded-xl p-2.5 border border-stone-200/60">
              <div className="flex items-center gap-1.5 text-stone-500 font-medium mb-1">
                <FileText className="w-3 h-3 text-stone-400" />
                <span>精確轉錄逐字稿：</span>
              </div>
              <p className="text-stone-800 text-xs leading-relaxed font-mono select-text bg-stone-50/80 p-2 rounded-lg border border-stone-100">
                "{data.transcript}"
              </p>
            </div>
          )}

          {/* Metric Badges */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/90 p-2.5 rounded-xl border border-stone-200/60 flex items-start gap-2">
              <Gauge className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] text-stone-500 block">語速與節奏表現</span>
                <span className="font-medium text-stone-800 text-xs">{data.speed}</span>
              </div>
            </div>

            <div className="bg-white/90 p-2.5 rounded-xl border border-stone-200/60 flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] text-stone-500 block">底氣與咬字清晰度</span>
                <span className="font-medium text-stone-800 text-xs">{data.confidenceOrClarity}</span>
              </div>
            </div>
          </div>

          {/* Key Observations */}
          {data.keyObservations && data.keyObservations.length > 0 && (
            <div>
              <span className="text-[11px] font-medium text-stone-500 block mb-1">
                聲學特徵觀察：
              </span>
              <ul className="space-y-1">
                {data.keyObservations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-stone-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span>{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Su Ruoyu's Sarcastic Diagnosis */}
          {data.suDiagnosis && (
            <div className="border-t border-amber-200/60 pt-2.5 mt-2">
              <div className="flex items-center gap-1.5 text-amber-900 font-semibold mb-1">
                <Brain className="w-3.5 h-3.5 text-amber-700" />
                <span>秘書總監聽音點評：</span>
              </div>
              <p className="text-stone-700 leading-relaxed italic bg-amber-100/30 p-2 rounded-lg border border-amber-200/40">
                {data.suDiagnosis}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
