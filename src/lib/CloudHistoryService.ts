/**
 * 云端分析历史记录服务
 * 使用 Supabase 存储，绑定用户账号
 */

import { supabase, NO_AUTH } from './AuthService';

const LS_KEY = 'lifeline_local_history_v1';
const readLS = (): AnalysisHistoryItem[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
};
const writeLS = (items: AnalysisHistoryItem[]) => {
  localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, 50)));
};

export interface AnalysisHistoryItem {
  id: string;
  timestamp: number;
  title?: string;
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

const MAX_HISTORY_ITEMS = 50;

/**
 * 获取当前用户的所有历史记录
 */
export async function getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
  if (NO_AUTH) return readLS();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('analysis_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_HISTORY_ITEMS);

  if (error) {
    console.error('Failed to load analysis history:', error);
    return [];
  }

  // 转换数据格式
  return (data || [])
    .filter((row: any) => {
      const hasUserData = Boolean(row.input_data?.userData);
      const hasAnalysis = Boolean(row.output_data?.analysis);
      const hasContentOnly = Boolean(row.output_data?.content && !row.output_data?.analysis);
      // 过滤后端遗留的重复记录（仅包含 content 且缺少 userData）
      if (!hasUserData && hasContentOnly) return false;
      return hasUserData || hasAnalysis || hasContentOnly;
    })
    .map((row: any) => {
      const userData = row.input_data?.userData || {};
      const titleFromMeta = row.input_data?.reportTitle;
      return {
        id: row.id,
        timestamp: new Date(row.created_at).getTime(),
        title: row.output_data?.title || titleFromMeta,
        userData,
        selectedSystems: row.input_data?.selectedSystems || [],
        analysisType: row.input_data?.analysisType || 'overall',
        targetYear: row.input_data?.targetYear,
        model: row.input_data?.model || 'deepseek',
        analysis: row.output_data?.analysis || row.output_data?.content || '',
        keyYears: row.output_data?.keyYears,
        fullYearScores: row.output_data?.fullYearScores,
      };
    });
}

/**
 * 获取当前用户的报告总数
 */
export async function getAnalysisHistoryCount(): Promise<number> {
  if (NO_AUTH) return readLS().length;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('analysis_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to load analysis history count:', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * 保存新的分析记录到云端
 */
export async function saveAnalysis(
  item: Omit<AnalysisHistoryItem, 'id' | 'timestamp'>
): Promise<AnalysisHistoryItem | null> {
  if (NO_AUTH) {
    const saved: AnalysisHistoryItem = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      ...item,
    };
    const list = readLS();
    writeLS([saved, ...list]);
    return saved;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('Cannot save analysis: user not logged in');
    return null;
  }

  const { data, error } = await supabase
    .from('analysis_logs')
    .insert({
      user_id: user.id,
      analysis_type: item.selectedSystems.join('+'),
      input_data: {
        userData: item.userData,
        selectedSystems: item.selectedSystems,
        analysisType: item.analysisType,
        targetYear: item.targetYear,
        model: item.model,
      },
      output_data: {
        title: item.title,
        analysis: item.analysis,
        keyYears: item.keyYears,
        fullYearScores: item.fullYearScores,
      },
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to save analysis:', error);
    return null;
  }

  return {
    id: data.id,
    timestamp: new Date(data.created_at).getTime(),
    ...item,
  };
}

/**
 * 删除指定记录
 */
export async function deleteAnalysis(id: string): Promise<boolean> {
  if (NO_AUTH) {
    writeLS(readLS().filter(x => x.id !== id));
    return true;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('deleteAnalysis: user not logged in');
    return false;
  }

  console.log('deleteAnalysis: attempting to delete', { id, userId: user.id });

  // 先检查记录是否存在
  const { data: existingRecord } = await supabase
    .from('analysis_logs')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  console.log('deleteAnalysis: record exists?', existingRecord);

  if (!existingRecord) {
    console.error('deleteAnalysis: record not found or not owned by user');
    return false;
  }

  // 执行删除
  const { error } = await supabase
    .from('analysis_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  console.log('deleteAnalysis: delete error?', error);

  if (error) {
    console.error('Failed to delete analysis:', error);
    return false;
  }

  // 验证删除是否成功
  const { data: checkRecord } = await supabase
    .from('analysis_logs')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  console.log('deleteAnalysis: record still exists after delete?', checkRecord);

  if (checkRecord) {
    console.error('deleteAnalysis: record still exists after delete, RLS policy may be blocking');
    return false;
  }

  return true;
}

/**
 * 清空当前用户的所有历史记录
 */
export async function clearAllHistory(): Promise<boolean> {
  if (NO_AUTH) { writeLS([]); return true; }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('analysis_logs')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to clear history:', error);
    return false;
  }

  return true;
}

/**
 * 获取单条记录
 */
export async function getAnalysisById(id: string): Promise<AnalysisHistoryItem | null> {
  if (NO_AUTH) return readLS().find(x => x.id === id) || null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('analysis_logs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    console.error('Failed to get analysis:', error);
    return null;
  }

  return {
    id: data.id,
    timestamp: new Date(data.created_at).getTime(),
    title: data.output_data?.title,
    userData: data.input_data?.userData || {},
    selectedSystems: data.input_data?.selectedSystems || [],
    analysisType: data.input_data?.analysisType || 'overall',
    targetYear: data.input_data?.targetYear,
    model: data.input_data?.model || 'deepseek',
    analysis: data.output_data?.analysis || '',
    keyYears: data.output_data?.keyYears,
    fullYearScores: data.output_data?.fullYearScores,
  };
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
 * 获取历史记录摘要
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
