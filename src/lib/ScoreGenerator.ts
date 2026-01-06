import { SeededRandom } from './SeededRandom';
import type { YearScore, KeyYear } from '../components/DualLineChart';

export interface ScoreGeneratorInput {
  birthYear: number;
  seed: string;
  selectedSystems: ('bazi' | 'western' | 'ziwei')[];
  endAge?: number; // 默认99
}

/**
 * 为每个体系生成独立的事业/情感分数
 * 目前使用带种子的随机数模拟，后续可替换为真实算法
 */
function generateSystemScores(
  system: 'bazi' | 'western' | 'ziwei',
  seed: string,
  _birthYear: number,
  endAge: number
): { career: number; relationship: number }[] {
  // 每个体系使用不同的种子偏移
  const systemOffset = { bazi: 0, western: 1000, ziwei: 2000 };
  const rng = new SeededRandom(seed + system + systemOffset[system]);
  
  const scores: { career: number; relationship: number }[] = [];
  let careerScore = 50;
  let relationshipScore = 50;
  
  // 不同体系有不同的"波动特征"
  const volatility = {
    bazi: { career: 12, relationship: 10 },      // 八字：周期性较强
    western: { career: 15, relationship: 18 },   // 占星：波动更大
    ziwei: { career: 10, relationship: 12 }      // 紫薇：相对平稳
  };
  
  for (let age = 0; age <= endAge; age++) {
    // 带动量的随机游走
    const careerChange = (rng.next() - 0.5) * volatility[system].career;
    const relationshipChange = (rng.next() - 0.5) * volatility[system].relationship;
    
    careerScore += careerChange;
    relationshipScore += relationshipChange;
    
    // 加入周期性调整（模拟大运/行运等）
    const cycleEffect = Math.sin((age + systemOffset[system] / 100) * 0.3) * 5;
    careerScore += cycleEffect * 0.3;
    relationshipScore += cycleEffect * 0.2;
    
    // 限制在 15-85 范围（留出头尾空间）
    careerScore = Math.max(15, Math.min(85, careerScore));
    relationshipScore = Math.max(15, Math.min(85, relationshipScore));
    
    scores.push({
      career: Math.round(careerScore),
      relationship: Math.round(relationshipScore)
    });
  }
  
  return scores;
}

/**
 * 等权融合多个体系的分数
 */
export function generateYearScores(input: ScoreGeneratorInput): YearScore[] {
  const { birthYear, seed, selectedSystems, endAge = 99 } = input;
  
  // 生成每个体系的分数
  const systemScores: Record<string, { career: number; relationship: number }[]> = {};
  for (const system of selectedSystems) {
    systemScores[system] = generateSystemScores(system, seed, birthYear, endAge);
  }
  
  // 融合分数
  const yearScores: YearScore[] = [];
  
  for (let age = 0; age <= endAge; age++) {
    const year = birthYear + age;
    
    // 等权平均
    let careerSum = 0;
    let relationshipSum = 0;
    const contributions: YearScore['contributions'] = {};
    
    for (const system of selectedSystems) {
      const scores = systemScores[system][age];
      careerSum += scores.career;
      relationshipSum += scores.relationship;
      contributions[system as keyof typeof contributions] = scores;
    }
    
    const numSystems = selectedSystems.length;
    
    yearScores.push({
      year,
      age,
      career: Math.round(careerSum / numSystems),
      relationship: Math.round(relationshipSum / numSystems),
      contributions
    });
  }
  
  return yearScores;
}

/**
 * 自动选择关键年份
 * 算法：基于变化强度和拐点检测
 * 规则：仅在用户当前年龄-10~+20年中选出
 */
export function selectKeyYears(yearScores: YearScore[], count: number = 3, currentAge: number = 30): KeyYear[] {
  if (yearScores.length < 3) return [];
  
  interface Candidate {
    index: number;
    score: number;
    type: KeyYear['type'];
    dimension: KeyYear['dimension'];
  }
  
  const candidates: Candidate[] = [];
  
  // 定义关注的时间窗口
  const minAge = currentAge - 10;
  const maxAge = currentAge + 20;
  
  for (let i = 1; i < yearScores.length - 1; i++) {
    const prev = yearScores[i - 1];
    const curr = yearScores[i];
    const next = yearScores[i + 1];
    
    // 检查年龄是否在关注范围内
    if (curr.age < minAge || curr.age > maxAge) continue;
    
    // 一阶变化
    const dCareer = curr.career - prev.career;
    const dRelationship = curr.relationship - prev.relationship;
    
    // 二阶变化（加速度）
    const ddCareer = (next.career - curr.career) - dCareer;
    const ddRelationship = (next.relationship - curr.relationship) - dRelationship;
    
    // 重要度分数
    const importance = 0.7 * (Math.abs(dCareer) + Math.abs(dRelationship)) + 
                       0.3 * (Math.abs(ddCareer) + Math.abs(ddRelationship));
    
    // 检测类型
    let type: KeyYear['type'] = 'volatile';
    let dimension: KeyYear['dimension'] = 'both';
    
    // 事业峰值/谷值
    const careerPeak = prev.career < curr.career && curr.career > next.career;
    const careerValley = prev.career > curr.career && curr.career < next.career;
    
    // 情感峰值/谷值
    const relPeak = prev.relationship < curr.relationship && curr.relationship > next.relationship;
    const relValley = prev.relationship > curr.relationship && curr.relationship < next.relationship;
    
    if (careerPeak || relPeak) {
      type = 'peak';
      dimension = careerPeak && relPeak ? 'both' : (careerPeak ? 'career' : 'relationship');
    } else if (careerValley || relValley) {
      type = 'valley';
      dimension = careerValley && relValley ? 'both' : (careerValley ? 'career' : 'relationship');
    } else if (Math.abs(ddCareer) > 10 || Math.abs(ddRelationship) > 10) {
      type = 'turning';
      dimension = Math.abs(ddCareer) > Math.abs(ddRelationship) ? 'career' : 'relationship';
    }
    
    // 只选择有意义的点
    if (importance > 5) {
      candidates.push({ index: i, score: importance, type, dimension });
    }
  }
  
  // 按重要度排序
  candidates.sort((a, b) => b.score - a.score);
  
  // 选择时保证最小间隔（至少相隔3年）
  const selected: Candidate[] = [];
  const minGap = 3;
  
  for (const candidate of candidates) {
    if (selected.length >= count) break;
    
    const tooClose = selected.some(s => Math.abs(yearScores[s.index].age - yearScores[candidate.index].age) < minGap);
    if (!tooClose) {
      selected.push(candidate);
    }
  }
  
  // 按年份排序
  selected.sort((a, b) => a.index - b.index);
  
  // 生成关键年份对象
  return selected.map(s => {
    const ys = yearScores[s.index];
    return {
      year: ys.year,
      age: ys.age,
      type: s.type,
      dimension: s.dimension,
      score: { career: ys.career, relationship: ys.relationship },
      summary: generateSummary(s.type, s.dimension, ys)
    };
  });
}

/**
 * 生成关键年份的简短摘要（免费层）
 */
function generateSummary(type: KeyYear['type'], dimension: KeyYear['dimension'], ys: YearScore): string {
  const dimensionText = {
    career: '事业层面',
    relationship: '情感层面', 
    both: '事业与情感'
  };
  
  const typeText = {
    peak: '迎来高峰期',
    valley: '进入低谷期',
    turning: '发生重要转折',
    volatile: '经历较大波动'
  };
  
  const scoreContext = dimension === 'career' 
    ? `事业指数${ys.career}`
    : dimension === 'relationship'
    ? `情感指数${ys.relationship}`
    : `事业${ys.career}/情感${ys.relationship}`;
  
  return `${dimensionText[dimension]}${typeText[type]}（${scoreContext}）`;
}

/**
 * 生成给 AI 分析用的结构化数据
 * 关键：必须明确传递已生成的分数，防止AI再次编造
 */
export function prepareAIAnalysisContext(
  keyYears: KeyYear[],
  selectedSystems: string[],
  targetYear?: number
): string {
  const systemNames = {
    bazi: '八字',
    western: '西方占星',
    ziwei: '紫微斗数'
  };
  
  const systemList = selectedSystems.map(s => systemNames[s as keyof typeof systemNames] || s).join('、');
  
  let context = `分析体系：${systemList}（等权融合）\n`;
  context += `分析维度：事业/资源/声望 + 情感/家庭/人际（0-100分）\n\n`;
  
  // 重点强调：关键年份的分数已确定
  context += `【重要】以下关键年份的评分已由命理算法确定，请在分析中直接引用这些分数，不要自行编造新的分数：\n\n`;
  
  for (const ky of keyYears) {
    context += `★ ${ky.year}年（${ky.age}岁）- ${ky.type === 'peak' ? '高峰期' : ky.type === 'valley' ? '低谷期' : ky.type === 'turning' ? '转折期' : '波动期'}\n`;
    context += `  事业指数：${ky.score.career}/100\n`;
    context += `  情感指数：${ky.score.relationship}/100\n`;
    context += `  概述：${ky.summary}\n\n`;
  }
  
  if (targetYear) {
    const ky = keyYears.find(k => k.year === targetYear);
    if (ky) {
      context += `\n本次重点分析年份：${targetYear}年\n`;
      context += `该年事业指数为 ${ky.score.career}/100，情感指数为 ${ky.score.relationship}/100。\n`;
      context += `请围绕这些已确定的分数展开详细分析。\n`;
    }
  }
  
  return context;
}
