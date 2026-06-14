import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 本地免登录模式：未配置真实 Supabase（或仍是占位值）时启用，
// 只用一个 DeepSeek key 就能在本地跑通生成报告。
export const NO_AUTH =
  import.meta.env.VITE_NO_AUTH === 'true' ||
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('placeholder');

function createStubClient(): any {
  return {
    auth: {
      async getSession() { return { data: { session: null } }; },
      async getUser() { return { data: { user: null } }; },
      onAuthStateChange() {
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signInWithOAuth() { return { error: new Error('本地模式未启用登录') }; },
      async signInWithOtp() { return { error: new Error('本地模式未启用登录') }; },
      async signOut() { return { error: null }; },
    },
  };
}

export const supabase = NO_AUTH
  ? createStubClient()
  : createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });

// 获取当前用户
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// 获取访问token
export async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// 登出
export async function signOut() {
  await supabase.auth.signOut();
}

// 监听认证状态变化
export function onAuthStateChange(callback: (user: any) => void) {
  return supabase.auth.onAuthStateChange((_event: any, session: any) => {
    callback(session?.user ?? null);
  });
}
