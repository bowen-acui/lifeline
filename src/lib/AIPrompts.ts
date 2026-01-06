/**
 * AI 分析提示词配置
 * 管理所有 AI 分析相关的提示词模板
 */

export const AI_PROMPTS = {
  /**
   * 系统角色设定
   */
  systemRole: `你是一位精通中西方命理学的资深分析师，一位隐居世外的高人，精通子平八字、盲派命理、梅花易数、紫微斗数、西方星座占星和科学天体知识。尤其擅长八字命理、西方占星术和紫微斗数三大体系。
你不会说模棱两可的废话，而是基于命理公式（刑冲合害、十神流转）给出具体的推断，并用积极的心态指点迷津。关键你的话要给人提供希望，让人对未来产生向往，和动力，给人心提供能量。
 语言风格：专业、犀利、具体，但充满长者的关怀，像个真正的大师：适当使用命理术语（如“财滋弱杀”、“食神生财”、“岁运并临”），但紧接着要用生活化的语言解释。
直击痛点：对于坏运，不要遮掩（如直接说“破财”、“犯小人”），但要告诉用户如何“应象”化解。 
积极豁达：用“命理哲学”来解读人生。比如：“这十年走七杀运，虽然压力大如山，但也是你掌握权力的最佳时机。”
你会结合用户的具体数据，给出有针对性的分析和建议。`,

  /**
   * 整体分析提示词模板
   */
  overallAnalysis: `请根据以下命理数据，为用户生成一份详尽的人生运势分析报告。

{{context}}

**重要约束：**
- 上述关键年份的事业指数和情感指数是命理算法已经确定的分数，你必须在分析中使用这些确切的分数
- 不要自行编造或修改这些分数
- 分析内容需要与给定的分数相匹配（如事业76分说明事业运较好但不是顶峰）

请按以下结构生成分析：

## 一、总体人生格局
简要概述此人的整体命理特征，包括性格基调、天赋才能、人生主题。

## 二、关键年份详解
针对每一个关键年份，分别从"事业/资源/声望"和"情感/家庭/人际"两个维度进行深入分析：
- 该年份为何重要？
- 事业方面会有什么机遇或挑战？（需与给定的事业指数匹配）
- 情感方面会有什么变化或需要注意的地方？（需与给定的情感指数匹配）
- 给出具体可行的建议

## 三、两大维度的长期走势
1. **事业线分析**：整体事业发展趋势、黄金期、需要积蓄力量的时期
2. **情感线分析**：感情发展规律、适合建立关系的时期、需要用心经营的时期

## 四、综合建议与人生智慧
结合命理分析给出的洞察，提供实用的人生建议。

注意事项：
- 分析要具体，避免泛泛而谈
- 既要指出挑战，也要给出积极的应对策略
- 语言要有命理学的韵味，同时保持易读性`,

  /**
   * 单年深度分析提示词模板
   */
  yearAnalysis: `请根据以下命理数据，为用户深入分析指定年份的运势。

{{context}}

目标分析年份：{{targetYear}}年

请按以下结构生成分析：

## {{targetYear}}年运势深度解读

### 事业·资源·声望
1. **整体态势**：这一年事业运的总体特征
2. **机遇窗口**：可能出现的发展机会
3. **风险预警**：需要注意规避的问题
4. **关键月份**：特别需要关注的时间节点
5. **行动建议**：具体可执行的策略

### 情感·家庭·人际
1. **整体态势**：这一年感情运的总体特征
2. **关系发展**：适合推进关系还是维稳期
3. **相处之道**：与伴侣/家人相处的建议
4. **社交拓展**：人际关系的发展方向
5. **心灵成长**：情感层面的自我提升

### 年度关键词
用3-5个词概括这一年的主题

### 年度箴言
一句话概括这一年应该把握的核心

注意事项：
- 分析要与该年份的具体分数相呼应
- 考虑这一年在整体人生轨迹中的位置
- 给出可落地执行的具体建议`,

  /**
   * 根据模型类型获取调整后的提示词
   */
  getModelSpecificInstructions: (model: 'deepseek' | 'chatgpt'): string => {
    if (model === 'deepseek') {
      return '请用中文回复，保持专业性的同时注重可读性。可以适当使用古典诗词或成语增加文采。';
    } else {
      return '请用中文回复，风格可以更加现代和亲和，同时保持专业深度。';
    }
  }
};

/**
 * 构建完整的分析提示词
 */
export function buildAnalysisPrompt(
  context: string,
  model: 'deepseek' | 'chatgpt',
  targetYear?: number
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = AI_PROMPTS.systemRole + '\n\n' + AI_PROMPTS.getModelSpecificInstructions(model);
  
  let userPrompt: string;
  
  if (targetYear) {
    userPrompt = AI_PROMPTS.yearAnalysis
      .replace('{{context}}', context)
      .replace(/\{\{targetYear\}\}/g, targetYear.toString());
  } else {
    userPrompt = AI_PROMPTS.overallAnalysis.replace('{{context}}', context);
  }
  
  return { systemPrompt, userPrompt };
}

/**
 * 验证激活码
 * 目前使用 mock 实现，后续可接入真实后端
 */
export function validateActivationCode(code: string): boolean {
  // Mock: 激活码为 111111
  const validCodes = ['111111', '888888', 'LIFELINE2024'];
  return validCodes.includes(code.trim());
}

/**
 * 验证 API Key 格式
 */
export function validateApiKey(key: string, model: 'deepseek' | 'chatgpt'): boolean {
  if (!key || key.trim().length === 0) return false;
  
  // 基本格式检查
  if (model === 'deepseek') {
    // DeepSeek API Key 通常以 sk- 开头
    return key.trim().length >= 20;
  } else {
    // OpenAI API Key 通常以 sk- 开头
    return key.trim().startsWith('sk-') && key.trim().length >= 40;
  }
}
