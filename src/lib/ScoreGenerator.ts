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
 * 包含用户完整信息、命理数据、关注方面
 */
export interface AIContextInput {
  keyYears: KeyYear[];
  selectedSystems: string[];
  targetYear?: number;
  // 用户基本信息
  userData?: {
    name?: string;
    gender?: '男' | '女';
    orientation?: string;
    birthDate?: Date;
    birthPlace?: string;
  };
  // 选择的关注方面
  selectedAspects?: string[];
  // 完整命理数据
  chartData?: {
    bazi?: {
      year: string;
      month: string;
      day: string;
      hour: string;
      dayGan: string;
      dayZhi: string;
      wuxingCount: { [key: string]: number };
      dayMasterElement: string;
      naYin?: { year: string; month: string; day: string; hour: string };
      daYun?: { startAge: number; ganZhi: string }[];
    };
    western?: {
      sunSign: string;
      moonSign: string;
      ascendant?: string;
      planets?: { name: string; sign: string }[];
    };
    ziwei?: {
      mingGong?: string;
      palaces?: { name: string; stars: { name: string; mutagen?: string }[] }[];
    };
  };
}

export function prepareAIAnalysisContext(
  keyYears: KeyYear[],
  selectedSystems: string[],
  targetYear?: number,
  userData?: AIContextInput['userData'],
  selectedAspects?: string[],
  chartData?: AIContextInput['chartData']
): string {
  const systemNames = {
    bazi: '八字',
    western: '西方占星',
    ziwei: '紫微斗数'
  };
  
  const aspectNames: Record<string, string> = {
    career: '事业发展',
    emotion: '情感婚恋',
    family: '家庭亲情',
    economy: '财富经济',
    social: '社交人脉',
    talent: '天赋潜能',
    spiritual: '精神成长'
  };
  
  const systemList = selectedSystems.map(s => systemNames[s as keyof typeof systemNames] || s).join('、');
  
  let context = '';
  
  // ========== 一、用户基本信息 ==========
  context += `═══════════════════════════════════════\n`;
  context += `一、命主基本信息\n`;
  context += `═══════════════════════════════════════\n`;
  
  if (userData) {
    if (userData.name) context += `姓名：${userData.name}\n`;
    if (userData.gender) context += `性别：${userData.gender}\n`;
    if (userData.orientation) context += `情感取向：${userData.orientation}\n`;
    if (userData.birthDate) {
      const d = userData.birthDate;
      context += `出生时间：${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}时${d.getMinutes()}分\n`;
      const currentAge = new Date().getFullYear() - d.getFullYear();
      context += `当前年龄：${currentAge}岁\n`;
    }
    if (userData.birthPlace) context += `出生地点：${userData.birthPlace}\n`;
  }
  context += '\n';
  
  // ========== 二、用户关注的领域 ==========
  context += `═══════════════════════════════════════\n`;
  context += `二、用户关注的人生领域\n`;
  context += `═══════════════════════════════════════\n`;
  
  if (selectedAspects && selectedAspects.length > 0) {
    const aspectLabels = selectedAspects.map(a => aspectNames[a] || a);
    context += `重点关注：${aspectLabels.join('、')}\n`;
    context += `请在分析中着重展开这些领域，给予具体、深入的解读和建议。\n`;
  } else {
    context += `用户未指定特定领域，请进行全方位综合分析。\n`;
  }
  context += '\n';
  
  // ========== 三、命理体系数据 ==========
  context += `═══════════════════════════════════════\n`;
  context += `三、命理数据（${systemList}）\n`;
  context += `═══════════════════════════════════════\n\n`;
  
  // 八字数据
  if (chartData?.bazi && selectedSystems.includes('bazi')) {
    context += `【八字命盘】\n`;
    context += `四柱：${chartData.bazi.year} ${chartData.bazi.month} ${chartData.bazi.day} ${chartData.bazi.hour}\n`;
    context += `日主：${chartData.bazi.dayGan}（${chartData.bazi.dayMasterElement}）\n`;
    context += `五行分布：`;
    const wuxing = chartData.bazi.wuxingCount;
    context += `木${wuxing['木'] || 0} 火${wuxing['火'] || 0} 土${wuxing['土'] || 0} 金${wuxing['金'] || 0} 水${wuxing['水'] || 0}\n`;
    if (chartData.bazi.naYin) {
      context += `纳音：年${chartData.bazi.naYin.year}、日${chartData.bazi.naYin.day}\n`;
    }
    if (chartData.bazi.daYun && chartData.bazi.daYun.length > 0) {
      context += `大运（前五运）：${chartData.bazi.daYun.slice(0, 5).map(d => `${d.startAge}岁起${d.ganZhi}`).join('→')}\n`;
    }
    context += '\n';
  }
  
  // 西方占星数据
  if (chartData?.western && selectedSystems.includes('western')) {
    context += `【西方星盘】\n`;
    context += `太阳星座：${chartData.western.sunSign}\n`;
    context += `月亮星座：${chartData.western.moonSign}\n`;
    if (chartData.western.ascendant) {
      context += `上升星座：${chartData.western.ascendant}\n`;
    }
    if (chartData.western.planets && chartData.western.planets.length > 0) {
      const keyPlanets = chartData.western.planets.slice(0, 5);
      context += `主要行星：${keyPlanets.map(p => `${p.name}${p.sign}`).join('、')}\n`;
    }
    context += '\n';
  }
  
  // 紫微数据
  if (chartData?.ziwei && selectedSystems.includes('ziwei')) {
    context += `【紫微命盘】\n`;
    if (chartData.ziwei.mingGong) {
      context += `命宫：${chartData.ziwei.mingGong}\n`;
    }
    if (chartData.ziwei.palaces) {
      const mingPalace = chartData.ziwei.palaces.find(p => p.name === '命宫');
      if (mingPalace) {
        const mainStars = mingPalace.stars.slice(0, 6);
        context += `命宫主星：${mainStars.map(s => s.name + (s.mutagen ? `[${s.mutagen}]` : '')).join('、')}\n`;
      }
      // 找出有四化的重要星曜
      const sihua = chartData.ziwei.palaces
        .flatMap(p => p.stars.filter(s => s.mutagen).map(s => `${s.name}化${s.mutagen}在${p.name}`))
        .slice(0, 4);
      if (sihua.length > 0) {
        context += `四化飞星：${sihua.join('、')}\n`;
      }
    }
    context += '\n';
  }
  
  // ========== 四、关键年份分析数据 ==========
  context += `═══════════════════════════════════════\n`;
  context += `四、关键年份（命理算法已确定分数）\n`;
  context += `═══════════════════════════════════════\n\n`;
  
  context += `【重要约束】以下关键年份的评分已由命理算法确定，请在分析中直接引用这些分数，不要自行编造：\n\n`;
  
  for (const ky of keyYears) {
    context += `★ ${ky.year}年（${ky.age}岁）- ${ky.type === 'peak' ? '高峰期' : ky.type === 'valley' ? '低谷期' : ky.type === 'turning' ? '转折期' : '波动期'}\n`;
    context += `  事业指数：${ky.score.career}/100\n`;
    context += `  情感指数：${ky.score.relationship}/100\n`;
    context += `  概述：${ky.summary}\n\n`;
  }
  
  if (targetYear) {
    const ky = keyYears.find(k => k.year === targetYear);
    if (ky) {
      context += `\n【本次重点分析年份】${targetYear}年\n`;
      context += `该年事业指数为 ${ky.score.career}/100，情感指数为 ${ky.score.relationship}/100。\n`;
      context += `请围绕这些已确定的分数展开详细分析。\n`;
    }
  }
  
  return context;
}
