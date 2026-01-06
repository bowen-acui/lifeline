/**
 * 前端直接调用 AI API 的服务
 * 用于开发环境或用户提供自己的 API Key 时
 */

interface AIRequestParams {
  systemPrompt: string;
  userPrompt: string;
  model: 'deepseek' | 'chatgpt';
  apiKey: string;
}

interface AIResponse {
  success: boolean;
  analysis?: string;
  error?: string;
}

/**
 * 直接调用 DeepSeek API
 */
async function callDeepSeek(params: AIRequestParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, apiKey } = params;
  
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return { success: false, error: 'API Key 无效，请检查后重试' };
      } else if (response.status === 429) {
        return { success: false, error: 'API 调用频率超限，请稍后重试' };
      } else if (response.status === 402) {
        return { success: false, error: 'API 账户余额不足' };
      }
      return { success: false, error: errorData.error?.message || `请求失败 (${response.status})` };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;
    
    if (!analysis) {
      return { success: false, error: 'AI 返回结果为空' };
    }

    return { success: true, analysis };
  } catch (error: any) {
    console.error('DeepSeek API Error:', error);
    return { success: false, error: error.message || '网络请求失败' };
  }
}

/**
 * 直接调用 OpenAI API
 */
async function callOpenAI(params: AIRequestParams): Promise<AIResponse> {
  const { systemPrompt, userPrompt, apiKey } = params;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return { success: false, error: 'API Key 无效，请检查后重试' };
      } else if (response.status === 429) {
        return { success: false, error: 'API 调用频率超限，请稍后重试' };
      } else if (response.status === 402 || response.status === 400) {
        return { success: false, error: 'API 账户余额不足或配额已用完' };
      }
      return { success: false, error: errorData.error?.message || `请求失败 (${response.status})` };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;
    
    if (!analysis) {
      return { success: false, error: 'AI 返回结果为空' };
    }

    return { success: true, analysis };
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    return { success: false, error: error.message || '网络请求失败' };
  }
}

/**
 * 统一的 AI 调用接口
 * 优先使用后端 API，如果失败则尝试前端直接调用（需要用户提供 API Key）
 */
export async function callAIService(params: {
  systemPrompt: string;
  userPrompt: string;
  model: 'deepseek' | 'chatgpt';
  apiKey?: string;
  userData: any;
  chartData: any;
}): Promise<AIResponse> {
  const { systemPrompt, userPrompt, model, apiKey, userData, chartData } = params;
  
  // 如果用户提供了 API Key，直接从前端调用
  if (apiKey) {
    console.log(`Using direct ${model} API call with user-provided key`);
    
    if (model === 'deepseek') {
      return callDeepSeek({ systemPrompt, userPrompt, model, apiKey });
    } else {
      return callOpenAI({ systemPrompt, userPrompt, model, apiKey });
    }
  }
  
  // 否则尝试使用后端 API（需要服务器配置环境变量）
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userData,
        chartData,
        systemPrompt,
        userPrompt,
        model,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, analysis: data.analysis };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.error || '后端服务不可用，请使用自己的 API Key' 
      };
    }
  } catch (error: any) {
    console.error('Backend API Error:', error);
    return { 
      success: false, 
      error: '无法连接后端服务，请使用自己的 API Key' 
    };
  }
}
