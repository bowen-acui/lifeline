const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const ACCESS_PASSWORD_KEY = 'lifeline_access_password';

export function getStoredAccessPassword(): string {
  try {
    return localStorage.getItem(ACCESS_PASSWORD_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredAccessPassword(pw: string): void {
  try {
    localStorage.setItem(ACCESS_PASSWORD_KEY, pw);
  } catch {}
}

export function clearStoredAccessPassword(): void {
  try {
    localStorage.removeItem(ACCESS_PASSWORD_KEY);
  } catch {}
}

export interface QuotaResponse {
  remainingCalls: number;
  userId: string;
}

export interface AnalyzeRequest {
  messages: Array<{ role: string; content: string }>;
  callType: 'report' | 'synastry' | 'kline' | 'chat';
  metadata?: any;
  analysisLog?: {
    analysisType: string;
    inputData: Record<string, any>;
    outputData?: Record<string, any>;
  };
}

export interface AnalyzeResponse {
  message: string;
  remainingCalls: number;
  duplicate?: boolean;
  analysisId?: string;
  savedToHistory?: boolean;
}

export interface UsageLogItem {
  id: string;
  call_type: string;
  created_at: string;
  metadata?: { deducted?: number; action?: string; reportTitle?: string; status?: 'pending' | 'success' | 'failed' };
}

export interface UsageLogResponse {
  logs: UsageLogItem[];
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = (error as { name?: string }).name;
  return name === 'AbortError';
}


async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { supabase, NO_AUTH } = await import('./AuthService');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const accessPw = getStoredAccessPassword();
  if (accessPw) headers['x-access-password'] = accessPw;

  if (!NO_AUTH) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('请先登录');
    }
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

export async function getQuota(): Promise<QuotaResponse> {
  return fetchWithAuth('/api/quota');
}

export async function analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  return fetchWithAuth('/api/analyze', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getUsageLogs(limit: number = 50): Promise<UsageLogResponse> {
  return fetchWithAuth(`/api/usage?limit=${limit}`);
}


export async function logUserInput(inputData: any): Promise<void> {
  return fetchWithAuth('/api/log-input', {
    method: 'POST',
    body: JSON.stringify({ inputData }),
  });
}

export async function submitFeedback(
  feedbackType: 'like' | 'dislike',
  targetId?: string,
  content?: string
): Promise<void> {
  return fetchWithAuth('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ feedbackType, targetId, content }),
  });
}
