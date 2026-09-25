import React, { useState, useEffect } from 'react';
import { AuthUser, UserRole } from '../types.ts';
import {
  Users,
  Shield,
  Briefcase,
  User,
  Sparkles,
  Ban,
  CheckCircle,
  Save,
  Loader2,
  AlertCircle,
  Settings,
  X,
} from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
}

interface TenantUserItem {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  isSuspended: boolean;
  tokenVersion: number;
  createdAt: number;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<TenantUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Custom Settings State
  const [customCallName, setCustomCallName] = useState(
    currentUser.adminCustomSettings?.customCallName || '創辦人'
  );
  const [customTonePrompt, setCustomTonePrompt] = useState(
    currentUser.adminCustomSettings?.customTonePrompt || ''
  );
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser.role === 'admin') {
      fetchUsers();
    }
  }, [isOpen, currentUser.role]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '無法取得帳號列表');
      }
      setUsers(data.users || []);
    } catch (err: any) {
      setErrorMessage(err.message || '載入使用者列表失敗');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ targetUserId, newRole }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '角色變更失敗');
      }
      setSuccessMessage('權限角色已成功更新，且已強制該帳號之舊 Token 即時失效');
      fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || '變更失敗');
    }
  };

  const handleToggleSuspend = async (targetUserId: string, currentSuspendStatus: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/admin/toggle-suspend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ targetUserId, suspend: !currentSuspendStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '狀態更新失敗');
      }
      setSuccessMessage(!currentSuspendStatus ? '該帳號已被即時停權封鎖' : '該帳號已解除停權');
      fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || '操作失敗');
    }
  };

  const handleSaveCustomSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/custom-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({ customCallName, customTonePrompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '儲存自訂設定失敗');
      }
      setSuccessMessage('蘇若妤管理員專用稱呼與語氣已成功更新！');
    } catch (err: any) {
      setErrorMessage(err.message || '儲存失敗');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">系統管理中心 (Admin Control)</h2>
              <p className="text-xs text-stone-400">
                管理員專用：全體帳號權限管理、停用與蘇若妤個人化設定
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Tabs / Sections */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">{successMessage}</div>
            </div>
          )}

          {/* Section 1: Custom Settings for Admin */}
          <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-purple-700" />
              蘇若妤專屬語氣與稱呼設定 (Admin 專用)
            </h3>
            <form onSubmit={handleSaveCustomSettings} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  若妤對您的稱呼 (例：創辦人、余總、執行長、老爺)
                </label>
                <input
                  type="text"
                  value={customCallName}
                  onChange={(e) => setCustomCallName(e.target.value)}
                  placeholder="例：創辦人"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                  若妤專屬語氣指示 (可自訂傲嬌程度、專業風格或幽默氛圍)
                </label>
                <textarea
                  value={customTonePrompt}
                  onChange={(e) => setCustomTonePrompt(e.target.value)}
                  rows={2}
                  placeholder="例如：稍微帶點幽默，絕對忠誠於最高管理者，偶爾帶著幹練若妤的口吻"
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400/30 resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingSettings ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  儲存專屬設定
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: User Role Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-stone-600" />
                帳號清單與身分授權管理 ({users.length} 位同仁)
              </h3>
              <button
                onClick={fetchUsers}
                disabled={isLoadingUsers}
                className="text-[11px] text-stone-500 hover:text-stone-800 font-medium cursor-pointer"
              >
                重新整理
              </button>
            </div>

            {isLoadingUsers ? (
              <div className="py-8 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                載入帳號資料中...
              </div>
            ) : (
              <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100">
                {users.map((u) => {
                  const isCurrentAdmin = u.id === currentUser.id;
                  return (
                    <div
                      key={u.id}
                      className="p-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900">
                            {u.displayName || '未具名同仁'}
                          </span>
                          <span className="text-[11px] text-stone-400 font-mono">
                            {u.email}
                          </span>
                          {u.isSuspended && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700">
                              已停用
                            </span>
                          )}
                          {isCurrentAdmin && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                              您目前帳號
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 mt-1">
                          註冊時間：{new Date(u.createdAt).toLocaleDateString()} · 憑證版本：v{u.tokenVersion}
                        </div>
                      </div>

                      {/* Role & Status Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={u.role}
                          disabled={isCurrentAdmin}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="px-2.5 py-1 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer disabled:opacity-50"
                        >
                          <option value="admin">Admin 最高管理者</option>
                          <option value="boss">Boss 老闆</option>
                          <option value="user">User 普通同仁</option>
                          <option value="guest">Guest 訪客</option>
                        </select>

                        {!isCurrentAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(u.id, u.isSuspended)}
                            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                              u.isSuspended
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                            }`}
                            title={u.isSuspended ? '解除帳號停權' : '停用該帳號'}
                          >
                            {u.isSuspended ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : (
                              <Ban className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
