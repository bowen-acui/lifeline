import { useEffect, useState } from 'react';
import {
  getStoredAccessPassword,
  setStoredAccessPassword,
  clearStoredAccessPassword,
} from '../lib/ApiService';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

async function verifyPassword(pw: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/quota`, {
      headers: { 'x-access-password': pw },
    });
    if (res.status === 401) {
      const body = await res.json().catch(() => ({}));
      if (body?.code === 'BAD_ACCESS_PASSWORD') return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function AccessGate({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      const stored = getStoredAccessPassword();
      const ok = await verifyPassword(stored);
      setAuthed(ok);
      if (!ok) clearStoredAccessPassword();
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        加载中…
      </div>
    );
  }

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr('');
          const ok = await verifyPassword(pw);
          if (ok) {
            setStoredAccessPassword(pw);
            setAuthed(true);
          } else {
            setErr('访问密码错误');
          }
        }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-5"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">访问密码</h1>
          <p className="mt-1 text-sm text-slate-500">该站点受密码保护</p>
        </div>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="请输入访问密码"
        />
        {err && <p className="text-sm text-rose-500">{err}</p>}
        <button
          type="submit"
          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          进入
        </button>
      </form>
    </div>
  );
}
