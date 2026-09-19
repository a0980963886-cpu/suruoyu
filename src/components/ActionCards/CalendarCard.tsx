import React from 'react';
import { Calendar, Download, ExternalLink, MapPin, Clock } from 'lucide-react';
import { SecretaryAction } from '../../types.ts';

interface CalendarCardProps {
  action: SecretaryAction;
}

export const CalendarCard: React.FC<CalendarCardProps> = ({ action }) => {
  const title = action.calendarTitle || '秘書排程行程';
  const dateStr = action.calendarDate || new Date().toISOString().split('T')[0];
  const timeStr = action.calendarTime || '14:00';
  const location = action.calendarLocation || '';

  // Google Calendar URL generator
  const createGoogleCalendarUrl = () => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const start = new Date(`${dateStr}T${timeStr}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration

    const formatGCalDate = (d: Date) =>
      d.toISOString().replace(/-|:|\.\d+/g, '');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatGCalDate(start)}/${formatGCalDate(end)}`,
      details: '由蘇若妤秘書總監為您規劃之專屬行程。',
      location: location,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // Download .ics file
  const handleDownloadIcs = () => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const start = new Date(`${dateStr}T${timeStr}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const formatIcsDate = (d: Date) =>
      d.toISOString().replace(/-|:|\.\d+/g, '');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Su Ruoyu Assistant//TW',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:由蘇若妤秘書為您規劃之行程`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 via-stone-50 to-blue-500/5 border border-blue-200 shadow-xs max-w-md w-full">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-2xs">
          <Calendar className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-stone-900">行事曆排程已就緒</span>
          <p className="text-[11px] text-stone-500">蘇若妤已為您整理好行程時間與地點</p>
        </div>
      </div>

      <div className="bg-white/95 border border-stone-200/90 rounded-xl p-3 mb-3 space-y-1.5">
        <div className="text-sm font-bold text-stone-900">{title}</div>
        <div className="flex items-center gap-3 text-xs text-stone-600">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            {dateStr} {timeStr}
          </span>
          {location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              {location}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          onClick={() => window.open(createGoogleCalendarUrl(), '_blank')}
          className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
        >
          <span>加入 Google 行事曆</span>
          <ExternalLink className="w-3 h-3 text-blue-200" />
        </button>

        <button
          type="button"
          onClick={handleDownloadIcs}
          className="py-2 px-3 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-stone-500" />
          <span>下載 .ics (蘋果/Outlook)</span>
        </button>
      </div>
    </div>
  );
};
