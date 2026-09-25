import React, { useState } from 'react';
import { AuthUser } from '../types';
import { ShieldCheck, Eye, EyeOff, Loader2, AlertCircle, Sparkles, UserPlus, LogIn, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type TabType = 'login' | 'register' | 'guest';

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('請輸入電子信箱與密碼');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '登入失敗，請確認帳號密碼後重試');
      }

      onLoginSuccess({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
        token: data.token,
        tenantId: data.user.tenantId,
        adminCustomSettings: data.user.adminCustomSettings,
      });
    } catch (err: any) {
      setErrorMessage(err.message || '登入發生錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('請輸入電子信箱與密碼');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('密碼長度至少需為 6 個字元');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          displayName: displayName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '註冊失敗，請重試');
      }

      onLoginSuccess({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
        token: data.token,
        tenantId: data.user.tenantId,
        adminCustomSettings: data.user.adminCustomSettings,
      });
    } catch (err: any) {
      setErrorMessage(err.message || '註冊發生錯誤，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestExperience = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '無法進入訪客體驗');
      }

      onLoginSuccess({
        id: data.user.id,
        email: data.user.email,
        role: 'guest',
        name: '訪客體驗者',
        token: data.token,
        tenantId: data.user.tenantId,
      });
    } catch (err: any) {
      setErrorMessage(err.message || '進入訪客體驗發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-stone-950 p-6 text-center text-white relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-serif font-bold text-2xl shadow-inner mb-3">
            蘇
          </div>
          <h2 className="text-xl font-bold font-serif tracking-tight text-stone-100">
            蘇若妤 · 全能 AI 秘書
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            智慧工作秘書系統 · 依帳號自動授權角色權限
          </p>
        </div>

        {/* Triple Action Navigation Bar: 登入 / 註冊 / 訪客體驗 */}
        <div className="flex border-b border-stone-100 bg-stone-50/70 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            帳號登入
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            註冊新帳號
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('guest');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'guest'
                ? 'bg-white text-amber-900 shadow-xs border border-stone-200/80'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            訪客體驗
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          {errorMessage && (
            <div className="p-3.5 mb-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  電子信箱 (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="username"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  登入密碼
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="請輸入密碼"
                    autoComplete="current-password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200/60 rounded-xl text-[11px] text-stone-500 leading-relaxed">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                登入後將由伺服器資料庫權威判斷您的身分角色（admin、boss 或 user）。
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white font-medium text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    驗證中...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    確認登入
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  顯示姓名 / 暱稱
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如：王小明"
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  電子信箱 (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="username"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  設定密碼 (至少 6 個字元)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="請輸入註冊密碼"
                    autoComplete="new-password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200/60 rounded-xl text-[11px] text-stone-500 leading-relaxed">
                新註冊帳號預設為普通使用者身分（user），享有獨立資料儲存與點對點任務交辦功能；管理員可視需要調整為老闆角色。
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-medium text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    註冊建立中...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    立即完成註冊
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'guest' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-800">免註冊立即體驗蘇若妤</h3>
                <p className="text-xs text-stone-500 mt-1.5 leading-relaxed px-4">
                  您可以立即體驗 AI 秘書的智慧對話、生活語音分析與功能互動。訪客模式不會持久儲存雲端資料與正式任務。
                </p>
              </div>

              <div className="p-3.5 bg-stone-50 border border-stone-200/70 rounded-2xl text-left text-xs text-stone-600 space-y-1.5">
                <div className="font-semibold text-stone-700">訪客體驗包含：</div>
                <div className="flex items-center gap-2 text-stone-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  體驗蘇若妤多語言對話與專業秘書氣場
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  體驗鬧鐘、備忘錄、導航與天氣功能模擬
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                  正式交辦任務與雲端持久保存需登入帳號
                </div>
              </div>

              <button
                type="button"
                onClick={handleGuestExperience}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    進入中...
                  </>
                ) : (
                  <>
                    <span>開始訪客體驗</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
