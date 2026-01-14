import { useState, useEffect, useRef } from 'react';
import { supabase, signOut, onAuthStateChange } from '../lib/AuthService';
import type { User } from '@supabase/supabase-js';

interface AuthModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      setLoadingProvider(provider);
      setError('');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-md p-4">
      <div 
        className="relative w-full max-w-sm bg-paper border border-ink/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-4 text-ink/40 hover:text-ink transition-colors"
          aria-label="关闭"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 md:p-10">
          <div className="text-center mb-10">
            <div className="w-12 h-12 mx-auto mb-6 border border-ink flex items-center justify-center rounded-full bg-accent/10">
               <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
               </svg>
            </div>
            <h2 className="text-2xl font-serif font-bold text-ink mb-3 tracking-tight">
              LifeLine
            </h2>
            <p className="text-ink/60 font-mono text-xs uppercase tracking-widest">
              命运的架构
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 font-mono text-xs text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border border-ink/20 hover:border-ink hover:bg-gray-50 text-ink font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loadingProvider === 'google' ? 'Processing...' : 'Google Login'}
            </button>

            <button
              onClick={() => handleSocialLogin('github')}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-ink text-paper border border-ink hover:opacity-90 font-mono text-xs uppercase tracking-wider transition-all disabled:opacity-50"
            >
               <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
               </svg>
              {loadingProvider === 'github' ? 'Processing...' : 'Github Login'}
            </button>
            
            <div className="relative pt-2">
               <button
                  disabled
                  className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gray-100 text-gray-400 border border-gray-200 font-mono text-xs uppercase tracking-wider cursor-not-allowed"
                >
                  <svg className="w-4 h-4 grayscale opacity-50" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-5.523 3.317-6.523.982-.311 2.031-.478 3.119-.478a8.908 8.908 0 013.257.602C18.477 5.238 14.068 2.188 8.691 2.188zm-2.488 5.93c-.39 0-.707-.317-.707-.707a.707.707 0 111.414 0c0 .39-.317.707-.707.707zm4.977 0c-.39 0-.707-.317-.707-.707a.707.707 0 111.414 0c0 .39-.317.707-.707.707zM15.322 9.53c-1.114 0-2.199.205-3.207.582-2.744.992-4.188 3.522-3.217 5.644.971 2.122 3.678 3.159 6.422 2.167.758-.274 1.551-.376 2.366-.301l1.654.968a.279.279 0 00.145.047c.142 0 .252-.118.252-.26 0-.062-.026-.122-.042-.184l-.338-1.287a.513.513 0 01.185-.577c1.593-1.172 2.628-2.907 2.628-4.84 0-3.535-3.295-6.599-6.848-6.599zm-2.433 4.525c-.349 0-.631-.283-.631-.632 0-.349.282-.632.631-.632.349 0 .631.283.631.632 0 .349-.282.632-.631.632zm4.332 0c-.349 0-.631-.283-.631-.632 0-.349.282-.632.631-.632.349 0 .631.283.631.632 0 .349-.282.632-.631.632z"/>
                  </svg>
                  <span>Wechat Login</span>
               </button>
               <div className="absolute top-0 right-0 bg-accent text-paper font-mono text-[10px] px-2 py-0.5 transform translate-y-1/2 uppercase tracking-wide">
                 Soon
               </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-[10px] text-ink/40 font-mono">
              Secure access powered by Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UserInfoProps {
  user: User;
  remainingCalls: number;
  onLogout: () => void;
}

export function UserInfo({ user, remainingCalls, onLogout }: UserInfoProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        <div className="absolute top-full right-0 mt-2 w-64 bg-paper border border-ink/10 z-50">
          <div className="p-4 border-b border-ink/10">
            <p className="text-[10px] text-ink/40 uppercase tracking-widest font-mono mb-1.5">Signed in as</p>
            <p className="text-ink font-medium truncate font-mono text-sm">{user.email}</p>
          </div>
          
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-ink/50 text-[10px] font-mono uppercase tracking-wider">Daily Limit</span>
              <span className="text-accent font-bold font-mono text-sm">{remainingCalls} <span className="text-ink/30 font-normal">/ 19</span></span>
            </div>
            <div className="w-full h-1.5 bg-ink/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${(remainingCalls / 19) * 100}%` }}
              />
            </div>
          </div>

          {remainingCalls === 0 && (
            <div className="px-4 pb-4">
               <div className="p-3 bg-accent/5 border border-accent/20 rounded">
                  <p className="text-xs text-accent font-bold mb-1 font-mono uppercase">Limit Reached</p>
                  <p className="text-[10px] text-ink/60 leading-relaxed">
                    Contact us for more credits.
                  </p>
               </div>
            </div>
          )}

          <div className="p-2 border-t border-ink/10 bg-paper">
            <button
              onClick={() => {
                onLogout();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-red-500 hover:bg-red-50 transition-colors rounded"
            >
              Sign out
            </button>
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
