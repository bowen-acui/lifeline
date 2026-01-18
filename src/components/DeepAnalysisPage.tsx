import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import { type AnalysisHistoryItem, formatTimestamp, deleteAnalysis } from '../lib/CloudHistoryService';
import { callAIService } from '../lib/AIService';
import { BaseChartData } from '../lib/AstrologyEngine';
import LifeKLineChart from './LifeKLineChart';
import { UserInfo } from './Auth';
import type { User } from '@supabase/supabase-js';
import { trackEvent, trackExposure } from '../lib/Tracking';

interface DeepAnalysisPageProps {
  historyList: AnalysisHistoryItem[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  onChatMessagesChange: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) => void;
  chatInput: string;
  onChatInputChange: (input: string) => void;
  isLoading: boolean;
  onSetLoading: (loading: boolean) => void;
  onBack: () => void;
  onNewProfile: () => void;
  aiModel: 'deepseek' | 'chatgpt';
  apiKey?: string;
  userData: { date: Date; place: string; name: string; gender: '男' | '女'; orientation?: string } | null;
  chartData: BaseChartData | null;
  user: User | null;
  remainingCalls: number;
  onRemainingCallsChange: (calls: number) => void;
  onLogout: () => void;
  onShowAuthModal: () => void;
  recentProfiles?: Array<{
    name: string;
    gender: '男' | '女';
    date: string;
    place: string;
    createdAt: number;
  }>;
  onOpenRecentProfile?: (profile: {
    name: string;
    gender: '男' | '女';
    date: string;
    place: string;
    createdAt: number;
  }) => void;
  onDeleteRecentProfile?: (profile: {
    name: string;
    gender: '男' | '女';
    date: string;
    place: string;
    createdAt: number;
  }) => void;
  onHistoryListRefresh?: () => Promise<void> | void;
}

// 深度分析师的系统提示词
const DEEP_ANALYST_SYSTEM_PROMPT = `你是一位精通多种命理体系的资深分析师，同时具备深厚的人文关怀。你熟悉八字命理、西方占星术和紫微斗数，能够从多个维度为用户提供深刻的人生洞察。

你的特点：
- 言辞克制、不啰嗦，直击要点
- 观点鲜明但不武断
- 善于发现不同命理体系之间的共通点和互补之处
- 在专业分析的基础上，给予温暖但不煽情的人文关怀
- 回答简洁有力，避免空泛的客套话
- 【重要】不要在回复末尾添加任何关于"由AI生成"、"由DeepSeek生成"、"仅供参考"等声明性尾缀，直接以分析内容结束即可

当用户询问命理相关问题时，请基于提供的分析报告上下文给出专业见解。`;

export default function DeepAnalysisPage({
  historyList,
  selectedIds,
  onSelectIds,
  chatMessages,
  onChatMessagesChange,
  chatInput,
  onChatInputChange,
  isLoading,
  onSetLoading,
  onBack,
  onNewProfile,
  aiModel,
  apiKey,
  userData,
  chartData,
  user,
  remainingCalls,
  onRemainingCallsChange,
  onLogout,
  onShowAuthModal,
  recentProfiles,
  onOpenRecentProfile,
  onDeleteRecentProfile,
  onHistoryListRefresh,
}: DeepAnalysisPageProps) {
  const formatHistoryTitle = useCallback((item: AnalysisHistoryItem) => {
    if (item.title) return item.title;
    const name = item.userData?.name?.trim() || '未命名';
    const gender = item.userData?.gender?.trim() || '';
    return [name, gender].filter(Boolean).join(' ');
  }, []);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const compareButtonRef = useRef<HTMLButtonElement>(null);
  const synastryButtonRef = useRef<HTMLButtonElement>(null);
  const klineButtonRef = useRef<HTMLButtonElement>(null);
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const exposureTrackedRef = useRef<Set<string>>(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef<number | null>(null);
  const resizeStartWidthRef = useRef<number | null>(null);
  
  // 历史详情悬窗
  const [viewingHistoryItem, setViewingHistoryItem] = useState<AnalysisHistoryItem | null>(null);
  
  // 复制提示
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // 点赞/点踩记录
  const [messageReactions, setMessageReactions] = useState<Record<number, 'like' | 'dislike' | null>>({});
  
  // 分享模态框
  const [shareModalIndex, setShareModalIndex] = useState<number | null>(null);
  
  // Toast提示
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // 显示toast
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2000);
  }, []);
  
  // 选中文本追问
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);

  // 快捷按钮曝光
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const trackingMap = new Map<string, { eventName: string; label: string }>([
      ['compare', { eventName: 'deep_analysis_compare_exposure', label: '对比分析' }],
      ['synastry', { eventName: 'deep_analysis_synastry_exposure', label: '合盘' }],
      ['kline', { eventName: 'deep_analysis_kline_exposure', label: '绘制K线图' }],
      ['clear', { eventName: 'deep_analysis_clear_exposure', label: '清空对话' }],
    ]);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target as HTMLElement;
        const trackId = target.getAttribute('data-track-id');
        if (!trackId || exposureTrackedRef.current.has(trackId)) return;
        const meta = trackingMap.get(trackId);
        if (!meta) return;
        exposureTrackedRef.current.add(trackId);
        void trackExposure(target, {
          eventName: meta.eventName,
          page: 'deepAnalysis',
          component: 'DeepAnalysisPage',
          metadata: { label: meta.label },
        });
        observer.unobserve(target);
      });
    }, { threshold: 0.6 });

    const items: Array<{ id: string; ref: { current: HTMLButtonElement | null } }> = [
      { id: 'compare', ref: compareButtonRef },
      { id: 'synastry', ref: synastryButtonRef },
      { id: 'kline', ref: klineButtonRef },
      { id: 'clear', ref: clearButtonRef },
    ];

    items.forEach(({ id, ref }) => {
      const element = ref.current;
      if (!element || exposureTrackedRef.current.has(id)) return;
      element.setAttribute('data-track-id', id);
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [chatMessages.length]);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 左侧栏拖拽调整宽度
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing || resizeStartXRef.current === null || resizeStartWidthRef.current === null) return;
      const delta = event.clientX - resizeStartXRef.current;
      const nextWidth = Math.min(420, Math.max(220, resizeStartWidthRef.current + delta));
      setSidebarWidth(nextWidth);
    };

    const handleMouseUp = () => {
      if (!isResizing) return;
      setIsResizing(false);
      resizeStartXRef.current = null;
      resizeStartWidthRef.current = null;
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 复制消息内容
  const handleCopy = async (content: string, index: number) => {
    let cleanContent = content;
    
    // 处理K线数据 - 提取所有文本内容
    if (content.startsWith('__KLINE_DATA__')) {
      try {
        const klineData = JSON.parse(content.replace('__KLINE_DATA__', ''));
        const textParts: string[] = [];
        
        if (klineData.charts && Array.isArray(klineData.charts)) {
          klineData.charts.forEach((chart: { title?: string; summary?: string; keyYears?: Array<{ age: number; event: string }>; data?: Array<{ age: number; description?: string }> }) => {
            if (chart.title) textParts.push(`【${chart.title}】`);
            if (chart.summary) textParts.push(chart.summary);
            if (chart.keyYears && Array.isArray(chart.keyYears)) {
              textParts.push('\n关键年份:');
              chart.keyYears.forEach(ky => {
                textParts.push(`  ${ky.age}岁: ${ky.event}`);
              });
            }
            if (chart.data && Array.isArray(chart.data)) {
              const descriptions = chart.data
                .filter(d => d.description)
                .map(d => `${d.age}岁: ${d.description}`);
              if (descriptions.length > 0) {
                textParts.push('\n详细描述:');
                textParts.push(...descriptions);
              }
            }
            textParts.push('');
          });
        }
        
        cleanContent = textParts.join('\n').trim() || '【K线图数据】';
      } catch {
        cleanContent = '【K线图数据】';
      }
    }
    
    await navigator.clipboard.writeText(cleanContent);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // 点赞/点踩
  const handleReaction = (index: number, reaction: 'like' | 'dislike') => {
    const current = messageReactions[index];
    const newReaction = current === reaction ? null : reaction;
    setMessageReactions({ ...messageReactions, [index]: newReaction });
    // 后台收集数据 (可以发送到后端)
    console.log(`Message ${index} reaction: ${newReaction}`);
  };

  // 生成分享图片
  const handleShare = async (index: number) => {
    setShareModalIndex(index);
  };

  // 复制对话截图到剪贴板
  const copyScreenshot = useCallback(async () => {
    if (shareModalIndex === null) return;
    
    // 找到对应消息的 DOM 元素并截图
    const messageElement = document.querySelector(`[data-message-index="${shareModalIndex}"]`);
    if (!messageElement) {
      alert('无法找到消息内容');
      return;
    }

    // 创建包装容器用于截图
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: 800px;
      padding: 40px;
      background: #FAF7F2;
      font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "WenQuanYi Micro Hei", sans-serif;
      color: #2C2C2C;
    `;

    // 标题区域
    const header = document.createElement('div');
    header.innerHTML = `
      <div style="margin-bottom: 20px;">
        <div style="font-size: 22px; font-weight: 700; color: #2C2C2C; letter-spacing: -0.02em; font-family: 'Merriweather', serif;">LIFELINE 深度求解</div>
      </div>
      <div style="height: 2px; background: linear-gradient(90deg, #D4AF37, #B8860B); margin-bottom: 28px;"></div>
    `;
    wrapper.appendChild(header);

    // 克隆消息内容
    const contentClone = messageElement.cloneNode(true) as HTMLElement;
    contentClone.style.cssText = `
      font-size: 15px;
      line-height: 1.85;
      color: #2C2C2C;
    `;
    // 移除不需要的属性
    contentClone.removeAttribute('data-message-index');
    wrapper.appendChild(contentClone);

    // 底部区域
    const footer = document.createElement('div');
    footer.innerHTML = `
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid rgba(44,44,44,0.12);">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 20px; font-weight: 700; color: #2C2C2C; letter-spacing: -0.02em; font-family: 'Merriweather', serif;">LIFELINE</div>
            <div style="font-size: 13px; color: rgba(44,44,44,0.5); margin-top: 6px;">命运的架构</div>
            <div style="font-size: 11px; font-family: monospace; color: rgba(44,44,44,0.4); margin-top: 4px;">lifeline.app</div>
          </div>
          <div style="text-align: center; color: rgba(44,44,44,0.35); font-size: 10px;">
            <div style="width: 54px; height: 54px; border: 1.5px solid rgba(44,44,44,0.15); display: flex; align-items: center; justify-content: center; margin-bottom: 6px; border-radius: 4px;">
              <span style="font-family: monospace; font-size: 11px; color: rgba(44,44,44,0.3);">QR</span>
            </div>
            扫码访问
          </div>
        </div>
      </div>
    `;
    wrapper.appendChild(footer);

    document.body.appendChild(wrapper);

    try {
      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#FAF7F2',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('截图已复制到剪贴板');
          } catch (clipboardError) {
            console.error('剪贴板写入失败:', clipboardError);
            const link = document.createElement('a');
            link.download = `lifeline-share-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('剪贴板不可用，已下载图片');
          }
        }
      }, 'image/png');
    } catch (error) {
      console.error('生成截图失败:', error);
      alert('生成截图失败');
    } finally {
      document.body.removeChild(wrapper);
      setShareModalIndex(null);
    }
  }, [shareModalIndex, showToast]);

  // 分享对话链接
  const shareLink = useCallback(async () => {
    // 生成分享链接（目前使用当前页面URL，未来可以生成带参数的链接）
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('链接已复制到剪贴板');
    } catch (error) {
      console.error('复制链接失败:', error);
      // 降级方案
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('链接已复制');
    }
    setShareModalIndex(null);
  }, [showToast]);

  // 监听文本选择
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setSelectionPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
    } else {
      setSelectedText('');
      setSelectionPosition(null);
    }
  }, []);

  // 追问选中文本
  const handleQuoteAsk = () => {
    if (selectedText) {
      const quotedMessage = `关于「${selectedText}」，请详细解释一下。`;
      onChatInputChange(quotedMessage);
      inputRef.current?.focus();
      setSelectedText('');
      setSelectionPosition(null);
    }
  };

  // 获取选中的历史记录
  const selectedHistories = historyList.filter(h => selectedIds.includes(h.id));

  // 构建上下文
  const buildContext = () => {
    if (selectedHistories.length === 0) return '';
    return selectedHistories.map(h => {
      return `【${formatHistoryTitle(h)}】
${h.analysis}`;
    }).join('\n\n---\n\n');
  };

  // 构建K线图上下文（包含报告标题和时间）
  const buildKLineContext = () => {
    if (selectedHistories.length === 0) return { context: '', titles: [] };
    const titles = selectedHistories.map(h => ({
      title: formatHistoryTitle(h),
      timestamp: formatTimestamp(h.timestamp)
    }));
    const context = selectedHistories.map((h, i) => {
      return `报告${i + 1}: 【${titles[i].title}】(生成时间: ${titles[i].timestamp})\n${h.analysis}`;
    }).join('\n\n---\n\n');
    return { context, titles };
  };

  // 发送消息
  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // 检查是否登录
    if (!user) {
      onShowAuthModal();
      return;
    }

    // 检查剩余次数
    if (remainingCalls <= 0) {
      onChatMessagesChange([...chatMessages, { 
        role: 'assistant', 
        content: '⚠️ 调用次数已用完，请关注我的小红书/公众号私信获取更多次数' 
      }]);
      return;
    }

    const newUserMessage = { role: 'user' as const, content: message };
    const updatedMessages = [...chatMessages, newUserMessage];
    onChatMessagesChange(updatedMessages);
    onChatInputChange('');
    onSetLoading(true);

    try {
      const context = buildContext();
      const systemPrompt = context 
        ? `${DEEP_ANALYST_SYSTEM_PROMPT}\n\n以下是用户选中的命理分析报告，请基于这些信息回答问题：\n\n${context}`
        : DEEP_ANALYST_SYSTEM_PROMPT;

      // 构建包含历史消息的提示词
      const historyContext = chatMessages.length > 0 
        ? '\n\n之前的对话记录：\n' + chatMessages.map(m => `${m.role === 'user' ? '用户' : '分析师'}: ${m.content}`).join('\n')
        : '';

      const result = await callAIService({
        systemPrompt: systemPrompt + historyContext,
        userPrompt: message,
        model: aiModel,
        apiKey,
        userData,
        chartData,
        callType: 'chat',
        metadata: { action: '对话/问答' },
      });

      if (result.success && result.analysis) {
        onChatMessagesChange([...updatedMessages, { role: 'assistant', content: result.analysis }]);
        if (typeof result.remainingCalls === 'number') {
          onRemainingCallsChange(result.remainingCalls);
        }
      } else {
        onChatMessagesChange([...updatedMessages, { role: 'assistant', content: '抱歉，分析生成失败，请重试。' }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      onChatMessagesChange([...updatedMessages, { role: 'assistant', content: '发生错误，请重试。' }]);
    } finally {
      onSetLoading(false);
    }
  };

  // 对比分析 shortcut
  const handleCompareAnalysis = async () => {
    if (selectedHistories.length < 2) {
      onChatMessagesChange([...chatMessages, { 
        role: 'assistant', 
        content: '⚠️ 请至少选择2份分析报告才能进行对比分析。' 
      }]);
      return;
    }

    // 检查是否登录
    if (!user) {
      onShowAuthModal();
      return;
    }

    // 检查剩余次数
    if (remainingCalls <= 0) {
      onChatMessagesChange([...chatMessages, { 
        role: 'assistant', 
        content: '⚠️ 调用次数已用完，请关注我的小红书/公众号私信获取更多次数' 
      }]);
      return;
    }

    onSetLoading(true);
    const context = buildContext();
    const systemPrompt = `${DEEP_ANALYST_SYSTEM_PROMPT}\n\n以下是需要对比的命理分析报告：\n\n${context}`;
    const userPrompt = `请对比分析以上${selectedHistories.length}份命理报告，指出其中的重合点和差异点。重点关注：
1. 各体系对同一人格特质的描述是否一致
2. 对事业、感情运势的预测是否有共识
3. 各体系独特的洞察点
4. 可能存在的矛盾之处及如何理解

请用简洁有力的语言总结。`;

    // 构建选中的报告标题列表
    const selectedTitles = selectedHistories.map(h => formatHistoryTitle(h)).join('、');
    const newMessages = [...chatMessages, { role: 'user' as const, content: `【对比分析】${selectedTitles}` }];
    onChatMessagesChange(newMessages);

    try {
      const result = await callAIService({
        systemPrompt,
        userPrompt,
        model: aiModel,
        apiKey,
        userData,
        chartData,
        callType: 'chat',
        metadata: { action: '对比分析' },
      });

      if (result.success && result.analysis) {
        onChatMessagesChange([...newMessages, { role: 'assistant', content: result.analysis }]);
        if (typeof result.remainingCalls === 'number') {
          onRemainingCallsChange(result.remainingCalls);
        }
      } else {
        onChatMessagesChange([...newMessages, { role: 'assistant', content: '对比分析生成失败，请重试。' }]);
      }
    } catch (error) {
      console.error('Compare error:', error);
      onChatMessagesChange([...newMessages, { role: 'assistant', content: '发生错误，请重试。' }]);
    } finally {
      onSetLoading(false);
    }
  };

  // 合盘分析 shortcut
  const handleSynastryAnalysis = async () => {
    if (selectedHistories.length < 2) {
      onChatMessagesChange([...chatMessages, { 
        role: 'assistant', 
        content: '⚠️ 合盘分析需要选择至少2个命盘历史记录。' 
      }]);
      return;
    }
    if (selectedHistories.length > 4) {
      onChatMessagesChange([...chatMessages, { 
        role: 'assistant', 
        content: '⚠️ 合盘分析最多支持4个命盘的比较。' 
      }]);
      return;
    }

    // 检查是否登录
    if (!user) {
      onShowAuthModal();
      return;
    }

    // 检查剩余次数
    if (remainingCalls <= 0) {
      onChatMessagesChange([...chatMessages, { 
        role: 'assistant', 
        content: '⚠️ 调用次数已用完，请关注我的小红书/公众号私信获取更多次数' 
      }]);
      return;
    }

    onSetLoading(true);
    const context = buildContext();
    const names = selectedHistories.map(h => formatHistoryTitle(h)).join('、');
    const systemPrompt = `${DEEP_ANALYST_SYSTEM_PROMPT}\n\n以下是需要进行合盘分析的命理报告：\n\n${context}`;
    const userPrompt = `请对${names}进行合盘分析，重点关注：
1. 性格与行事风格的契合度：分析彼此之间的相似与互补
2. 相处模式建议：如何发挥各自优势，避免冲突
3. 适合的关系定位：是更适合做朋友、伴侣、合作伙伴，还是其他关系
4. 潜在的挑战与成长机会：在互动中需要注意什么

请用简洁有力的语言给出分析。`;

    const newMessages = [...chatMessages, { role: 'user' as const, content: `【合盘分析】${names}` }];
    onChatMessagesChange(newMessages);

    try {
      const result = await callAIService({
        systemPrompt,
        userPrompt,
        model: aiModel,
        apiKey,
        userData,
        chartData,
        callType: 'synastry',
        metadata: { action: '合盘分析' },
      });

      if (result.success && result.analysis) {
        onChatMessagesChange([...newMessages, { role: 'assistant', content: result.analysis }]);
        if (typeof result.remainingCalls === 'number') {
          onRemainingCallsChange(result.remainingCalls);
        }
      } else {
        onChatMessagesChange([...newMessages, { role: 'assistant', content: `合盘分析生成失败：${result.error || '请重试。'}` }]);
      }
    } catch (error) {
      console.error('Synastry error:', error);
      onChatMessagesChange([...newMessages, { role: 'assistant', content: '发生错误，请重试。' }]);
    } finally {
      onSetLoading(false);
    }
  };

  // 绘制K线图 shortcut
  const handleDrawKLine = async () => {
    if (selectedHistories.length === 0) {
      onChatMessagesChange([...chatMessages, { 
        role: 'assistant', 
        content: '⚠️ 请至少选择1份分析报告才能绘制K线图。' 
      }]);
      return;
    }

    // 检查是否登录
    if (!user) {
      onShowAuthModal();
      return;
    }

    // 检查剩余次数
    if (remainingCalls <= 0) {
      onChatMessagesChange([...chatMessages, { 
        role: 'assistant', 
        content: '⚠️ 调用次数已用完，请关注我的小红书/公众号私信获取更多次数' 
      }]);
      return;
    }

    onSetLoading(true);
    const { context, titles } = buildKLineContext();
    const reportCount = selectedHistories.length;
    const systemPrompt = `${DEEP_ANALYST_SYSTEM_PROMPT}

你需要基于命理分析生成人生K线图数据。请分析报告中的运势信息，生成从出生到80岁的运势数据。

重要：用户选中了 ${reportCount} 份报告，请为每一份报告分别生成一个K线图，共 ${reportCount} 个图表。
报告标题列表：
${titles.map((t, i) => `${i + 1}. ${t.title} (生成时间: ${t.timestamp})`).join('\n')}

请以JSON格式返回，格式如下：
{
  "charts": [
    {
      "title": "报告标题（必须使用上面的报告标题）",
      "subtitle": "生成时间",
      "summary": "整体运势解读，50-100字概括一生运势走向",
      "keyYears": [
        { "age": 28, "event": "事业转折点" },
        { "age": 35, "event": "财运高峰" }
      ],
      "data": [
        { "age": 0, "open": 50, "high": 55, "low": 45, "close": 52, "description": "童年期，家庭庇护" },
        { "age": 5, "open": 52, "high": 60, "low": 48, "close": 58, "description": "少年期，学业顺遂" },
        ...每5年一个数据点直到80岁
      ]
    }
  ]
}

规则：
- 必须生成 ${reportCount} 个图表，每个报告对应一个
- title: 必须使用上面提供的报告标题
- subtitle: 生成时间
- open: 该年龄段开始时的运势值(0-100)
- high: 该年龄段最高运势值
- low: 该年龄段最低运势值
- close: 该年龄段结束时的运势值
- description: 该年龄段的简短说明（10字以内）
- keyYears: 标注3-5个重要转折年份
- summary: 基于命理分析的整体运势解读
- 阳线(close>open)表示运势上升期，阴线(close<open)表示运势下降期

只返回JSON，不要其他文字。`;

    const userPrompt = `基于以下命理分析报告，生成人生K线图数据：\n\n${context}`;

    const newMessages = [...chatMessages, { role: 'user' as const, content: '【绘制K线图】请为选中的报告生成人生K线图' }];
    onChatMessagesChange(newMessages);

    try {
      const result = await callAIService({
        systemPrompt,
        userPrompt,
        model: aiModel,
        apiKey,
        userData,
        chartData,
        callType: 'kline',
        metadata: { action: '绘制K线图' },
      });

      if (result.success && result.analysis) {
        // 尝试解析 K线数据
        try {
          const jsonMatch = result.analysis.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const klineData = JSON.parse(jsonMatch[0]);
            // 将K线图数据作为特殊消息存储
            onChatMessagesChange([...newMessages, { 
              role: 'assistant', 
              content: `__KLINE_DATA__${JSON.stringify(klineData)}` 
            }]);
            if (typeof result.remainingCalls === 'number') {
              onRemainingCallsChange(result.remainingCalls);
            }
          } else {
            onChatMessagesChange([...newMessages, { role: 'assistant', content: 'K线数据生成失败，请重试。' }]);
          }
        } catch (parseError) {
          console.error('Parse K-line data error:', parseError);
          onChatMessagesChange([...newMessages, { role: 'assistant', content: 'K线数据解析失败，请重试。' }]);
        }
      } else {
        onChatMessagesChange([...newMessages, { role: 'assistant', content: 'K线图生成失败，请重试。' }]);
      }
    } catch (error) {
      console.error('K-line error:', error);
      onChatMessagesChange([...newMessages, { role: 'assistant', content: '发生错误，请重试。' }]);
    } finally {
      onSetLoading(false);
    }
  };

  // 切换历史选择
  const toggleHistorySelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectIds(selectedIds.filter(i => i !== id));
    } else {
      onSelectIds([...selectedIds, id]);
    }
  };

  // 渲染消息内容
  const renderMessageContent = (content: string) => {
    // 检查是否是K线图数据
    if (content.startsWith('__KLINE_DATA__')) {
      try {
        const klineData = JSON.parse(content.replace('__KLINE_DATA__', ''));
        return (
          <div className="space-y-6">
            {klineData.charts?.map((chart: { 
              title: string; 
              summary?: string;
              keyYears?: Array<{ age: number; event: string }>;
              data: Array<{ age: number; open: number; high: number; low: number; close: number; description?: string }> 
            }, index: number) => (
              <div key={index} className="border border-ink/10 p-4 bg-paper">
                <LifeKLineChart chartData={chart} />
              </div>
            ))}
          </div>
        );
      } catch (e) {
        return <p className="text-red-500">K线图渲染失败</p>;
      }
    }

    // 普通 Markdown 渲染
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({children}) => <h1 className="text-lg font-serif font-bold text-ink mb-2 mt-4">{children}</h1>,
          h2: ({children}) => <h2 className="text-base font-serif font-bold text-ink mb-2 mt-3">{children}</h2>,
          h3: ({children}) => <h3 className="text-sm font-serif font-bold text-ink mb-1 mt-2">{children}</h3>,
          p: ({children}) => <p className="text-sm font-serif text-ink/80 leading-relaxed mb-2">{children}</p>,
          ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-2 ml-2 text-sm">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal list-inside space-y-1 mb-2 ml-2 text-sm">{children}</ol>,
          li: ({children}) => <li className="text-sm font-serif text-ink/80">{children}</li>,
          strong: ({children}) => <strong className="font-bold text-ink">{children}</strong>,
          blockquote: ({children}) => <blockquote className="border-l-2 border-accent bg-accent/5 pl-3 py-1 my-2 italic text-ink/70 text-sm">{children}</blockquote>,
        }}
      >{content}</ReactMarkdown>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-ink/10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-serif text-ink/60 hover:text-ink transition-colors"
        >
          <span>←</span>
          <span>返回</span>
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-serif font-bold tracking-tighter">LIFELINE</h2>
          <p className="text-[10px] font-mono text-ink/40 uppercase tracking-[0.3em] mt-1">深度求解</p>
        </div>
        <div className="min-w-[120px] flex justify-end">
          {user ? (
            <UserInfo
              user={user}
              remainingCalls={remainingCalls}
              onLogout={onLogout}
              recentProfiles={recentProfiles}
              onOpenRecentProfile={onOpenRecentProfile}
              onDeleteRecentProfile={onDeleteRecentProfile}
            />
          ) : (
            <button
              onClick={onShowAuthModal}
              className="px-4 py-2 text-xs font-serif text-ink/60 hover:text-accent border border-ink/20 hover:border-accent transition-all"
            >
              登录
            </button>
          )}
        </div>
      </div>

      {/* 主体两栏布局 */}
      <div className="flex gap-0 flex-1 overflow-hidden">
        {/* 左栏 - 历史列表 */}
        <div
          className="border-r border-ink/10 bg-paper flex flex-col relative"
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* 新建命理档案按钮 */}
          <div className="h-16 px-3 border-b border-ink/10 flex items-center">
            <button
              onClick={onNewProfile}
              className="w-full h-9 border border-ink/20 text-sm font-serif hover:bg-ink/5 transition-colors"
            >
              + 新建命理档案
            </button>
          </div>
          <div
            className={`absolute top-0 right-0 h-full w-1.5 ${
              isResizing ? 'bg-ink/10' : 'bg-transparent hover:bg-ink/10'
            } cursor-col-resize transition-colors`}
            onMouseDown={(event) => {
              event.preventDefault();
              setIsResizing(true);
              resizeStartXRef.current = event.clientX;
              resizeStartWidthRef.current = sidebarWidth;
            }}
            aria-label="调整左侧栏宽度"
            role="separator"
          />

          {/* 历史列表 */}
          <div className="flex-1 overflow-y-auto">
            {historyList.length === 0 ? (
              <p className="p-4 text-center text-ink/40 text-sm">暂无历史记录</p>
            ) : (
              <div className="divide-y divide-ink/10">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleHistorySelection(item.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedIds.includes(item.id)
                        ? 'bg-accent/10 border-l-2 border-l-accent'
                        : 'hover:bg-ink/5'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className={`w-4 h-4 mt-0.5 border flex-shrink-0 flex items-center justify-center ${
                          selectedIds.includes(item.id) ? 'bg-accent border-accent' : 'border-ink/20'
                        }`}
                      >
                        {selectedIds.includes(item.id) && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void trackEvent({
                              eventName: 'open_report_detail',
                              eventType: 'click',
                              page: 'deepAnalysis',
                              component: 'DeepAnalysisPage',
                              element: e.currentTarget,
                              metadata: {
                                reportId: item.id,
                                title: item.title,
                              },
                            });
                            setViewingHistoryItem(item);
                          }}
                          className="font-serif text-xs truncate text-left w-full text-accent underline decoration-accent/30 hover:decoration-accent transition-colors"
                        >
                          {formatHistoryTitle(item)}
                        </button>
                        <p className="text-[10px] text-ink/40 font-mono mt-0.5">
                          {formatTimestamp(item.timestamp)}
                        </p>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!window.confirm('确定要删除这条报告吗？此操作不可撤销。')) return;
                          const success = await deleteAnalysis(item.id);
                          if (success) {
                            if (selectedIds.includes(item.id)) {
                              onSelectIds(selectedIds.filter(i => i !== item.id));
                            }
                            if (viewingHistoryItem?.id === item.id) {
                              setViewingHistoryItem(null);
                            }
                            await onHistoryListRefresh?.();
                          } else {
                            alert('删除失败，请重试');
                          }
                        }}
                        className="ml-auto text-ink/30 hover:text-ink/60 text-xs leading-none"
                        aria-label="删除报告"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 选中数量 */}
          <div className="p-3 border-t border-ink/10 text-xs text-ink/40 text-center">
            已选择 {selectedIds.length} 项
          </div>
        </div>

        {/* 右栏 - 对话框 */}
        <div className="flex-1 bg-paper flex flex-col overflow-hidden">
          {/* Shortcut 按钮区 */}
          <div className="h-16 px-6 border-b border-ink/10 flex items-center gap-3">
            <button
              ref={compareButtonRef}
              onClick={(e) => {
                void trackEvent({
                  eventName: 'deep_analysis_compare_click',
                  eventType: 'click',
                  page: 'deepAnalysis',
                  component: 'DeepAnalysisPage',
                  element: e.currentTarget,
                });
                handleCompareAnalysis();
              }}
              disabled={isLoading}
              className="h-9 px-4 border border-ink/20 text-sm font-serif hover:bg-ink/5 transition-colors disabled:opacity-50"
            >
              对比分析
            </button>
            <button
              ref={synastryButtonRef}
              onClick={(e) => {
                void trackEvent({
                  eventName: 'deep_analysis_synastry_click',
                  eventType: 'click',
                  page: 'deepAnalysis',
                  component: 'DeepAnalysisPage',
                  element: e.currentTarget,
                });
                handleSynastryAnalysis();
              }}
              disabled={isLoading}
              className="h-9 px-4 border border-ink/20 text-sm font-serif hover:bg-ink/5 transition-colors disabled:opacity-50"
            >
              合盘
            </button>
            <button
              ref={klineButtonRef}
              onClick={(e) => {
                void trackEvent({
                  eventName: 'deep_analysis_kline_click',
                  eventType: 'click',
                  page: 'deepAnalysis',
                  component: 'DeepAnalysisPage',
                  element: e.currentTarget,
                });
                handleDrawKLine();
              }}
              disabled={isLoading}
              className="h-9 px-4 border border-ink/20 text-sm font-serif hover:bg-ink/5 transition-colors disabled:opacity-50"
            >
              绘制K线图
            </button>
            {/* 右侧填充空间 */}
            <div className="flex-1"></div>
            {/* 清空对话按钮 */}
            {chatMessages.length > 0 && (
              <button
                ref={clearButtonRef}
                onClick={(e) => {
                  void trackEvent({
                    eventName: 'deep_analysis_clear_chat',
                    eventType: 'click',
                    page: 'deepAnalysis',
                    component: 'DeepAnalysisPage',
                    element: e.currentTarget,
                  });
                  if (window.confirm('确定要清空所有对话历史吗？')) {
                    onChatMessagesChange([]);
                  }
                }}
                className="px-4 py-2 border border-red-300 text-sm font-serif text-red-500 hover:bg-red-50 transition-colors"
              >
                清空对话
              </button>
            )}
          </div>

          {/* 对话内容区 */}
          <div 
            className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
            onMouseUp={handleTextSelection}
          >
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-ink/30 text-sm font-serif">
                <div className="text-center">
                  <p className="mb-2">选择左侧的分析报告</p>
                  <p>开始深度求解对话</p>
                </div>
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex flex-col gap-2 max-w-[80%]">
                    <div
                      className={`p-3 ${
                        msg.role === 'user'
                          ? 'bg-ink text-paper'
                          : 'bg-ink/5 text-ink'
                      }`}
                      {...(msg.role === 'assistant' ? { 'data-message-index': index } : {})}
                    >
                      {msg.role === 'user' ? (
                        <p className="text-sm font-serif">{msg.content}</p>
                      ) : (
                        renderMessageContent(msg.content)
                      )}
                    </div>
                    {/* 操作按钮 - 仅对 assistant 消息显示 */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 text-ink/40">
                        {/* 复制 */}
                        <button
                          onClick={(e) => {
                            void trackEvent({
                              eventName: 'chat_copy',
                              eventType: 'copy',
                              page: 'deepAnalysis',
                              component: 'DeepAnalysisPage',
                              element: e.currentTarget,
                              metadata: { messageIndex: index },
                            });
                            handleCopy(msg.content, index);
                          }}
                          className="p-1 hover:text-ink transition-colors"
                          title="复制"
                        >
                          {copiedIndex === index ? (
                            <span className="text-xs text-green-600">已复制</span>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                        {/* 点赞 */}
                        <button
                          onClick={(e) => {
                            void trackEvent({
                              eventName: 'chat_like',
                              eventType: 'click',
                              page: 'deepAnalysis',
                              component: 'DeepAnalysisPage',
                              element: e.currentTarget,
                              metadata: { messageIndex: index },
                            });
                            handleReaction(index, 'like');
                          }}
                          className={`p-1 hover:text-ink transition-colors ${messageReactions[index] === 'like' ? 'text-accent' : ''}`}
                          title="点赞"
                        >
                          <svg className="w-4 h-4" fill={messageReactions[index] === 'like' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                        </button>
                        {/* 点踩 */}
                        <button
                          onClick={(e) => {
                            void trackEvent({
                              eventName: 'chat_dislike',
                              eventType: 'click',
                              page: 'deepAnalysis',
                              component: 'DeepAnalysisPage',
                              element: e.currentTarget,
                              metadata: { messageIndex: index },
                            });
                            handleReaction(index, 'dislike');
                          }}
                          className={`p-1 hover:text-ink transition-colors ${messageReactions[index] === 'dislike' ? 'text-red-500' : ''}`}
                          title="点踩"
                        >
                          <svg className="w-4 h-4" fill={messageReactions[index] === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                        </button>
                        {/* 分享 */}
                        <button
                          onClick={(e) => {
                            void trackEvent({
                              eventName: 'chat_share_open',
                              eventType: 'click',
                              page: 'deepAnalysis',
                              component: 'DeepAnalysisPage',
                              element: e.currentTarget,
                              metadata: { messageIndex: index },
                            });
                            handleShare(index);
                          }}
                          className="p-1 hover:text-ink transition-colors"
                          title="分享"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-ink/5 p-3">
                  <div className="flex items-center gap-2 text-sm text-ink/40">
                    <span className="animate-pulse">●</span>
                    <span>思考中...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 输入区 */}
          <div className="px-6 py-4 border-t border-ink/10">
            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={(e) => onChatInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(chatInput);
                  }
                }}
                placeholder="输入问题，按 Enter 发送..."
                className="flex-1 p-3 border border-ink/20 bg-transparent font-serif text-sm resize-none focus:outline-none focus:border-accent"
                rows={2}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => sendMessage(chatInput)}
                disabled={isLoading || !chatInput.trim()}
                className="px-6 bg-ink text-paper font-serif text-sm hover:bg-ink/80 transition-colors disabled:opacity-50"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 历史详情悬窗 - 使用 Portal 渲染到 body */}
      {viewingHistoryItem && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setViewingHistoryItem(null)}
        >
          <div 
            className="bg-paper w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-ink/20 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-ink/10">
              <div>
                <h3 className="font-serif font-bold text-lg">
                  {formatHistoryTitle(viewingHistoryItem)}
                </h3>
                <p className="text-xs text-ink/40 font-mono mt-1">{formatTimestamp(viewingHistoryItem.timestamp)}</p>
              </div>
              <button 
                onClick={() => setViewingHistoryItem(null)}
                className="text-ink/40 hover:text-ink text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({children}) => <h1 className="text-lg font-serif font-bold text-ink mb-2 mt-4">{children}</h1>,
                  h2: ({children}) => <h2 className="text-base font-serif font-bold text-ink mb-2 mt-3">{children}</h2>,
                  h3: ({children}) => <h3 className="text-sm font-serif font-bold text-ink mb-1 mt-2">{children}</h3>,
                  p: ({children}) => <p className="text-sm font-serif text-ink/80 leading-relaxed mb-2">{children}</p>,
                  ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-2 ml-2 text-sm">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal list-inside space-y-1 mb-2 ml-2 text-sm">{children}</ol>,
                  li: ({children}) => <li className="text-sm font-serif text-ink/80">{children}</li>,
                  strong: ({children}) => <strong className="font-bold text-ink">{children}</strong>,
                  blockquote: ({children}) => <blockquote className="border-l-2 border-accent bg-accent/5 pl-3 py-1 my-2 italic text-ink/70 text-sm">{children}</blockquote>,
                }}
              >{viewingHistoryItem.analysis}</ReactMarkdown>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 选中文本追问按钮 - 使用 Portal */}
      {selectedText && selectionPosition && createPortal(
        <div 
          className="fixed z-[200] bg-ink text-paper px-3 py-1.5 text-xs font-serif shadow-lg cursor-pointer hover:bg-ink/80 transition-colors"
          style={{ 
            left: selectionPosition.x, 
            top: selectionPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
          onClick={handleQuoteAsk}
        >
          追问
        </div>,
        document.body
      )}

      {/* 分享模态框 - 使用 Portal */}
      {shareModalIndex !== null && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShareModalIndex(null)}
        >
          <div 
            className="bg-paper w-full max-w-sm p-5 border border-ink/20 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-serif font-bold text-base mb-4 text-center">分享对话</h3>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  void trackEvent({
                    eventName: 'chat_share_copy_link',
                    eventType: 'share',
                    page: 'deepAnalysis',
                    component: 'DeepAnalysisPage',
                    element: e.currentTarget,
                    metadata: { messageIndex: shareModalIndex },
                  });
                  shareLink();
                }}
                className="flex-1 px-3 py-2 border border-ink/20 text-xs font-serif hover:bg-ink/5 transition-colors"
              >
                复制链接
              </button>
              <button
                onClick={(e) => {
                  void trackEvent({
                    eventName: 'chat_share_copy_screenshot',
                    eventType: 'share',
                    page: 'deepAnalysis',
                    component: 'DeepAnalysisPage',
                    element: e.currentTarget,
                    metadata: { messageIndex: shareModalIndex },
                  });
                  copyScreenshot();
                }}
                className="flex-1 px-3 py-2 bg-ink text-paper text-xs font-serif hover:bg-ink/80 transition-colors"
              >
                复制截图
              </button>
              <button
                onClick={() => setShareModalIndex(null)}
                className="px-3 py-2 text-xs font-serif text-ink/50 hover:text-ink border border-ink/10 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Toast 提示 */}
      {toastMessage && createPortal(
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] bg-ink text-paper px-4 py-2 text-sm font-serif shadow-lg animate-fade-in">
          {toastMessage}
        </div>,
        document.body
      )}
    </div>
  );
}
