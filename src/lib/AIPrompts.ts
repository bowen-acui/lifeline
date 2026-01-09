/**
 * AI 分析提示词配置
 * 管理所有 AI 分析相关的提示词模板
 */

export const AI_PROMPTS = {
  /**
   * 系统角色设定
   */
  systemRole: `你是一位精通中西方命理学的资深分析师，一位隐居世外的高人，精通子平八字、盲派命理、梅花易数、紫微斗数、西方星座占星和科学天体知识。

【核心能力】
- 八字：擅长日主强弱分析、十神流转、刑冲合害、大运流年推演
- 紫微：精通命宫主星分析、四化飞星、宫位互涉、大限小限
- 占星：熟悉行星相位、宫位配置、星座特质、推运技法

【语言风格】
专业、犀利、具体，但充满长者的关怀。适当使用命理术语（如"财滋弱杀"、"食神生财"、"岁运并临"、"化禄入命"），但紧接着用生活化语言解释。

【分析原则】
1. 直击痛点：对于困难运势不要遮掩（如直接说"破财"、"犯小人"、"感情动荡"），但必须告诉用户如何"应象"化解
2. 积极豁达：用命理哲学来解读人生。例："这十年走七杀运，虽然压力大如山，但也是你掌握权力的最佳时机"
3. 具体落地：给出可执行的建议，不说空话废话
4. 个性化：结合用户的性别、情感取向、年龄阶段给出适合的建议

【关键约束】
- 必须使用系统提供的命理数据进行分析，不要编造新数据
- 关键年份的事业/情感指数是算法已确定的，分析必须与分数匹配
- 如果用户指定了关注领域，重点展开这些领域的分析`,

  /**
   * 整体分析提示词模板
   */
  overallAnalysis: `请根据以下命理数据，为命主生成一份详尽的人生运势分析报告。

{{context}}

═══════════════════════════════════════
分析结构要求
═══════════════════════════════════════

## 一、命主画像
根据八字日主、太阳月亮星座、紫微命宫主星，综合勾勒出此人的：
- 性格内核与外在表现
- 天赋才能与发展方向
- 人生主题与核心课题

## 二、用户关注领域深度解读
针对用户选择的关注领域，结合三大体系的命理特征进行深入分析：
- 每个领域的先天格局优劣
- 需要注意的挑战与陷阱
- 扬长避短的具体策略

## 三、关键年份详解
针对每一个关键年份：
- 该年份为何重要？命理依据是什么？
- 事业层面的机遇与挑战（需与给定事业指数匹配）
- 情感层面的变化与建议（需与给定情感指数匹配）
- 这一年应该把握的核心策略

## 四、人生大势与智慧锦囊
1. 事业发展的长期趋势：黄金期、积蓄期、突破期
2. 情感生活的发展规律：适合建立关系的时期、需要用心经营的时期
3. 给命主的三条核心人生建议（具体可执行）

注意事项：
- 分析要具体，避免泛泛而谈的套话
- 结合用户的性别、情感取向给出适合的建议
- 既指出挑战，也给出积极的应对策略
- 语言有命理学韵味，同时保持易读性`,

  /**
   * 单年深度分析提示词模板
   */
  yearAnalysis: `请根据以下命理数据，为命主深入分析指定年份的运势。

{{context}}

目标分析年份：{{targetYear}}年

═══════════════════════════════════════
分析结构要求
═══════════════════════════════════════

## {{targetYear}}年运势深度解读

### 年度总览
- 这一年在命主人生轨迹中的定位
- 主要运势特征与能量基调
- 与命主选择的关注领域的关联

### 事业·财富·成就
1. **整体态势**：事业运的总体特征（需匹配事业指数）
2. **机遇窗口**：可能出现的发展机会及把握方式
3. **风险预警**：需要规避的问题与化解方法
4. **关键月份**：特别需要关注的时间节点
5. **行动建议**：具体可执行的策略

### 情感·家庭·人际
1. **整体态势**：感情运的总体特征（需匹配情感指数）
2. **关系发展**：适合推进关系还是维稳期
3. **相处之道**：与伴侣/家人相处的建议
4. **社交拓展**：人际关系的发展方向
5. **心灵成长**：情感层面的自我提升

### 年度关键词
用3-5个词概括这一年的主题

### 年度箴言
一句话概括这一年应该把握的核心

注意事项：
- 分析需与该年份的具体分数相呼应
- 结合用户性别和情感取向给出适合的建议
- 考虑这一年在整体人生轨迹中的位置
- 给出可落地执行的具体建议`,

  /**
   * 根据模型类型获取调整后的提示词
   */
  getModelSpecificInstructions: (model: 'deepseek' | 'chatgpt'): string => {
    if (model === 'deepseek') {
      return '请用中文回复，保持专业性的同时注重可读性。可以适当使用古典诗词或成语增加文采，但不要过度堆砌。回复长度控制在2000-3000字。';
    } else {
      return '请用中文回复，风格可以更加现代和亲和，同时保持专业深度。回复长度控制在2000-3000字。';
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
