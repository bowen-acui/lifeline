const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface QuotaResponse {
  remainingCalls: number;
  userId: string;
}

export interface AnalyzeRequest {
  messages: Array<{ role: string; content: string }>;
  callType: 'report' | 'synastry' | 'kline' | 'chat';
  metadata?: any;
}

export interface AnalyzeResponse {
  message: string;
  remainingCalls: number;
  duplicate?: boolean;
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
  const { data: { session } } = await (await import('./AuthService')).supabase.auth.getSession();
  
  if (!session) {
    throw new Error('请先登录');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers,
  };

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
