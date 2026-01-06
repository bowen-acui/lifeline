import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userData, chartData, systemPrompt, userPrompt, model, apiKey: userApiKey } = req.body;

  if (!userData || !chartData) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  // 优先使用用户提供的 API Key，否则使用环境变量
  const isDeepSeek = model === 'deepseek';
  const envKey = isDeepSeek ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY;
  const apiKey = userApiKey || envKey;
  
  if (!apiKey) {
    return res.status(500).json({
      error: `Missing API key for ${model}. Please provide your own API key or contact administrator.`,
    });
  }

  // 根据模型选择配置
  const openai = new OpenAI({
    apiKey,
    baseURL: isDeepSeek ? 'https://api.deepseek.com' : 'https://api.openai.com/v1',
  });

  const modelName = isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini';

  try {
    // 使用前端传入的 prompt，如果没有则使用默认 prompt
    const finalSystemPrompt = systemPrompt || `你是一位精通中西方命理学的资深分析师。`;
    const finalUserPrompt = userPrompt || `
      请根据以下数据为用户生成一份深刻且具有启发性的人生分析。
      
      用户基本信息:
      姓名: ${userData.name}
      性别: ${userData.gender}
      性取向: ${userData.orientation || '（未填写）'}
      出生日期: ${new Date(userData.date).toLocaleDateString()}
      出生地: ${userData.place}

      命盘数据:
      八字: ${JSON.stringify(chartData.bazi)}
      紫微斗数: ${JSON.stringify(chartData.ziwei)}
      西方星盘: ${JSON.stringify(chartData.western)}

      请提供详尽的分析。
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: finalUserPrompt }
      ],
      model: modelName,
      temperature: 0.7,
      max_tokens: 4000,
    });

    const analysis = completion.choices[0].message.content;

    return res.status(200).json({ analysis });
  } catch (error: any) {
    console.error(`${model} API Error:`, error);
    const status = typeof error?.status === 'number' ? error.status : 500;
    let message = 'Failed to generate analysis';
    
    // 处理常见错误
    if (error?.code === 'invalid_api_key' || error?.status === 401) {
      message = 'API Key 无效，请检查后重试';
    } else if (error?.status === 429) {
      message = 'API 调用频率超限，请稍后重试';
    } else if (error?.status === 402) {
      message = 'API 账户余额不足';
    } else if (typeof error?.message === 'string' && error.message) {
      message = error.message;
    }

    return res.status(status).json({
      error: message,
      ...(process.env.NODE_ENV !== 'production'
        ? {
            hint:
              'If running locally with Vite, /api/analyze will 404. Use `npx vercel dev` to run serverless functions.',
          }
        : null),
    });
  }
}
