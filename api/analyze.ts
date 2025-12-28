import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userData, chartData } = req.body;

  if (!userData || !chartData) {
    return res.status(400).json({ error: 'Missing required data' });
  }

  try {
    const prompt = `
      作为一个精通东西方命理的专家，请根据以下数据为用户生成一份简短、深刻且具有启发性的人生分析。
      
      用户基本信息:
      姓名: ${userData.name}
      出生日期: ${new Date(userData.date).toLocaleDateString()}
      出生地: ${userData.place}

      命盘数据:
      八字: ${JSON.stringify(chartData.bazi)}
      紫微斗数: ${JSON.stringify(chartData.ziwei)}
      西方星盘: ${JSON.stringify(chartData.western)}

      请提供以下内容:
      1. 核心性格特质 (结合八字日主与西方太阳/月亮星座)
      2. 人生主要挑战与机遇 (结合紫微命宫与星盘相位)
      3. 给用户的简短建议 (不超过3条)

      风格要求:
      - 语言风格: 极简、富有哲理、神秘但不迷信。
      - 避免过于专业的术语堆砌，用通俗易懂的语言解释。
      - 总字数控制在 300 字以内。
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'deepseek-chat',
    });

    const analysis = completion.choices[0].message.content;

    return res.status(200).json({ analysis });
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    return res.status(500).json({ error: 'Failed to generate analysis' });
  }
}
