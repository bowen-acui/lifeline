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
  analysisId?: string;
  savedToHistory?: boolean;
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
  analysisLog?: {
    analysisType: string;
    inputData: Record<string, any>;
    outputData?: Record<string, any>;
  };
}): Promise<AIResponse> {
  const { systemPrompt, userPrompt, callType, model, metadata, requestId, analysisLog } = params;

  try {
    const data = await analyze({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      callType: callType || 'chat',
      metadata: { source: 'frontend', model, requestId, ...(metadata || {}) },
      analysisLog
    });
    return {
      success: true,
      analysis: data.message,
      remainingCalls: data.remainingCalls,
      duplicate: data.duplicate,
      requestId,
      analysisId: data.analysisId,
      savedToHistory: data.savedToHistory
    };
  } catch (error: any) {
    console.error('Backend API Error:', error);
    return { 
      success: false, 
      error: error.message || '无法连接后端服务',
      requestId
    };
  }
}
