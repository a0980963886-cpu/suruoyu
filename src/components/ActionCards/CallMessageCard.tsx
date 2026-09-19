import React, { useState } from 'react';
import { Phone, MessageSquare, Copy, Check, ExternalLink } from 'lucide-react';
import { SecretaryAction } from '../../types.ts';

interface CallMessageCardProps {
  action: SecretaryAction;
}

export const CallMessageCard: React.FC<CallMessageCardProps> = ({ action }) => {
  const [copied, setCopied] = useState(false);
  const isPhone = action.type === 'CALL_PHONE';

  const phoneNumber = action.phoneNumber || '';
  const messageText = action.messageText || '';
  const platform = action.messagePlatform || 'line';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMessagingUrl = () => {
    const encoded = encodeURIComponent(messageText);
    if (platform === 'whatsapp') {
      return `https://api.whatsapp.com/send?text=${encoded}`;
    }
    if (platform === 'sms') {
      return `sms:${phoneNumber}?body=${encoded}`;
    }
    // Default LINE
    return `https://line.me/R/msg/text/?${encoded}`;
  };

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 via-stone-50 to-teal-500/5 border border-teal-200 shadow-xs max-w-md w-full">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-2xs">
          {isPhone ? <Phone className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
        </div>
        <div>
          <span className="text-xs font-bold text-stone-900">
            {isPhone ? '通話連線快捷' : '訊息草稿已就緒'}
          </span>
          <p className="text-[11px] text-stone-500">
            {isPhone ? '點擊按鈕直接撥號' : '蘇若妤已為您擬定訊息'}
          </p>
        </div>
      </div>

      {isPhone ? (
        <div className="space-y-2">
          <div className="bg-white/95 border border-stone-200/90 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-stone-400 font-semibold uppercase">受話號碼</div>
              <div className="text-base font-bold font-mono text-stone-900">{phoneNumber}</div>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(phoneNumber)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              title="複製號碼"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <a
            href={`tel:${phoneNumber}`}
            className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>立即撥打電話 ({phoneNumber})</span>
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-white/95 border border-stone-200/90 rounded-xl p-3">
            <div className="text-[10px] text-stone-400 font-semibold uppercase mb-1">訊息內容</div>
            <div className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap">
              {messageText}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href={getMessagingUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
            >
              <span>在 {platform.toUpperCase()} 開啟發送</span>
              <ExternalLink className="w-3 h-3 text-teal-200" />
            </a>

            <button
              type="button"
              onClick={() => handleCopy(messageText)}
              className="py-2 px-3 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製內容' : '複製內容'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
