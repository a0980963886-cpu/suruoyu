import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  X,
  FileText,
  FileCode,
  Image as ImageIcon,
  Volume2,
  File,
  Mic,
  Square,
  Camera,
  FolderOpen
} from 'lucide-react';
import { AttachedFile } from '../types.ts';

interface ChatInputProps {
  onSendMessage: (
    text: string,
    file?: AttachedFile
  ) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Close attach menu when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachMenu]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        160
      )}px`;
    }
  }, [inputText]);

  // Universal file processor
  const processFile = (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('檔案大小請勿超過 25MB');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    const isTextReadable = 
      file.type.startsWith('text/') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.js') ||
      file.name.endsWith('.ts') ||
      file.name.endsWith('.html') ||
      file.name.endsWith('.css') ||
      file.name.endsWith('.py') ||
      file.name.endsWith('.sql');

    if (isTextReadable) {
      const textReader = new FileReader();
      textReader.onload = () => {
        const textContent = textReader.result as string;
        const base64Reader = new FileReader();
        base64Reader.onloadend = () => {
          const base64data = base64Reader.result as string;
          const base64Clean = base64data.split(',')[1];
          setAttachedFile({
            name: file.name,
            type: file.type || 'text/plain',
            size: file.size,
            data: base64Clean,
            previewUrl,
            textContent,
          });
        };
        base64Reader.readAsDataURL(file);
      };
      textReader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        const base64Clean = base64data.split(',')[1];
        let mimeType = file.type;
        if (!mimeType) {
          if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
          else if (file.name.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          else mimeType = 'application/octet-stream';
        }
        setAttachedFile({
          name: file.name,
          type: mimeType,
          size: file.size,
          data: base64Clean,
          previewUrl,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
    setShowAttachMenu(false);
  };

  // Start audio recording (microphone)
  const startRecording = async () => {
    setShowAttachMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const previewUrl = URL.createObjectURL(audioBlob);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64Clean = base64data.split(',')[1];
          setAttachedFile({
            name: `語音錄音_${new Date().toLocaleTimeString().replace(/:/g, '-')}.webm`,
            type: mimeType,
            size: audioBlob.size,
            data: base64Clean,
            previewUrl,
          });
        };
        reader.readAsDataURL(audioBlob);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      alert('無法存取麥克風，請檢查瀏覽器麥克風權限設定。');
    }
  };

  // Stop recording and attach audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      audioChunksRef.current = [];
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLoading) return;

    const trimmed = inputText.trim();
    if (!trimmed && !attachedFile) return;

    onSendMessage(trimmed, attachedFile || undefined);

    setInputText('');
    setAttachedFile(null);
    setShowAttachMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (file: AttachedFile) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-sky-600" />;
    if (file.type.startsWith('audio/')) return <Volume2 className="w-4 h-4 text-amber-600" />;
    if (file.type === 'application/pdf') return <FileText className="w-4 h-4 text-red-600" />;
    if (file.type.includes('code') || file.name.endsWith('.js') || file.name.endsWith('.ts')) {
      return <FileCode className="w-4 h-4 text-indigo-600" />;
    }
    return <File className="w-4 h-4 text-stone-600" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 pb-4 pt-2 relative">
      {/* Hidden File Inputs */}
      {/* 1. Universal files (PDF, images, documents, all files) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        id="universal-file-picker"
      />

      {/* 2. Direct camera / photo capture */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileInputChange}
        accept="image/*"
        capture="environment"
        className="hidden"
        id="camera-file-picker"
      />

      {/* Attached File Preview Bar */}
      {attachedFile && (
        <div className="mb-2 p-2.5 rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-between gap-2 max-w-lg mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            {attachedFile.type.startsWith('image/') && attachedFile.previewUrl ? (
              <img
                src={attachedFile.previewUrl}
                alt={attachedFile.name}
                className="w-10 h-10 rounded-xl object-cover border border-stone-200"
              />
            ) : attachedFile.type.startsWith('audio/') && attachedFile.previewUrl ? (
              <div className="flex items-center gap-2">
                <audio
                  src={attachedFile.previewUrl}
                  controls
                  className="h-8 max-w-[200px] accent-amber-600"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                {getFileIcon(attachedFile)}
              </div>
            )}

            <div className="min-w-0">
              <span className="text-xs font-medium text-stone-800 truncate block">
                {attachedFile.name}
              </span>
              <span className="text-[11px] text-stone-400 block">
                {formatFileSize(attachedFile.size)} • {attachedFile.type || '檔案'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            title="移除此檔案"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Recording State UI */}
      {isRecording ? (
        <div className="rounded-3xl bg-amber-50/90 border border-amber-300 p-3 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-medium text-amber-900">正在錄音中</span>
            <span className="text-xs font-mono font-bold text-amber-950 bg-amber-200/70 px-2 py-0.5 rounded-md">
              {formatSeconds(recordingSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 hover:bg-amber-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-3.5 py-1.5 text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>錄製完成</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard Floating Input Box */
        <div className="relative rounded-3xl bg-white border border-stone-300/80 shadow-sm focus-within:border-stone-500 focus-within:shadow-md transition-all">
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Input Field - 保持空白無任何預設字 */}
            <div className="flex items-end px-4 pt-3 pb-2 gap-2">
              <textarea
                ref={textareaRef}
                id="chat-user-input"
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
                className="w-full resize-none bg-transparent text-sm text-stone-900 placeholder:text-transparent focus:outline-none max-h-36 py-1 leading-relaxed"
              />

              {/* Send Button */}
              <button
                type="submit"
                id="send-message-btn"
                disabled={isLoading || (!inputText.trim() && !attachedFile)}
                className={`p-2 rounded-2xl transition-all shrink-0 ${
                  inputText.trim() || attachedFile
                    ? 'bg-stone-900 hover:bg-stone-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                }`}
                title="送出"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-stone-100 text-stone-500 text-xs relative">
              <div className="flex items-center gap-1" ref={menuRef}>
                {/* 迴紋針按鈕：點開選單 */}
                <button
                  type="button"
                  id="toggle-attach-menu-btn"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className={`p-1.5 rounded-xl transition-colors flex items-center gap-1 text-xs ${
                    showAttachMenu
                      ? 'bg-stone-200 text-stone-900'
                      : 'hover:text-stone-900 hover:bg-stone-100 text-stone-600'
                  }`}
                  title="選擇附件或錄音"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* 迴紋針點開後的選單：包含相機、麥克風錄音、文件檔案 */}
                {showAttachMenu && (
                  <div className="absolute bottom-full left-3 mb-2 w-52 bg-white rounded-2xl shadow-xl border border-stone-200 p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    {/* 選項 1: 麥克風（我講什麼就會錄起來給蘇若妤聽） */}
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-800 hover:bg-amber-50 hover:text-amber-900 rounded-xl transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">錄製語音</span>
                        <span className="text-[10px] text-stone-400">講話錄音給蘇若妤聽</span>
                      </div>
                    </button>

                    {/* 選項 2: 照相機（拍照或上傳圖片） */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        cameraInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-800 hover:bg-sky-50 hover:text-sky-900 rounded-xl transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">拍照 / 圖片</span>
                        <span className="text-[10px] text-stone-400">拍攝相片或選擇圖片</span>
                      </div>
                    </button>

                    {/* 選項 3: 文件與各類檔案 (PDF, 合約, 文件等) */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-stone-800 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">文件與檔案</span>
                        <span className="text-[10px] text-stone-400">PDF、合約、任何檔案</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-stone-400">
                <span className="hidden sm:inline">按 Enter 送出</span>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
