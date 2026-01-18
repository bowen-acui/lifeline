import { useState, useEffect, useRef } from 'react';
import { getUsageLogs, type UsageLogItem } from '../lib/ApiService';
import { supabase, signOut, onAuthStateChange } from '../lib/AuthService';
import type { User } from '@supabase/supabase-js';

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      setLoadingProvider(provider);
      setError('');
      setEmailSent(false);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || '登录失败，请稍后重试');
      setLoadingProvider(null);
    }
  };

  const handleEmailLogin = async () => {
    try {
      const trimmed = email.trim();
      if (!trimmed) {
        setError('请输入邮箱地址');
        return;
      }
      setIsEmailLoading(true);
      setError('');
      setEmailSent(false);

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
      setEmailSent(true);
    } catch (err: any) {
      console.error('Email login error:', err);
      setError(err.message || '邮件发送失败，请稍后重试');
    } finally {
      setIsEmailLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="relative w-full max-w-md bg-paper border border-ink/10 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink/40 hover:text-ink transition-colors"
          aria-label="关闭"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-bold text-ink mb-2 tracking-tight">
              LIFELINE
            </h2>
            <p className="text-[10px] font-mono text-ink/40 uppercase tracking-[0.3em]">
              命运的架构
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-ink/5 border border-ink/10 text-ink/70 font-serif text-xs text-center">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="border border-ink/10 p-3">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="邮箱登录/注册"
                  className="flex-1 text-xs font-mono border border-ink/20 px-3 py-2 bg-white focus:border-accent focus:outline-none"
                  disabled={isEmailLoading || loadingProvider !== null}
                />
                <button
                  onClick={handleEmailLogin}
                  disabled={isEmailLoading || loadingProvider !== null}
                  className="px-3 py-2 text-xs font-mono border border-ink/20 text-ink/70 hover:border-accent hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEmailLoading ? '发送中...' : '发送验证'}
                </button>
              </div>
              {emailSent && (
                <div className="mt-2 text-[10px] text-ink/50 font-mono">
                  验证邮件已发送，请点击邮箱里的登录链接完成验证。
                </div>
              )}
            </div>

            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-transparent border border-ink/20 hover:border-accent text-ink hover:text-accent font-serif text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{loadingProvider === 'google' ? '处理中...' : 'Google 登录'}</span>
            </button>

            <button
              onClick={() => handleSocialLogin('github')}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-transparent border border-ink/20 hover:border-accent text-ink hover:text-accent font-serif text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
               <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
               </svg>
              <span>{loadingProvider === 'github' ? '处理中...' : 'GitHub 登录'}</span>
            </button>
            
            <div className="relative pt-2">
               <button
                  disabled
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-transparent border border-ink/10 text-ink/30 font-serif text-sm cursor-not-allowed"
                >
                  <svg className="w-5 h-5 opacity-30" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-5.523 3.317-6.523.982-.311 2.031-.478 3.119-.478a8.908 8.908 0 013.257.602C18.477 5.238 14.068 2.188 8.691 2.188zm-2.488 5.93c-.39 0-.707-.317-.707-.707a.707.707 0 111.414 0c0 .39-.317.707-.707.707zm4.977 0c-.39 0-.707-.317-.707-.707a.707.707 0 111.414 0c0 .39-.317.707-.707.707zM15.322 9.53c-1.114 0-2.199.205-3.207.582-2.744.992-4.188 3.522-3.217 5.644.971 2.122 3.678 3.159 6.422 2.167.758-.274 1.551-.376 2.366-.301l1.654.968a.279.279 0 00.145.047c.142 0 .252-.118.252-.26 0-.062-.026-.122-.042-.184l-.338-1.287a.513.513 0 01.185-.577c1.593-1.172 2.628-2.907 2.628-4.84 0-3.535-3.295-6.599-6.848-6.599zm-2.433 4.525c-.349 0-.631-.283-.631-.632 0-.349.282-.632.631-.632.349 0 .631.283.631.632 0 .349-.282.632-.631.632zm4.332 0c-.349 0-.631-.283-.631-.632 0-.349.282-.632.631-.632.349 0 .631.283.631.632 0 .349-.282.632-.631.632z"/>
                  </svg>
                  <span>微信登录</span>
               </button>
               <div className="absolute top-0 right-0 bg-accent/10 border border-accent/20 text-accent font-mono text-[9px] px-1.5 py-0.5 transform translate-y-1/2 uppercase tracking-wide">
                 Soon
               </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] text-ink/30 font-mono">
              Secure access powered by Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RecentProfile {
  name: string;
  gender: '男' | '女';
  date: string;
  place: string;
  createdAt: number;
}

interface UserInfoProps {
  user: User;
  remainingCalls: number;
  onLogout: () => void;
  recentProfiles?: RecentProfile[];
  onOpenRecentProfile?: (profile: RecentProfile) => void;
  onDeleteRecentProfile?: (profile: RecentProfile) => void;
}

export function UserInfo({ user, remainingCalls, onLogout, recentProfiles = [], onOpenRecentProfile, onDeleteRecentProfile }: UserInfoProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showUsagePanel, setShowUsagePanel] = useState(false);
  const [usageLogs, setUsageLogs] = useState<UsageLogItem[]>([]);
  const [isUsageLoading, setIsUsageLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const USAGE_CACHE_KEY = 'lifeline_usage_cache';
  const USAGE_CACHE_TTL_MS = 2 * 60 * 1000;
  const formatSolarDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  const getProvider = () => {
    return user.app_metadata?.provider || user.identities?.[0]?.provider || 'unknown';
  };

  const formatUsageTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  };

  const formatUsageAction = (type: string, metadata?: { action?: string; reportTitle?: string }) => {
    if (metadata?.reportTitle) return `生成报告：${metadata.reportTitle}`;
    if (metadata?.action) return metadata.action;
    if (type === 'report') return '生成报告';
    if (type === 'synastry') return '合盘分析';
    if (type === 'kline') return '绘制K线';
    if (type === 'chat') return '对话/问答';
    return '其他调用';
  };

  const openUsagePanel = async () => {
    setShowUsagePanel(true);
    const now = Date.now();
    let hasCached = false;
    try {
      const cachedRaw = localStorage.getItem(USAGE_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as { userId?: string; fetchedAt?: number; logs?: UsageLogItem[] };
        if (cached.userId === user.id && cached.logs) {
          setUsageLogs(cached.logs);
          hasCached = true;
        }
      }
    } catch {
      // ignore cache errors
    }

    setIsUsageLoading(true);
    try {
      const data = await getUsageLogs(50);
      const logs = data.logs || [];
      setUsageLogs(logs);
      try {
        localStorage.setItem(USAGE_CACHE_KEY, JSON.stringify({ userId: user.id, fetchedAt: now, logs }));
      } catch {
        // ignore cache write errors
      }
    } catch (error) {
      console.error('获取调用记录失败:', error);
      if (!hasCached) {
        setUsageLogs([]);
      }
    } finally {
      setIsUsageLoading(false);
    }
  };

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-paper hover:bg-paper border border-ink/10 hover:border-ink/20 transition-all"
      >
        <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-ink font-serif font-medium text-xs">
          {user.email?.[0].toUpperCase()}
        </div>
        
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink/70 font-mono">{remainingCalls}</span>
          <svg className={`w-3.5 h-3.5 text-ink/40 transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {showMenu && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-paper shadow-lg z-50">
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-ink/40 font-serif">当前账号</p>
              <div className="flex items-center justify-between gap-3">
                <span className="w-5 h-5 rounded-full border border-ink/15 flex items-center justify-center bg-paper">
                  {getProvider() === 'github' ? (
                    <svg className="w-3.5 h-3.5 text-ink/70" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                  ) : getProvider() === 'google' ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  ) : (
                    <span className="text-[9px] text-ink/50 font-serif">ID</span>
                  )}
                </span>
                <p className="text-sm text-ink font-serif truncate flex-1">{user.email}</p>
                <button
                  onClick={() => {
                    onLogout();
                    setShowMenu(false);
                  }}
                  className="text-xs text-ink/30 font-serif hover:text-ink/60 transition-colors"
                >
                  退出
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink/50 font-serif">每日额度</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openUsagePanel();
                  }}
                  className="text-sm text-ink font-serif border border-transparent px-2 py-0.5 hover:text-ink hover:border-ink/20 hover:bg-ink/5 transition-all"
                  aria-label="查看扣分明细"
                >
                  {remainingCalls} / 19
                </button>
              </div>
              <div className="w-full h-1.5 bg-ink/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${(remainingCalls / 19) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink/50 font-serif">最近填入的生日档案</span>
              </div>
              {recentProfiles.length === 0 ? (
                <div className="text-xs text-ink/30 font-serif">
                  暂无最近档案
                </div>
              ) : (
                <div className="space-y-2">
                  {recentProfiles.map((profile) => (
                    <div
                      key={`${profile.createdAt}-${profile.date}`}
                      className="w-full px-3 py-2 bg-ink/5 hover:bg-ink/10 transition-colors flex items-start justify-between gap-2"
                    >
                      <button
                        onClick={() => {
                          onOpenRecentProfile?.(profile);
                          setShowMenu(false);
                        }}
                        className="flex-1 text-left"
                      >
                      <div className="text-xs font-serif text-ink truncate">
                        {(profile.name || '未命名') + ' ' + formatSolarDate(profile.date) + ' ' + profile.gender}
                      </div>
                        <div className="text-xs text-ink/40 font-serif truncate mt-0.5">
                          {profile.place}
                        </div>
                      </button>
                      <button
                        onClick={() => onDeleteRecentProfile?.(profile)}
                        className="text-ink/30 hover:text-ink/60 text-xs leading-none"
                        aria-label="删除档案"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {remainingCalls === 0 && (
              <div className="px-3 py-2 bg-accent/5 text-xs text-accent font-serif">
                今日额度已用完
              </div>
            )}

            {/* 退出按钮移到账号行 */}
          </div>
        </div>
      )}

      {showUsagePanel && (
        <div className="fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setShowUsagePanel(false)}
          />
          <div className="absolute top-0 right-0 h-full w-[360px] bg-paper border-l border-ink/10 shadow-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-serif text-ink">扣分明细</h3>
              <button
                onClick={() => setShowUsagePanel(false)}
                className="text-ink/40 hover:text-ink text-lg leading-none"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
            <div className="text-[10px] font-serif text-ink/40 mb-3">
              记录最近 50 条调用
            </div>
            <div className="space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto">
              {isUsageLoading ? (
                <div className="text-xs text-ink/40 font-serif">加载中...</div>
              ) : usageLogs.length === 0 ? (
                <div className="text-xs text-ink/30 font-serif">暂无记录</div>
              ) : (
                usageLogs.map((log) => (
                  <div key={log.id} className="px-3 py-2 bg-ink/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-serif text-ink">{formatUsageAction(log.call_type, log.metadata)}</span>
                      <span className="text-xs font-serif text-ink/60">
                        -{log.metadata?.deducted ?? 1}
                      </span>
                    </div>
                    <div className="text-[10px] text-ink/40 font-serif mt-1">
                      {formatUsageTime(log.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 使用 getSession 从 localStorage 读取，更快更可靠
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听认证状态变化
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return { user, loading, logout };
}
