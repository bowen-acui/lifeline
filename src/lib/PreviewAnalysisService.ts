/**
 * 预览分析服务
 * 使用开发者提供的 DeepSeek API Key 生成趋势数据和关键年份
 * 这是免费层，用户无需提供自己的 API Key
 */

import type { YearScore, KeyYear } from '../components/DualLineChart';

// 开发者的 DeepSeek API Key（用于预览生成）
// TODO: 在生产环境中，应该通过后端代理调用，不要暴露在前端
const DEVELOPER_API_KEY = 'sk-d8166e468c4d49099c5f3149119766b6';

export interface PreviewAnalysisInput {
  birthYear: number;
  currentAge: number;
  selectedSystems: ('bazi' | 'western' | 'ziwei')[];
  // 命理数据
  baziData?: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
    dayMaster: string;
    fiveElements: Record<string, number>;
  };
  westernData?: {
    sunSign: string;
    moonSign: string;
    risingSign: string;
    dominantPlanet: string;
  };
  ziweiData?: {
    mingGong: string;
    shenGong: string;
    majorStars: string[];
  };
}

export interface PreviewAnalysisResult {
  success: boolean;
  yearScores?: YearScore[];
  keyYears?: KeyYear[];
  error?: string;
}

/**
 * 构建预览分析的 Prompt
 */
function buildPreviewPrompt(input: PreviewAnalysisInput): { systemPrompt: string; userPrompt: string } {
  const { birthYear, currentAge, selectedSystems, baziData, westernData, ziweiData } = input;
  
  const systemPrompt = `你是一位精通多种命理体系的大师，包括中国八字、西方占星术和紫微斗数。

你的任务是根据用户的命理信息，生成其一生（0-99岁）的事业运势和情感运势评分曲线，以及最值得关注的3个关键年份。

**重要规则：**
1. 评分范围：15-85分（不要出现极端值）
2. 曲线要有起伏变化，体现人生的高低起落
3. 关键年份必须在用户当前年龄前后的合理范围内（${currentAge - 10}岁 到 ${currentAge + 20}岁之间）
4. 每个关键年份需要简短的理由（20字以内）

**输出格式（严格遵守JSON格式）：**
{
  "scores": [
    {"age": 0, "career": 50, "relationship": 50},
    {"age": 1, "career": 51, "relationship": 49},
    ...（共100个年龄点，0-99岁）
  ],
  "keyYears": [
    {"age": 25, "type": "peak", "dimension": "career", "reason": "事业突破期，贵人运旺"},
    {"age": 32, "type": "turning", "dimension": "both", "reason": "人生重大转折点"},
    {"age": 40, "type": "valley", "dimension": "relationship", "reason": "感情需要特别经营"}
  ]
}

type可选值：peak（高峰）、valley（低谷）、turning（转折）、volatile（波动）
dimension可选值：career（事业）、relationship（情感）、both（两者皆有）`;

  let userPrompt = `请根据以下命理信息生成运势曲线和关键年份：

出生年份：${birthYear}年
当前年龄：${currentAge}岁
分析体系：${selectedSystems.map(s => s === 'bazi' ? '八字' : s === 'western' ? '西方占星' : '紫微斗数').join('、')}

`;

  if (baziData && selectedSystems.includes('bazi')) {
    userPrompt += `
【八字信息】
四柱：${baziData.yearPillar} ${baziData.monthPillar} ${baziData.dayPillar} ${baziData.hourPillar}
日主：${baziData.dayMaster}
五行分布：金${baziData.fiveElements['金'] || 0} 木${baziData.fiveElements['木'] || 0} 水${baziData.fiveElements['水'] || 0} 火${baziData.fiveElements['火'] || 0} 土${baziData.fiveElements['土'] || 0}
`;
  }

  if (westernData && selectedSystems.includes('western')) {
    userPrompt += `
【西方占星信息】
太阳星座：${westernData.sunSign}
月亮星座：${westernData.moonSign}
上升星座：${westernData.risingSign}
主导行星：${westernData.dominantPlanet}
`;
  }

  if (ziweiData && selectedSystems.includes('ziwei')) {
    userPrompt += `
【紫微斗数信息】
命宫：${ziweiData.mingGong}
身宫：${ziweiData.shenGong}
主星：${ziweiData.majorStars.join('、')}
`;
  }

  userPrompt += `
请严格按照JSON格式输出，不要包含任何其他文字说明。`;

  return { systemPrompt, userPrompt };
}

/**
 * 解析AI返回的JSON
 */
function parseAIResponse(content: string, birthYear: number): { scores: YearScore[]; keyYears: KeyYear[] } | null {
  try {
    // 尝试提取JSON部分（AI可能会在前后添加文字）
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response');
      return null;
    }
    
    const data = JSON.parse(jsonMatch[0]);
    
    if (!data.scores || !Array.isArray(data.scores) || !data.keyYears || !Array.isArray(data.keyYears)) {
      console.error('Invalid JSON structure');
      return null;
    }
    
    // 转换为 YearScore 格式
    const yearScores: YearScore[] = data.scores.map((s: any) => ({
      year: birthYear + s.age,
      age: s.age,
      career: Math.max(15, Math.min(85, s.career || 50)),
      relationship: Math.max(15, Math.min(85, s.relationship || 50)),
    }));
    
    // 确保有100个数据点
    while (yearScores.length < 100) {
      const lastScore = yearScores[yearScores.length - 1] || { career: 50, relationship: 50 };
      yearScores.push({
        year: birthYear + yearScores.length,
        age: yearScores.length,
        career: lastScore.career,
        relationship: lastScore.relationship,
      });
    }
    
    // 转换为 KeyYear 格式
    const keyYears: KeyYear[] = data.keyYears.slice(0, 3).map((ky: any) => ({
      year: birthYear + ky.age,
      age: ky.age,
      type: ky.type || 'volatile',
      dimension: ky.dimension || 'both',
      score: {
        career: yearScores[ky.age]?.career || 50,
        relationship: yearScores[ky.age]?.relationship || 50,
      },
      summary: ky.reason || '重要年份',
    }));
    
    return { scores: yearScores, keyYears };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    return null;
  }
}

/**
 * 调用 DeepSeek API 生成预览分析
 */
export async function generatePreviewAnalysis(
  input: PreviewAnalysisInput,
  apiKey?: string
): Promise<PreviewAnalysisResult> {
  const key = apiKey || DEVELOPER_API_KEY;
  
  if (!key || key === 'REPLACE_WITH_YOUR_DEEPSEEK_API_KEY') {
    return { success: false, error: '开发者API Key未配置' };
  }
  
  const { systemPrompt, userPrompt } = buildPreviewPrompt(input);
  
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 8000, // JSON较长，需要更多token
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        return { success: false, error: 'API Key 无效' };
      } else if (response.status === 429) {
        return { success: false, error: '服务繁忙，请稍后重试' };
      } else if (response.status === 402) {
        return { success: false, error: '服务暂时不可用' };
      }
      return { success: false, error: errorData.error?.message || `请求失败 (${response.status})` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return { success: false, error: 'AI 返回结果为空' };
    }

    const parsed = parseAIResponse(content, input.birthYear);
    
    if (!parsed) {
      return { success: false, error: '解析结果失败，请重试' };
    }

    return {
      success: true,
      yearScores: parsed.scores,
      keyYears: parsed.keyYears,
    };
  } catch (error: any) {
    console.error('Preview Analysis Error:', error);
    return { success: false, error: error.message || '网络请求失败' };
  }
}
