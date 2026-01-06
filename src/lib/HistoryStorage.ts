/**
 * 分析历史记录存储服务
 * 使用 localStorage 保存用户的分析历史
 */

export interface AnalysisHistoryItem {
  id: string;
  timestamp: number;
  userData: {
    name: string;
    gender: string;
    date: string;
    place: string;
  };
  selectedSystems: string[];
  analysisType: 'overall' | 'year';
  targetYear?: number;
  model: 'deepseek' | 'chatgpt';
  analysis: string;
  // 趋势图数据（可选，兼容旧数据）
  keyYears?: Array<{
    year: number;
    age: number;
    type: string;
    dimension: string;
    score: { career: number; relationship: number };
    summary: string;
  }>;
  fullYearScores?: Array<{
    year: number;
    age: number;
    career: number;
    relationship: number;
  }>;
}

const STORAGE_KEY = 'lifeline_analysis_history';
const MAX_HISTORY_ITEMS = 50; // 最多保存50条记录

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取所有历史记录
 */
export function getAnalysisHistory(): AnalysisHistoryItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load analysis history:', error);
    return [];
  }
}

/**
 * 保存新的分析记录
 */
export function saveAnalysis(item: Omit<AnalysisHistoryItem, 'id' | 'timestamp'>): AnalysisHistoryItem {
  const history = getAnalysisHistory();
  
  const newItem: AnalysisHistoryItem = {
    ...item,
    id: generateId(),
    timestamp: Date.now(),
  };
  
  // 添加到开头
  history.unshift(newItem);
  
  // 限制数量
  if (history.length > MAX_HISTORY_ITEMS) {
    history.splice(MAX_HISTORY_ITEMS);
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save analysis history:', error);
    // 如果存储失败（可能是配额满了），尝试删除一半旧记录
    if (history.length > 10) {
      history.splice(Math.floor(history.length / 2));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch {
        console.error('Still failed to save after cleanup');
      }
    }
  }
  
  return newItem;
}

/**
 * 删除指定记录
 */
export function deleteAnalysis(id: string): boolean {
  const history = getAnalysisHistory();
  const index = history.findIndex(item => item.id === id);
  
  if (index === -1) return false;
  
  history.splice(index, 1);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Failed to delete analysis:', error);
    return false;
  }
}

/**
 * 清空所有历史记录
 */
export function clearAllHistory(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear history:', error);
    return false;
  }
}

/**
 * 获取单条记录
 */
export function getAnalysisById(id: string): AnalysisHistoryItem | null {
  const history = getAnalysisHistory();
  return history.find(item => item.id === id) || null;
}

/**
 * 格式化时间戳为可读字符串
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    // 今天
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (diffDays === 1) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
  }
}

/**
 * 获取历史记录摘要（用于列表显示）
 */
export function getAnalysisSummary(item: AnalysisHistoryItem): string {
  const systemNames: Record<string, string> = {
    bazi: '八字',
    western: '占星',
    ziwei: '紫薇'
  };
  
  const systems = item.selectedSystems.map(s => systemNames[s] || s).join('+');
  const type = item.analysisType === 'overall' ? '整体分析' : `${item.targetYear}年分析`;
  
  return `${item.userData.name} · ${systems} · ${type}`;
}
