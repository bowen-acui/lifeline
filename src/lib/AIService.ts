/**
 * 统一的 AI 调用接口（强制走后端）
 */

interface AIResponse {
  success: boolean;
  analysis?: string;
  error?: string;
  remainingCalls?: number;
  duplicate?: boolean;
  requestId?: string;
}

import { analyze } from './ApiService';

export async function callAIService(params: {
  systemPrompt: string;
  userPrompt: string;
  model: 'deepseek' | 'chatgpt';
  apiKey?: string;
  userData: any;
  chartData: any;
  callType?: 'report' | 'synastry' | 'kline' | 'chat';
  metadata?: Record<string, any>;
  requestId?: string;
}): Promise<AIResponse> {
  const { systemPrompt, userPrompt, callType, model, metadata, requestId } = params;

  try {
    const data = await analyze({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      callType: callType || 'chat',
      metadata: { source: 'frontend', model, requestId, ...(metadata || {}) },
    });
    return { success: true, analysis: data.message, remainingCalls: data.remainingCalls, duplicate: data.duplicate, requestId };
  } catch (error: any) {
    console.error('Backend API Error:', error);
    return { 
      success: false, 
      error: error.message || '无法连接后端服务',
      requestId
    };
  }
}
