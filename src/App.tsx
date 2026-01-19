import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import MinimalForm from './components/MinimalForm';
import DeepAnalysisPage from './components/DeepAnalysisPage';
import { AstrologyEngine, BaseChartData } from './lib/AstrologyEngine';
import { KeyYear } from './components/DualLineChart';
import { prepareAIAnalysisContext, generateYearScores, selectKeyYears } from './lib/ScoreGenerator';
import { getCoordinates } from './lib/CityLookup';
import { buildAnalysisPrompt } from './lib/AIPrompts';
import { 
  getAnalysisHistory, 
  deleteAnalysis,
  formatTimestamp,
  type AnalysisHistoryItem 
} from './lib/CloudHistoryService';
import { AuthModal, UserInfo, useAuth } from './components/Auth';
import { getQuota, isAbortError, logUserInput } from './lib/ApiService';
import { callAIService } from './lib/AIService';
import { trackEvent, trackPageView } from './lib/Tracking';

// --- Components ---

const DataCard = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => (
  <div className={`bg-paper border border-ink/10 p-6 ${className}`}>
    <h3 className="text-sm font-serif font-bold uppercase tracking-widest mb-4 text-ink/60">{title}</h3>
    <div className="font-serif text-ink">
      {children}
    </div>
  </div>
);

// Description panel component for selected cards - positioned absolutely on desktop
const DescriptionPanel = ({ 
  description, 
  visible, 
  copyLabel, 
  onCopy,
  onCopyImage,
  trackingPage,
  trackingSource
}: { 
  description: string, 
  visible: boolean,
  copyLabel?: string,
  onCopy?: () => void,
  onCopyImage?: () => void,
  trackingPage?: string,
  trackingSource?: string
}) => {
  const [copied, setCopied] = React.useState(false);
  const [imageCopied, setImageCopied] = React.useState(false);

  const handleCopy = (element?: Element | null) => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    if (element) {
      void trackEvent({
        eventName: 'copy_text',
        eventType: 'copy',
        page: trackingPage,
        component: 'DescriptionPanel',
        element,
        metadata: {
          source: trackingSource,
          label: copyLabel,
        },
      });
    }
  };

  const handleCopyImage = async (element?: Element | null) => {
    if (onCopyImage) {
      await onCopyImage();
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
    }
    if (element) {
      void trackEvent({
        eventName: 'copy_image',
        eventType: 'copy',
        page: trackingPage,
        component: 'DescriptionPanel',
        element,
        metadata: {
          source: trackingSource,
          label: copyLabel,
        },
      });
    }
  };

  return (
    <div className={`transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'} md:absolute md:left-full md:top-0 md:ml-4 md:w-48`}>
      <div className="text-xs text-ink/50 border-l-2 border-accent/30 pl-3 italic leading-relaxed">
        {description}
      </div>
      {copyLabel && visible && (
        <div className="mt-3 ml-3 space-y-2">
          {onCopy && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(e.currentTarget);
              }}
              className="w-full px-3 py-1.5 text-[11px] font-mono border border-ink/20 hover:border-accent hover:text-accent transition-colors bg-paper"
            >
              {copied ? '已复制 ✓' : `复制${copyLabel}信息`}
            </button>
          )}
          {onCopyImage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleCopyImage(e.currentTarget);
              }}
              className="w-full px-3 py-1.5 text-[11px] font-mono border border-ink/20 hover:border-accent hover:text-accent transition-colors bg-paper"
            >
              {imageCopied ? '已复制 ✓' : '复制图片'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const MutagenBadge = ({ mutagen }: { mutagen: string }) => (
  <span className="ml-1 inline-flex items-center justify-center h-4 px-1 bg-ink text-paper text-[10px] font-mono leading-none">
    {mutagen}
  </span>
);

function App() {
  const [step, setStep] = useState<'input' | 'charts' | 'deepAnalysis'>('input');
  const [chartData, setChartData] = useState<BaseChartData | null>(null);
  const [userData, setUserData] = useState<{ date: Date; place: string; name: string; gender: '男' | '女'; orientation?: string } | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  // @ts-expect-error - Used in performAIAnalysis via result.keyYears
  const [keyYears, setKeyYears] = useState<KeyYear[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [analyzingHint, setAnalyzingHint] = useState('');
  
  // 认证状态
  const { user, loading: authLoading, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [remainingCalls, setRemainingCalls] = useState(19);
  // 以下认证相关状态已注释，直接使用 .env 中的 DeepSeek API
  // const [aiModel, setAiModel] = useState<'deepseek' | 'chatgpt'>('deepseek');
  // const [authMode, setAuthMode] = useState<'activation' | 'apikey'>('activation');
  // const [activationCode, setActivationCode] = useState('');
  // const [apiKey, setApiKey] = useState('');
  // const [authError, setAuthError] = useState<string | null>(null);
  // const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [analysisResume, setAnalysisResume] = useState<{
    startedAt: number;
    selectedSystems: ('bazi' | 'western' | 'ziwei')[];
    signature: string;
  } | null>(null);

  type RecentProfile = {
    name: string;
    gender: '男' | '女';
    date: string;
    place: string;
    createdAt: number;
  };
  const RECENT_PROFILES_KEY = 'lifeline_recent_profiles';
  const getRecentProfilesKey = (userId?: string) =>
    userId ? `${RECENT_PROFILES_KEY}_${userId}` : `${RECENT_PROFILES_KEY}_anon`;
  const [recentProfiles, setRecentProfiles] = useState<RecentProfile[]>([]);

  // Refs for card screenshots
  const baziCardRef = useRef<HTMLDivElement>(null);
  const westernCardRef = useRef<HTMLDivElement>(null);
  const ziweiCardRef = useRef<HTMLDivElement>(null);
  const [historyList, setHistoryList] = useState<AnalysisHistoryItem[]>([]);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<AnalysisHistoryItem | null>(null);

  // 第二页新增选项
  const [showExpandedOptions, setShowExpandedOptions] = useState(false);
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [showAnalysisReport, setShowAnalysisReport] = useState(false);
  const analyzingHintText = `可以前往其他页面，报告将在后台生成，生成之后可以点击右上角的“深度分析”按钮查看，并选择对应报告进行深入分析。

你知道吗？八字、紫微、星座可能算出不一样的结果，
但它们不是互相打架，而是“看人生的不同切面”。
融合不是把三套系统混着算，而是：
用它们各自最擅长的部分，拼成一个更爽、更完整的“人生叙事”。
了解八字、星座、紫微，各可以看到人生的哪些切面。`;
  const ANALYSIS_RESUME_KEY = 'lifeline_analysis_resume';
  const buildUserSignature = (data: {
    date: Date;
    place: string;
    name: string;
    gender: '男' | '女';
    orientation?: string;
  }) => `${data.name || ''}|${data.gender}|${data.date.toISOString()}|${data.place}|${data.orientation || ''}`;
  const buildReportTitle = (
    system: 'bazi' | 'western' | 'ziwei',
    data: {
      date: Date;
      name: string;
      gender: '男' | '女';
    }
  ) => {
    const systemNames: Record<'bazi' | 'western' | 'ziwei', string> = {
      bazi: '八字',
      western: '星座',
      ziwei: '紫微',
    };
    const dateStr = data.date.toISOString().split('T')[0];
    const genderStr = data.gender;
    return data.name
      ? `【${systemNames[system]}】${data.name}-${dateStr}-${genderStr}`
      : `【${systemNames[system]}】${dateStr}-${genderStr}`;
  };
  const createRequestId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `req_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  };
  // 命理体系选择
  const [selectedSystems, setSelectedSystems] = useState<('bazi' | 'western' | 'ziwei')[]>([]);
  // 多体系分析结果
  const [multiSystemAnalysis, setMultiSystemAnalysis] = useState<{
    bazi?: string;
    western?: string;
    ziwei?: string;
  }>({});

  // 深度分析页面状态
  const [deepSelectedHistoryIds, setDeepSelectedHistoryIds] = useState<string[]>([]);
  const [deepChatMessages, setDeepChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>(() => {
    // 从 localStorage 加载对话历史
    try {
      const saved = localStorage.getItem('lifeline_deep_chat_messages');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [deepChatInput, setDeepChatInput] = useState('');
  const [isDeepChatLoading, setIsDeepChatLoading] = useState(false);
  const refreshHistoryList = async () => {
    if (!user) return;
    const history = await getAnalysisHistory();
    setHistoryList(history);
  };

  const formatHistoryTitle = (item: AnalysisHistoryItem) => {
    if (item.title) return item.title;
    const name = item.userData?.name?.trim() || '未命名';
    const gender = item.userData?.gender?.trim() || '';
    return [name, gender].filter(Boolean).join(' ');
  };

  // 加载历史记录（只有登录用户才有历史）
  useEffect(() => {
    if (user) {
      refreshHistoryList();
    } else {
      setHistoryList([]);
    }
  }, [user]);

  // 加载用户quota
  useEffect(() => {
    if (user) {
      getQuota()
        .then(data => setRemainingCalls(data.remainingCalls))
        .catch(err => {
          if (!isAbortError(err)) {
            console.error('获取quota失败:', err);
          }
        });
    }
  }, [user]);

  // 页面PV埋点
  useEffect(() => {
    void trackPageView(step, { loggedIn: Boolean(user) });
  }, [step, user]);

  // 新增：自动保存用户输入状态，防止登录刷新后数据丢失
  useEffect(() => {
    if (userData && step !== 'input') {
      localStorage.setItem('lifeline_pending_state', JSON.stringify({
        userData: {
          ...userData,
          date: userData.date.toISOString()
        },
        step,
        selectedCharts,
        selectedSystems,
      }));
    }
  }, [userData, step, selectedCharts, selectedSystems]);

  // 新增：初始化时恢复状态
  useEffect(() => {
    const savedState = localStorage.getItem('lifeline_pending_state');
    if (savedState && !userData) {
      try {
        const parsed = JSON.parse(savedState);
        const savedUserData = {
            ...parsed.userData,
            date: new Date(parsed.userData.date)
        };
        
        // 重新生成图表数据
        const coords = getCoordinates(savedUserData.place);
        const charts = AstrologyEngine.generateBaseCharts(
            savedUserData.date, 
            coords.lat, 
            coords.lng, 
            savedUserData.gender
        );
        
        setUserData(savedUserData);
        setChartData(charts);
        setStep(parsed.step || 'charts');
        if (parsed.selectedCharts) {
            setSelectedCharts(parsed.selectedCharts);
        }
        if (parsed.selectedSystems) {
            setSelectedSystems(parsed.selectedSystems);
        }
      } catch (e) {
        console.error('Failed to restore state:', e);
        localStorage.removeItem('lifeline_pending_state');
      }
    }
  }, []);

  useEffect(() => {
    if (!userData) return;
    const raw = localStorage.getItem(ANALYSIS_RESUME_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        startedAt: number;
        selectedSystems: ('bazi' | 'western' | 'ziwei')[];
        signature: string;
      };
      if (parsed.signature !== buildUserSignature(userData)) {
        localStorage.removeItem(ANALYSIS_RESUME_KEY);
        return;
      }
      setAnalysisResume(parsed);
      setIsAnalyzing(true);
      if (parsed.selectedSystems?.length) {
        setSelectedSystems(parsed.selectedSystems);
      }
    } catch (error) {
      console.error('恢复分析状态失败:', error);
      localStorage.removeItem(ANALYSIS_RESUME_KEY);
    }
  }, [userData]);

  useEffect(() => {
    if (!analysisResume || !user || !userData) return;
    let isActive = true;
    const maxAgeMs = 10 * 60 * 1000;
    const pollIntervalMs = 8000;
    const poll = async () => {
      if (!isActive) return;
      if (Date.now() - analysisResume.startedAt > maxAgeMs) {
        setIsAnalyzing(false);
        setPreviewError('AI分析生成超时，请重试');
        clearAnalysisResume();
        return;
      }
      try {
        const history = await getAnalysisHistory();
        const analysisTargets = analysisResume.selectedSystems.map((system) => ({
          system,
          reportTitle: buildReportTitle(system, userData),
        }));
        if (analysisTargets.length === 0) {
          setIsAnalyzing(false);
          clearAnalysisResume();
          return;
        }
        const newMultiAnalysis: { bazi?: string; western?: string; ziwei?: string } = {};
        let successCount = 0;
        for (const target of analysisTargets) {
          const fallback = history.find(
            (item) =>
              item.title === target.reportTitle &&
              item.timestamp >= analysisResume.startedAt - 2 * 60 * 1000
          );
          if (fallback?.analysis) {
            newMultiAnalysis[target.system] = fallback.analysis;
            successCount++;
          }
        }
        if (successCount === analysisTargets.length) {
          setMultiSystemAnalysis(newMultiAnalysis);
          setShowAnalysisReport(true);
          setIsAnalyzing(false);
          clearAnalysisResume();
        }
      } catch (recoveryError) {
        console.error('恢复分析结果失败:', recoveryError);
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, pollIntervalMs);
    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [analysisResume, user, userData]);

  // 保存对话历史到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lifeline_deep_chat_messages', JSON.stringify(deepChatMessages));
    } catch (error) {
      console.error('保存对话历史失败:', error);
    }
  }, [deepChatMessages]);

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalyzingHint('');
      return;
    }
    let i = 0;
    setAnalyzingHint('');
    const timer = setInterval(() => {
      i += 1;
      setAnalyzingHint(analyzingHintText.slice(0, i));
      if (i >= analyzingHintText.length) {
        clearInterval(timer);
      }
    }, 24);
    return () => clearInterval(timer);
  }, [isAnalyzing, analyzingHintText]);

  useEffect(() => {
    const key = getRecentProfilesKey(user?.id);
    try {
      const raw = localStorage.getItem(key);
      setRecentProfiles(raw ? JSON.parse(raw) : []);
    } catch {
      setRecentProfiles([]);
    }
  }, [user]);

  const saveRecentProfiles = (profiles: RecentProfile[]) => {
    setRecentProfiles(profiles);
    try {
      const key = getRecentProfilesKey(user?.id);
      localStorage.setItem(key, JSON.stringify(profiles));
    } catch (error) {
      console.error('保存最近档案失败:', error);
    }
  };

  const clearAnalysisResume = () => {
    setAnalysisResume(null);
    try {
      localStorage.removeItem(ANALYSIS_RESUME_KEY);
    } catch {
      // ignore
    }
  };

  const saveAnalysisResume = (payload: {
    startedAt: number;
    selectedSystems: ('bazi' | 'western' | 'ziwei')[];
    signature: string;
  }) => {
    setAnalysisResume(payload);
    try {
      localStorage.setItem(ANALYSIS_RESUME_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error('保存分析恢复状态失败:', error);
    }
  };

  const addRecentProfile = (data: { date: Date; place: string; name: string; gender: '男' | '女' }) => {
    const entry: RecentProfile = {
      name: data.name?.trim() || '',
      gender: data.gender,
      date: data.date.toISOString(),
      place: data.place,
      createdAt: Date.now(),
    };
    const deduped = [
      entry,
      ...recentProfiles.filter(
        (p) =>
          !(
            p.name === entry.name &&
            p.gender === entry.gender &&
            p.date === entry.date &&
            p.place === entry.place
          )
      ),
    ].slice(0, 3);
    saveRecentProfiles(deduped);
  };

  const handleOpenRecentProfile = (profile: RecentProfile) => {
    try {
      const date = new Date(profile.date);
      const coords = getCoordinates(profile.place);
      const charts = AstrologyEngine.generateBaseCharts(
        date,
        coords.lat,
        coords.lng,
        profile.gender
      );
      setUserData({
        date,
        place: profile.place,
        name: profile.name,
        gender: profile.gender,
      });
      setChartData(charts);
      setStep('charts');
      setSelectedCharts([]);
    } catch (error) {
      console.error('打开最近档案失败:', error);
      alert('无法打开该档案');
    }
  };

  const handleDeleteRecentProfile = (profile: RecentProfile) => {
    const updated = recentProfiles.filter(
      (p) =>
        !(
          p.createdAt === profile.createdAt &&
          p.date === profile.date &&
          p.place === profile.place &&
          p.gender === profile.gender &&
          p.name === profile.name
        )
    );
    saveRecentProfiles(updated);
  };

  const handleFormSubmit = (data: { date: Date; place: string; name: string; gender: '男' | '女'; orientation?: string }) => {
    // 更新档案时清理旧报告
    setShowAnalysisReport(false);
    setMultiSystemAnalysis({});
    setPreviewError(null);
    setIsAnalyzing(false);
    clearAnalysisResume();
    setSelectedSystems([]);
    setSelectedAspects([]);
    setShowExpandedOptions(false);
    addRecentProfile(data);
    // 记录用户输入（如果已登录）
    if (user) {
      logUserInput(data).catch(err => console.error('记录输入失败:', err));
    }
    
    // 1. Generate Charts locally
    const coords = getCoordinates(data.place);
    const charts = AstrologyEngine.generateBaseCharts(data.date, coords.lat, coords.lng, data.gender);
    setChartData(charts);
    setUserData(data);
    setStep('charts');
  };

  const toggleChartSelection = (chart: string) => {
    if (selectedCharts.includes(chart)) {
      // 取消选中卡片
      setSelectedCharts(selectedCharts.filter(c => c !== chart));
    } else {
      // 选中卡片
      setSelectedCharts([...selectedCharts, chart]);
    }
  };

  // 复制数据到剪贴板的辅助函数
  const copyBaziInfo = () => {
    if (!chartData) return;
    const bazi = chartData.bazi;
    const text = `【八字信息】
四柱：${bazi.year} ${bazi.month} ${bazi.day} ${bazi.hour}
日主：${bazi.dayGan}
五行：${bazi.wuxing}
五行分布：金${bazi.wuxingCount['金'] || 0} 木${bazi.wuxingCount['木'] || 0} 水${bazi.wuxingCount['水'] || 0} 火${bazi.wuxingCount['火'] || 0} 土${bazi.wuxingCount['土'] || 0}
纳音：年柱${bazi.naYin.year}、月柱${bazi.naYin.month}、日柱${bazi.naYin.day}、时柱${bazi.naYin.hour}
大运：${bazi.daYun.map(dy => `${dy.ganZhi}(${dy.startAge}岁)`).join('、')}`;
    navigator.clipboard.writeText(text);
  };

  const copyWesternInfo = () => {
    if (!chartData) return;
    const western = chartData.western;
    const text = `【西方占星信息】
太阳星座：${western.sunSign} (${western.sunAngle}°, 元素: ${western.sunElement})
月亮星座：${western.moonSign} (${western.moonAngle}°, 元素: ${western.moonElement})
行星位置：
${western.planets.map(p => `  ${p.name}：${p.sign} (${p.angle}°)`).join('\n')}`;
    navigator.clipboard.writeText(text);
  };

  const copyZiweiInfo = () => {
    if (!chartData) return;
    const ziwei = chartData.ziwei;
    const text = `【紫微斗数信息】
命宫：${ziwei.mingGong}
十二宫位：
${ziwei.palaces?.map(p => `  ${p.name} (${p.heavenlyStem}${p.earthlyBranch})：${p.stars.map(s => s.name + (s.mutagen ? `[${s.mutagen}]` : '')).join('、')}`).join('\n') || ''}`;
    navigator.clipboard.writeText(text);
  };

  // 复制卡片截图到剪贴板的函数
  const copyCardImage = async (cardRef: React.RefObject<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#f5f5f0',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
          } catch (err) {
            console.error('复制图片失败:', err);
          }
        }
      });
    } catch (error) {
      console.error('截图失败:', error);
    }
  };

  const copyBaziImage = () => copyCardImage(baziCardRef);
  const copyWesternImage = () => copyCardImage(westernCardRef);
  const copyZiweiImage = () => copyCardImage(ziweiCardRef);

  const startAnalysis = async () => {
    // 第二页点击"启动命运分析"按钮时，展开更多选项
    setSelectedAspects([]);
    setShowExpandedOptions(true);
    setShowAnalysisReport(false);
    setMultiSystemAnalysis({});
  };

  const performAIAnalysis = async () => {
    if (!userData || !chartData) return;
    
    // 检查是否登录
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    // 检查剩余次数（每个体系消耗1次）
    const systemsToAnalyze = selectedSystems.length || 1;
    if (remainingCalls < systemsToAnalyze) {
      alert(`需要${systemsToAnalyze}次调用次数，但只剩${remainingCalls}次。请关注我的小红书/公众号私信获取更多次数`);
      return;
    }
    
    const analysisStartedAt = Date.now();
    setIsAnalyzing(true);
    setPreviewError(null);
    setMultiSystemAnalysis({});
    saveAnalysisResume({
      startedAt: analysisStartedAt,
      selectedSystems,
      signature: buildUserSignature(userData),
    });

    try {
      const birthYear = userData.date.getFullYear();
      const currentAge = new Date().getFullYear() - birthYear;

      // 本地生成趋势数据与关键年份（不再调用预览AI）
      const seed = `${userData.name}-${userData.gender}-${userData.date.toISOString()}-${userData.place}`;
      const yearScores = generateYearScores({
        birthYear,
        seed,
        selectedSystems
      });
      const generatedKeyYears = selectKeyYears(yearScores, 3, currentAge);
      setKeyYears(generatedKeyYears);

      const analysisTargets = selectedSystems.map((system) => ({
        system,
        reportTitle: buildReportTitle(system, userData),
        requestId: createRequestId(),
      }));
      
      // 并行为每个选中的体系生成分析
      const analysisPromises = analysisTargets.map(async ({ system, reportTitle, requestId }) => {
        // 构建该体系的AI分析上下文
        const context = prepareAIAnalysisContext(
          generatedKeyYears, 
          [system], 
          undefined,
          // 用户基本信息
          {
            name: userData.name,
            gender: userData.gender,
            orientation: userData.orientation,
            birthDate: userData.date,
            birthPlace: userData.place,
          },
          // 用户关注的方面
          selectedAspects,
          // 只包含当前体系的命理数据
          {
            bazi: system === 'bazi' ? {
              year: chartData.bazi.year,
              month: chartData.bazi.month,
              day: chartData.bazi.day,
              hour: chartData.bazi.hour,
              dayGan: chartData.bazi.dayGan,
              dayZhi: chartData.bazi.dayZhi,
              wuxingCount: chartData.bazi.wuxingCount,
              dayMasterElement: chartData.bazi.dayMasterElement,
              naYin: chartData.bazi.naYin,
              daYun: chartData.bazi.daYun?.map(d => ({ startAge: d.startAge, ganZhi: d.ganZhi })),
            } : undefined,
            western: system === 'western' ? {
              sunSign: chartData.western.sunSign,
              moonSign: chartData.western.moonSign,
              ascendant: chartData.western.ascendant,
              planets: chartData.western.planets?.map(p => ({ name: p.name, sign: p.sign })),
            } : undefined,
            ziwei: system === 'ziwei' ? {
              mingGong: chartData.ziwei.mingGong,
              palaces: chartData.ziwei.palaces?.map(p => ({
                name: p.name,
                stars: p.stars.map(s => ({ name: s.name, mutagen: s.mutagen })),
              })),
            } : undefined,
          }
        );
        
        const { systemPrompt, userPrompt } = buildAnalysisPrompt(context, 'deepseek', undefined, system);
        // 直接调用 DeepSeek API
        const analysisResult = await callAIService({
          systemPrompt,
          userPrompt,
          model: 'deepseek',
          apiKey: undefined, // 由后端统一处理密钥
          userData,
          chartData,
          callType: 'report',
          metadata: { reportTitle },
          requestId,
          analysisLog: {
            analysisType: system,
            inputData: {
              userData: {
                name: userData.name,
                gender: userData.gender,
                date: userData.date.toISOString().split('T')[0],
                place: userData.place,
              },
              selectedSystems: [system],
              analysisType: 'overall',
              model: 'deepseek',
              reportTitle,
              requestId,
            },
            outputData: {
              title: reportTitle,
              keyYears: generatedKeyYears,
            },
          },
        });

        return { system, reportTitle, requestId, result: analysisResult };
      });

      // 等待所有分析完成
      const analysisResults = await Promise.all(analysisPromises);
      
      // 收集结果
      const newMultiAnalysis: { bazi?: string; western?: string; ziwei?: string } = {};
      let successCount = 0;
      
      for (const { system, result: analysisResult } of analysisResults) {
        if (analysisResult.success && analysisResult.analysis) {
          newMultiAnalysis[system] = analysisResult.analysis;
          successCount++;
        }
      }

      // 如果有失败或重复请求，尝试从历史中补偿
      if (user && successCount < analysisTargets.length) {
        try {
          const history = await getAnalysisHistory();
          for (const target of analysisTargets) {
            if (newMultiAnalysis[target.system]) continue;
            const fallback = history.find(
              (item) =>
                item.title === target.reportTitle &&
                item.timestamp >= analysisStartedAt - 2 * 60 * 1000
            );
            if (fallback?.analysis) {
              newMultiAnalysis[target.system] = fallback.analysis;
              successCount++;
            }
          }
        } catch (recoveryError) {
          console.error('分析补偿失败:', recoveryError);
        }
      }
      
      // 更新剩余次数（后端已扣减，刷新本地状态）
      if (successCount > 0 && user) {
        try {
          const quota = await getQuota();
          setRemainingCalls(quota.remainingCalls);
        } catch (quotaError) {
          console.error('刷新额度失败:', quotaError);
        }
      }
      
      if (successCount > 0) {
        setMultiSystemAnalysis(newMultiAnalysis);
        setShowAnalysisReport(true);
        if (user) {
          const history = await getAnalysisHistory();
          setHistoryList(history);
        }
      } else {
        setPreviewError('AI分析失败，请重试');
      }
      // 本地生成失败时提示
      if (generatedKeyYears.length === 0) {
        setPreviewError('生成失败，请重试');
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      setPreviewError('AI分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
      clearAnalysisResume();
    }
  };

  // handleAuth 函数已注释，直接使用 .env 中的 API
  /*
  const handleAuth = () => {
    setAuthError(null);
    
    if (authMode === 'activation') {
      if (validateActivationCode(activationCode)) {
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setAuthError('激活码无效，请检查后重试');
      }
    } else {
      if (validateApiKey(apiKey, aiModel)) {
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setAuthError('API Key 格式不正确');
      }
    }
  };
  */

  // @ts-expect-error - Stub function for backwards compatibility
  const requestAiAnalysis = async () => {
    // This function was for the old page 3 flow and is no longer used
    // Keeping stub for backwards compatibility
  };

  // 生成完整年度分数（基于关键年份插值）
  // 注：此函数在新的流程中不再使用
  /*
  const generateFullYearScores = () => {
    if (!userData || keyYears.length === 0) return;
    
    const birthYear = userData.date.getFullYear();
    const currentAge = new Date().getFullYear() - birthYear;
    const minAge = Math.max(0, currentAge - 10);
    const maxAge = currentAge + 30;
    
    // 使用关键年份作为锚点，其他年份插值
    const scores: YearScore[] = [];
    
    for (let age = minAge; age <= maxAge; age++) {
      const year = birthYear + age;
      const keyYear = keyYears.find(k => k.age === age);
      
      if (keyYear) {
        // 关键年份使用确定的分数
        scores.push({
          year,
          age,
          career: keyYear.score.career,
          relationship: keyYear.score.relationship,
        });
      } else {
        // 非关键年份：在最近的两个关键年份之间插值 + 小波动
        const sortedKeyYears = [...keyYears].sort((a, b) => a.age - b.age);
        let prevKey = sortedKeyYears[0];
        let nextKey = sortedKeyYears[sortedKeyYears.length - 1];
        
        for (const ky of sortedKeyYears) {
          if (ky.age <= age) prevKey = ky;
          if (ky.age >= age && nextKey.age > ky.age) nextKey = ky;
        }
        
        // 找到前后最近的关键年份
        for (let i = 0; i < sortedKeyYears.length - 1; i++) {
          if (sortedKeyYears[i].age <= age && sortedKeyYears[i + 1].age >= age) {
            prevKey = sortedKeyYears[i];
            nextKey = sortedKeyYears[i + 1];
            break;
          }
        }
        
        // 线性插值
        const t = nextKey.age === prevKey.age ? 0.5 : (age - prevKey.age) / (nextKey.age - prevKey.age);
        const baseCareer = prevKey.score.career + t * (nextKey.score.career - prevKey.score.career);
        const baseRelationship = prevKey.score.relationship + t * (nextKey.score.relationship - prevKey.score.relationship);
        
        // 添加小波动（基于年份的确定性噪声）
        const noise1 = Math.sin(year * 0.7 + age * 0.3) * 5 + Math.sin(year * 0.23) * 3;
        const noise2 = Math.sin(year * 0.5 + age * 0.5 + 1) * 4 + Math.sin(year * 0.31 + 2) * 3;
        
        scores.push({
          year,
          age,
          career: Math.max(15, Math.min(85, Math.round(baseCareer + noise1))),
          relationship: Math.max(15, Math.min(85, Math.round(baseRelationship + noise2))),
        });
      }
    }
    
    setFullYearScores(scores);
  };
  */

  return (
    <div className={`min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto bg-paper text-ink selection:bg-accent selection:text-white ${step !== 'deepAnalysis' ? 'justify-center' : 'pt-8'}`}>
      {/* 顶部导航栏 - 返回按钮和用户信息 */}
      {step !== 'deepAnalysis' && (
        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex justify-between items-center z-10">
          {/* 左侧：返回按钮 */}
          {step === 'charts' ? (
            <button
              onClick={() => {
                setStep('input');
                setChartData(null);
                setUserData(null);
                setSelectedCharts([]);
                localStorage.removeItem('lifeline_pending_state');
                setIsAnalyzing(false);
                clearAnalysisResume();
              }}
              className="px-4 py-2 text-xs font-serif text-ink/60 hover:text-accent border border-transparent transition-all"
            >
              ← 返回
            </button>
          ) : (
            <div></div>
          )}
          
          {/* 右侧：历史和登录 */}
          <div className="flex items-center gap-3">
            {/* 深度求解入口（仅登录用户） */}
            {user && (
              <div className="text-xs font-serif text-ink/50 flex items-center gap-0">
                <span>已生成{historyList.length}份报告，</span>
                <button
                  onClick={(e) => {
                    void trackEvent({
                      eventName: 'open_deep_analysis',
                      eventType: 'click',
                      page: step,
                      component: 'App',
                      element: e.currentTarget,
                    });
                    setShowHistory(false);
                    setStep('deepAnalysis');
                    setDeepSelectedHistoryIds([]);
                  }}
                  className="text-xs font-serif text-accent hover:text-ink transition-colors"
                >
                  深度求解→
                </button>
              </div>
            )}
            
            {authLoading ? (
              <div className="text-xs text-ink/40">加载中...</div>
            ) : user ? (
              <UserInfo
                user={user}
                remainingCalls={remainingCalls}
                onLogout={logout}
                recentProfiles={recentProfiles}
                onOpenRecentProfile={handleOpenRecentProfile}
                onDeleteRecentProfile={handleDeleteRecentProfile}
              />
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 text-xs font-serif text-ink/60 hover:text-accent border border-ink/20 hover:border-accent transition-all"
              >
                登录
              </button>
            )}
          </div>
        </div>
      )}
      
      <header className={`animate-fade-in w-full ${step === 'deepAnalysis' ? 'mb-6' : 'mb-16'}`}>
        <div className="mb-8" />
        
        {/* 标题居中 */}
        <div className="text-center">
          <h1 className="text-4xl font-serif font-bold tracking-tighter mb-2">LIFELINE</h1>
          <p className="text-[10px] font-mono text-ink/40 uppercase tracking-[0.3em]">命运的架构</p>
        </div>
      </header>

      {/* 认证模态框 */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            // 刷新quota
            getQuota().then(data => setRemainingCalls(data.remainingCalls));
          }}
        />
      )}

      {/* 历史记录面板 */}
      {showHistory && (
        <div className="fixed inset-0 bg-ink/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-paper w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-ink/10">
            <div className="flex justify-between items-center p-4 border-b border-ink/10 bg-gradient-to-r from-white to-paper/50">
              <h2 className="text-lg font-serif font-bold">分析历史</h2>
              <button 
                onClick={() => {
                  setShowHistory(false);
                  setViewingHistoryItem(null);
                }}
                className="text-ink/40 hover:text-ink text-xl"
              >
                ×
              </button>
            </div>
            
            {viewingHistoryItem ? (
              // 查看单条记录详情
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                  <button
                    onClick={() => setViewingHistoryItem(null)}
                    className="text-xs font-mono text-accent hover:underline"
                  >
                    ← 返回列表
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm('确定要删除这条记录吗？此操作不可逆！')) {
                        const success = await deleteAnalysis(viewingHistoryItem.id);
                        if (success) {
                          // 刷新历史列表
                          const history = await getAnalysisHistory();
                          setHistoryList(history);
                          setViewingHistoryItem(null);
                        } else {
                          alert('删除失败，请重试');
                        }
                      }
                    }}
                    className="text-xs font-mono text-red-500 hover:text-red-700 hover:underline"
                  >
                    删除记录
                  </button>
                </div>
                <div className="mb-6">
                  <h3 className="font-serif font-bold text-lg">{formatHistoryTitle(viewingHistoryItem)}</h3>
                  <p className="text-xs text-ink/40 font-mono mt-1">{formatTimestamp(viewingHistoryItem.timestamp)}</p>
                </div>
                                
                <div className="prose prose-base max-w-none 
                  prose-headings:font-serif prose-headings:text-ink prose-headings:font-bold
                  prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-ink/10 prose-h2:pb-2
                  prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
                  prose-p:text-ink/80 prose-p:leading-relaxed prose-p:my-3
                  prose-strong:text-ink prose-strong:font-semibold
                  prose-ul:my-4 prose-li:my-1
                  prose-table:text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingHistoryItem.analysis}</ReactMarkdown>
                </div>
              </div>
            ) : (
              // 历史列表
              <div className="flex-1 overflow-y-auto">
                {historyList.length === 0 ? (
                  <p className="p-4 text-center text-ink/40 text-sm">暂无历史记录</p>
                ) : (
                  <div className="divide-y divide-ink/10">
                    {historyList.map((item) => (
                      <div 
                        key={item.id}
                        className="p-4 hover:bg-ink/5 cursor-pointer flex justify-between items-center group"
                        onClick={() => setViewingHistoryItem(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-sm truncate">
                            {formatHistoryTitle(item)}
                          </p>
                          <p className="text-xs text-ink/40 font-mono">{formatTimestamp(item.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* 深度求解入口按钮 */}
            {historyList.length > 0 && (
              <div className="p-4 border-t border-ink/10 bg-paper">
                <button
                  onClick={() => {
                    setShowHistory(false);
                    setStep('deepAnalysis');
                    setDeepSelectedHistoryIds([]);
                  }}
                  className="w-full py-2.5 bg-ink text-paper font-serif text-sm hover:bg-ink/90 transition-all"
                >
                  深度求解 →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="w-full max-w-4xl">
        {step === 'input' && (
          <div className="animate-slide-up">
             <MinimalForm onSubmit={handleFormSubmit} />
          </div>
        )}
        
        {step === 'charts' && chartData && (
          <div className="animate-slide-up space-y-8">
            <div className="space-y-6">
              {/* Bazi Card */}
              <div className="relative">
                <div 
                  ref={baziCardRef}
                  onClick={() => toggleChartSelection('bazi')}
                  className={`cursor-pointer transition-all duration-300 ${
                    selectedCharts.includes('bazi') 
                      ? 'ring-2 ring-accent' 
                      : 'opacity-80 hover:opacity-100'
                  } hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(0,0,0,0.08)]`}
                >
                  <DataCard title="01. 四柱八字 (Bazi)">
                  <div className="grid grid-cols-4 gap-2 text-center mb-4">
                    <div className="text-xs text-ink/30 mb-1">年柱</div>
                    <div className="text-xs text-ink/30 mb-1">月柱</div>
                    <div className="text-xs text-ink/30 mb-1">日柱</div>
                    <div className="text-xs text-ink/30 mb-1">时柱</div>

                    {/* Main Stars */}
                    <div className="text-xs font-mono text-ink/60">{chartData.bazi.yearShiShen}</div>
                    <div className="text-xs font-mono text-ink/60">{chartData.bazi.monthShiShen}</div>
                    <div className="text-xs font-mono text-ink/60">{chartData.bazi.dayShiShen}</div>
                    <div className="text-xs font-mono text-ink/60">{chartData.bazi.hourShiShen}</div>

                    {/* Pillars */}
                    <div className="text-xl font-bold">{chartData.bazi.year}</div>
                    <div className="text-xl font-bold">{chartData.bazi.month}</div>
                    <div className="text-xl font-bold">{chartData.bazi.day}</div>
                    <div className="text-xl font-bold">{chartData.bazi.hour}</div>

                    {/* Hidden Stems */}
                    <div className="text-[10px] text-ink/40 space-y-1 flex flex-col items-center">
                        {chartData.bazi.yearHideGan.map((g, i) => (
                            <div key={i} className="flex gap-1"><span>{g}</span><span className="scale-90 opacity-70">{chartData.bazi.yearHideShiShen[i]}</span></div>
                        ))}
                    </div>
                    <div className="text-[10px] text-ink/40 space-y-1 flex flex-col items-center">
                        {chartData.bazi.monthHideGan.map((g, i) => (
                            <div key={i} className="flex gap-1"><span>{g}</span><span className="scale-90 opacity-70">{chartData.bazi.monthHideShiShen[i]}</span></div>
                        ))}
                    </div>
                    <div className="text-[10px] text-ink/40 space-y-1 flex flex-col items-center">
                        {chartData.bazi.dayHideGan.map((g, i) => (
                            <div key={i} className="flex gap-1"><span>{g}</span><span className="scale-90 opacity-70">{chartData.bazi.dayHideShiShen[i]}</span></div>
                        ))}
                    </div>
                    <div className="text-[10px] text-ink/40 space-y-1 flex flex-col items-center">
                        {chartData.bazi.hourHideGan.map((g, i) => (
                            <div key={i} className="flex gap-1"><span>{g}</span><span className="scale-90 opacity-70">{chartData.bazi.hourHideShiShen[i]}</span></div>
                        ))}
                    </div>
                  </div>
                  
                  <div className="text-xs font-mono text-ink/50 text-center border-t border-ink/5 pt-2 mb-4">
                    {chartData.bazi.wuxing}
                  </div>

                  {/* Wu Xing Statistics */}
                  <div className="flex justify-center gap-4 mb-4">
                    {Object.entries(chartData.bazi.wuxingCount).map(([element, count]) => (
                      <div key={element} className="text-center">
                        <div className={`text-lg font-bold ${count === 0 ? 'text-ink/20' : 'text-ink'}`}>{element}</div>
                        <div className="text-[10px] text-ink/40">{count}</div>
                      </div>
                    ))}
                  </div>

                  {/* Na Yin */}
                  <div className="border-t border-ink/5 pt-2 mb-4">
                      <div className="text-[10px] text-ink/30 mb-2 uppercase tracking-widest text-center">纳音 (Na Yin)</div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs text-ink/60">
                          <div>{chartData.bazi.naYin.year}</div>
                          <div>{chartData.bazi.naYin.month}</div>
                          <div>{chartData.bazi.naYin.day}</div>
                          <div>{chartData.bazi.naYin.hour}</div>
                      </div>
                  </div>

                  {/* Da Yun */}
                  <div className="border-t border-ink/5 pt-2">
                      <div className="text-[10px] text-ink/30 mb-2 uppercase tracking-widest text-center">大运 (Major Cycles)</div>
                      <div className="grid grid-cols-8 gap-1">
                          {chartData.bazi.daYun.map((dy) => (
                              <div key={dy.startAge} className="text-center">
                                  <div className="text-sm font-bold">{dy.ganZhi}</div>
                                  <div className="text-[9px] text-ink/40">{dy.startAge}岁</div>
                                  <div className="text-[9px] text-ink/30">{dy.startYear}</div>
                              </div>
                          ))}
                      </div>
                  </div>
                </DataCard>
                </div>
                <DescriptionPanel 
                  description="八字命理学基于出生年月日时的天干地支组合，通过分析日主与其他干支的生克关系（十神），推演人生运势与性格特质。算法采用万年历计算真太阳时，结合节气换月规则。"
                  visible={selectedCharts.includes('bazi')}
                  copyLabel="八字"
                  onCopy={copyBaziInfo}
                  onCopyImage={copyBaziImage}
                  trackingPage={step}
                  trackingSource="bazi"
                />
              </div>

              {/* Western Card */}
              <div className="relative">
                <div 
                  ref={westernCardRef}
                  onClick={() => toggleChartSelection('western')}
                  className={`cursor-pointer transition-all duration-300 ${
                    selectedCharts.includes('western') 
                      ? 'ring-2 ring-accent' 
                      : 'opacity-80 hover:opacity-100'
                  } hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(0,0,0,0.08)]`}
                >
                  <DataCard title="02. 天体坐标 (Western)">
                  {/* Main Luminaries - Sun, Moon, Ascendant */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="border border-ink/10 p-3 text-center">
                      <div className="text-[10px] text-ink/30 uppercase tracking-widest mb-1">太阳 Sun</div>
                      <div className="text-lg font-bold">{chartData.western.sunSign.split(' ')[0]}</div>
                      <div className="text-xs text-ink/50">{chartData.western.sunSign.match(/\(([^)]+)\)/)?.[1]}</div>
                      <div className="text-[10px] text-ink/30 mt-1">{chartData.western.sunAngle}°</div>
                      <div className="text-xs text-ink/60 mt-1">元素: {chartData.western.sunElement}</div>
                    </div>
                    <div className="border border-ink/10 p-3 text-center">
                      <div className="text-[10px] text-ink/30 uppercase tracking-widest mb-1">月亮 Moon</div>
                      <div className="text-lg font-bold">{chartData.western.moonSign.split(' ')[0]}</div>
                      <div className="text-xs text-ink/50">{chartData.western.moonSign.match(/\(([^)]+)\)/)?.[1]}</div>
                      <div className="text-[10px] text-ink/30 mt-1">{chartData.western.moonAngle}°</div>
                      <div className="text-xs text-ink/60 mt-1">元素: {chartData.western.moonElement}</div>
                    </div>
                    <div className="border border-ink/10 p-3 text-center">
                      <div className="text-[10px] text-ink/30 uppercase tracking-widest mb-1">上升 Ascendant</div>
                      <div className="text-lg font-bold">{chartData.western.ascendant.split(' ')[0]}</div>
                      <div className="text-xs text-ink/50">{chartData.western.ascendant.match(/\(([^)]+)\)/)?.[1]}</div>
                      <div className="text-[10px] text-ink/30 mt-1">{chartData.western.ascendantAngle}°</div>
                      <div className="text-xs text-ink/60 mt-1">元素: {chartData.western.ascendantElement}</div>
                    </div>
                  </div>
                  
                  {/* Planets Grid */}
                  <div className="border-t border-ink/5 pt-3">
                    <div className="text-[10px] text-ink/30 mb-2 uppercase tracking-widest text-center">行星位置 (Planetary Positions)</div>
                    <div className="grid grid-cols-5 gap-2">
                      {chartData.western.planets.map(p => (
                        <div key={p.name} className="text-center border border-ink/5 p-2">
                          <div className="text-[10px] text-ink/40">{p.name}</div>
                          <div className="text-xs font-bold">{p.sign.split(' ')[0]}</div>
                          <div className="text-[9px] text-ink/50">{p.sign.match(/\(([^)]+)\)/)?.[1]}</div>
                          <div className="text-[9px] text-ink/30">{p.angle}°</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </DataCard>
                </div>
                <DescriptionPanel 
                  description="西方占星术基于出生时刻地球视角下太阳、月亮及行星在黄道十二宫的位置。太阳星座反映核心自我，月亮星座代表情感本能。算法使用天文引擎计算精确的黄道经度。"
                  visible={selectedCharts.includes('western')}
                  copyLabel="天体"
                  onCopy={copyWesternInfo}
                  onCopyImage={copyWesternImage}
                  trackingPage={step}
                  trackingSource="western"
                />
              </div>

              {/* Ziwei Card (Simplified) */}
              <div className="relative">
                <div 
                  ref={ziweiCardRef}
                  onClick={() => toggleChartSelection('ziwei')}
                  className={`cursor-pointer transition-all duration-300 ${
                    selectedCharts.includes('ziwei') 
                      ? 'ring-2 ring-accent' 
                      : 'opacity-80 hover:opacity-100'
                  } hover:-translate-y-0.5 hover:shadow-[0_16px_50px_rgba(0,0,0,0.08)]`}
                >
                <DataCard title="03. 紫微斗数 (Ziwei)">
                 <div className="grid grid-cols-4 gap-2 text-xs">
                    {chartData.ziwei.palaces?.map((palace) => (
                      <div
                        key={palace.name}
                        className={`p-2 border ${palace.name === '命宫' ? 'border-ink bg-ink/5' : 'border-ink/10'}`}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
                      >
                        <div className="font-bold" style={{ width: '100%', textAlign: 'center' }}>{palace.name}</div>
                        <div className="text-ink/50 text-[11px] font-mono" style={{ width: '100%', textAlign: 'center' }}>
                          {palace.heavenlyStem}{palace.earthlyBranch}
                        </div>
                        <div className="mt-2 gap-1" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                          {palace.stars.slice(0, 10).map((s) => (
                            <span
                              key={`${palace.name}-${s.name}-${s.mutagen ?? ''}`}
                              className="flex items-center justify-center h-5 px-1 border border-ink/10 font-mono text-[10px] text-ink/80 leading-none"
                            >
                              {s.name}
                              {s.mutagen ? <MutagenBadge mutagen={s.mutagen} /> : null}
                            </span>
                          ))}
                        </div>
                        {palace.stars.length > 10 ? (
                          <div className="mt-2 text-[10px] font-mono text-ink/40" style={{ width: '100%', textAlign: 'center' }}>
                            +{palace.stars.length - 10}...
                          </div>
                        ) : null}
                      </div>
                    ))}
                 </div>
              </DataCard>
              </div>
                <DescriptionPanel 
                  description="紫微斗数是中国古代帝王级命理术，以紫微星为主导，配合108颗虚拟星曜布局十二宫位。四化(禄权科忌)揭示能量流转，命宫定性格本质。算法基于农历生辰排盘，结合五行局数定命主。"
                  visible={selectedCharts.includes('ziwei')}
                  copyLabel="紫微"
                  onCopy={copyZiweiInfo}
                  onCopyImage={copyZiweiImage}
                  trackingPage={step}
                  trackingSource="ziwei"
                />
              </div>
            </div>

            {/* 启动分析按钮 - 仅在未展开时显示 */}
            {!showExpandedOptions && (
              <div className="flex flex-col items-center pt-8 gap-4">
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  className="btn-primary group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10">
                    启动命运分析
                  </span>
                  <div className="absolute inset-0 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 ease-out -z-0"></div>
                </button>
                {/* 错误提示 */}
                {previewError && (
                  <p className="text-xs text-red-500 font-mono">{previewError}</p>
                )}
              </div>
            )}

            {/* 展开的选项面板 */}
            {showExpandedOptions && (
              <div className="mt-8 space-y-6 animate-slide-up">
                {/* 体系介绍与选择 */}
                <div className="border border-accent/30 p-6 bg-accent/5">
                  <h3 className="text-sm font-serif font-bold mb-4">1. 选择分析体系</h3>
                  <div className="text-xs text-ink/60 font-mono space-y-2 mb-4">
                    <p><span className="font-bold text-accent">生辰八字</span>：基于出生时间的天干地支，擅长分析性格特质、事业走向、五行喜忌</p>
                    <p><span className="font-bold text-accent">天体星座</span>：基于行星位置与星座关系，擅长解读情感模式、人际关系、心理动机</p>
                    <p><span className="font-bold text-accent">紫微斗数</span>：基于命宫星曜排布，擅长推演人生大运、财富状况、婚姻家庭</p>
                  </div>
                  <p className="text-xs text-ink/40 font-mono mb-3">选择您希望使用的分析体系（可多选）</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: 'bazi', label: '生辰八字' },
                      { id: 'western', label: '天体星座' },
                      { id: 'ziwei', label: '紫微斗数' }
                    ].map(system => (
                      <button
                        key={system.id}
                        onClick={() => {
                          const sysId = system.id as 'bazi' | 'western' | 'ziwei';
                          if (selectedSystems.includes(sysId)) {
                            setSelectedSystems(selectedSystems.filter(s => s !== sysId));
                          } else {
                            setSelectedSystems([...selectedSystems, sysId]);
                          }
                        }}
                        className={`px-4 py-2 text-xs font-mono transition-all ${
                          selectedSystems.includes(system.id as 'bazi' | 'western' | 'ziwei')
                            ? 'border-2 border-accent bg-accent text-white'
                            : 'border border-ink/20 text-ink/60 hover:border-accent'
                        }`}
                      >
                        {system.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-ink/40 mt-3">
                    选择多个体系将分别生成独立的分析报告，为您提供多维度的命运解读
                    <a
                      href="/article/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-accent hover:text-ink transition-colors"
                    >
                      了解八字、星座、紫微，各可以看到人生的哪些切面
                    </a>
                  </p>
                </div>

                {/* 2. 关心的方面 */}
                <div className="border border-accent/30 p-6 bg-accent/5">
                  <h3 className="text-sm font-serif font-bold mb-4">2. 关心的方面</h3>
                  <p className="text-xs text-ink/40 font-mono mb-3">允许多选，选择越少，结果越清晰垂直</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: 'career', label: '事业' },
                      { id: 'emotion', label: '情感' },
                      { id: 'family', label: '家庭' },
                      { id: 'economy', label: '经济状况' },
                      { id: 'social', label: '社会关系' },
                      { id: 'talent', label: '天赋挖掘' },
                      { id: 'spiritual', label: '精神成长' }
                    ].map(aspect => (
                      <button
                        key={aspect.id}
                        onClick={() => {
                          if (selectedAspects.includes(aspect.id)) {
                            setSelectedAspects(selectedAspects.filter(a => a !== aspect.id));
                          } else {
                            setSelectedAspects([...selectedAspects, aspect.id]);
                          }
                        }}
                        className={`px-4 py-2 text-xs font-mono transition-all ${
                          selectedAspects.includes(aspect.id)
                            ? 'border-2 border-accent bg-accent text-white'
                            : 'border border-ink/20 text-ink/60 hover:border-accent'
                        }`}
                      >
                        {aspect.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 选择模型 - 已注释，直接使用 .env 中的 DeepSeek API */}
                {/* <div className="border border-accent/30 p-6 bg-accent/5">
                  <h3 className="text-sm font-serif font-bold mb-4">3. 选择 AI 模型</h3>
                  <p className="text-xs text-ink/40 font-mono mb-4">选择认证方式获取分析能力</p>
                  
                  <div className="border-b border-ink/10 pb-4 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-ink/60">模型:</span>
                      <select 
                        value={aiModel}
                        onChange={(e) => {
                          setAiModel(e.target.value as 'deepseek' | 'chatgpt');
                          setIsAuthenticated(false);
                          setAuthError(null);
                        }}
                        className="text-xs font-mono border border-ink/20 px-3 py-1.5 bg-white rounded-none"
                      >
                        <option value="deepseek">DeepSeek</option>
                        <option value="chatgpt">ChatGPT</option>
                      </select>
                    </div>
                  </div>

                  <div className="pb-4 mb-4">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-xs font-mono text-ink/60">验证方式:</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setAuthMode('activation'); setAuthError(null); }}
                          className={`text-xs font-mono px-3 py-1 border transition-all ${
                            authMode === 'activation' 
                              ? 'border-accent bg-accent text-white' 
                              : 'border-ink/20 text-ink/60 hover:border-accent/50'
                          }`}
                        >
                          激活码
                        </button>
                        <button
                          onClick={() => { setAuthMode('apikey'); setAuthError(null); }}
                          className={`text-xs font-mono px-3 py-1 border transition-all ${
                            authMode === 'apikey' 
                              ? 'border-accent bg-accent text-white' 
                              : 'border-ink/20 text-ink/60 hover:border-accent/50'
                          }`}
                        >
                          API Key
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {authMode === 'activation' ? (
                        <input
                          type="text"
                          value={activationCode}
                          onChange={(e) => {
                            setActivationCode(e.target.value);
                            setIsAuthenticated(false);
                          }}
                          placeholder="请输入激活码"
                          className="flex-1 text-xs font-mono border border-ink/20 px-3 py-1.5 bg-white focus:border-accent focus:outline-none"
                        />
                      ) : (
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setIsAuthenticated(false);
                          }}
                          placeholder={`请输入 ${aiModel === 'deepseek' ? 'DeepSeek' : 'OpenAI'} API Key`}
                          className="flex-1 text-xs font-mono border border-ink/20 px-3 py-1.5 bg-white focus:border-accent focus:outline-none"
                        />
                      )}
                      <button
                        onClick={handleAuth}
                        disabled={isAuthenticated}
                        className={`text-xs font-mono px-4 py-1.5 transition-all ${
                          isAuthenticated 
                            ? 'bg-green-500 text-white cursor-default' 
                            : 'bg-ink text-paper hover:bg-accent'
                        }`}
                      >
                        {isAuthenticated ? '✓ 已验证' : '验证'}
                      </button>
                    </div>

                    {authError && (
                      <p className="mt-2 text-xs text-red-500 font-mono">{authError}</p>
                    )}

                    {!isAuthenticated && (
                      <p className="mt-2 text-[10px] text-ink/40 font-mono">
                        {authMode === 'activation' 
                          ? '激活码可通过邀请获取，或联系客服购买' 
                          : `使用自己的 ${aiModel === 'deepseek' ? 'DeepSeek' : 'OpenAI'} API Key，费用由您的账户承担`
                        }
                      </p>
                    )}
                  </div>
                </div> */}

                {/* 【AI深度分析】按钮 */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={performAIAnalysis}
                    disabled={isAnalyzing || selectedSystems.length === 0}
                    className={`px-8 py-3 text-sm font-mono transition-all ${
                      selectedSystems.length > 0
                        ? 'bg-accent text-white hover:bg-accent/80'
                        : 'bg-ink/20 text-ink/40 cursor-not-allowed'
                    } disabled:opacity-50`}
                  >
                    {isAnalyzing ? '正在生成AI深度分析...' : 'AI深度分析'}
                  </button>
                </div>
                {isAnalyzing && (
                  <div className="mt-3 text-[12px] font-serif text-ink/40 text-center space-y-2">
                    <span className="typewriter-caret whitespace-pre-line">{analyzingHint}</span>
                    {analyzingHint.length >= analyzingHintText.length && (
                      <a
                        href="/article/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mx-auto text-[12px] font-serif text-accent hover:text-ink transition-colors"
                      >
                        阅读：三种命理体系，会算出冲突的结果吗？→
                      </a>
                    )}
                  </div>
                )}

                {/* 分析报告展示区 - 多体系分栏显示 */}
                {showAnalysisReport && Object.keys(multiSystemAnalysis).length > 0 && (
                  <div className="mt-8 space-y-8">
                    <h3 className="text-lg font-serif font-bold text-center text-ink">AI深度分析报告</h3>
                    
                    {/* 八字分析 */}
                    {multiSystemAnalysis.bazi && (
                      <div className="border border-accent/30 p-6 bg-accent/5">
                        <div className="mb-4">
                          <h4 className="text-base font-serif font-bold text-accent">生辰八字分析</h4>
                        </div>
                        <div className="ai-analysis-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({children}) => <h1 className="text-xl font-serif font-bold text-ink mb-3 mt-6 pb-2 border-b-2 border-accent">{children}</h1>,
                              h2: ({children}) => <h2 className="text-lg font-serif font-bold text-ink mb-3 mt-6 pb-2 border-b border-ink/20">{children}</h2>,
                              h3: ({children}) => <h3 className="text-base font-serif font-bold text-ink mb-2 mt-4">{children}</h3>,
                              h4: ({children}) => <h4 className="text-sm font-serif font-semibold text-accent mb-2 mt-3">{children}</h4>,
                              p: ({children}) => <p className="text-sm font-serif text-ink/80 leading-relaxed mb-3">{children}</p>,
                              ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-3 ml-2">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside space-y-1 mb-3 ml-2">{children}</ol>,
                              li: ({children}) => <li className="text-sm font-serif text-ink/80 leading-relaxed">{children}</li>,
                              strong: ({children}) => <strong className="font-bold text-ink">{children}</strong>,
                              blockquote: ({children}) => <blockquote className="border-l-4 border-accent bg-accent/5 pl-4 py-2 my-3 italic text-ink/70">{children}</blockquote>,
                              hr: () => <hr className="my-6 border-ink/10" />,
                            }}
                          >{multiSystemAnalysis.bazi}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    
                    {/* 天体星座分析 */}
                    {multiSystemAnalysis.western && (
                      <div className="border border-accent/30 p-6 bg-accent/5">
                        <div className="mb-4">
                          <h4 className="text-base font-serif font-bold text-accent">天体星座分析</h4>
                        </div>
                        <div className="ai-analysis-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({children}) => <h1 className="text-xl font-serif font-bold text-ink mb-3 mt-6 pb-2 border-b-2 border-accent">{children}</h1>,
                              h2: ({children}) => <h2 className="text-lg font-serif font-bold text-ink mb-3 mt-6 pb-2 border-b border-ink/20">{children}</h2>,
                              h3: ({children}) => <h3 className="text-base font-serif font-bold text-ink mb-2 mt-4">{children}</h3>,
                              h4: ({children}) => <h4 className="text-sm font-serif font-semibold text-accent mb-2 mt-3">{children}</h4>,
                              p: ({children}) => <p className="text-sm font-serif text-ink/80 leading-relaxed mb-3">{children}</p>,
                              ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-3 ml-2">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside space-y-1 mb-3 ml-2">{children}</ol>,
                              li: ({children}) => <li className="text-sm font-serif text-ink/80 leading-relaxed">{children}</li>,
                              strong: ({children}) => <strong className="font-bold text-ink">{children}</strong>,
                              blockquote: ({children}) => <blockquote className="border-l-4 border-accent bg-accent/5 pl-4 py-2 my-3 italic text-ink/70">{children}</blockquote>,
                              hr: () => <hr className="my-6 border-ink/10" />,
                            }}
                          >{multiSystemAnalysis.western}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                    
                    {/* 紫微斗数分析 */}
                    {multiSystemAnalysis.ziwei && (
                      <div className="border border-accent/30 p-6 bg-accent/5">
                        <div className="mb-4">
                          <h4 className="text-base font-serif font-bold text-accent">紫微斗数分析</h4>
                        </div>
                        <div className="ai-analysis-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              h1: ({children}) => <h1 className="text-xl font-serif font-bold text-ink mb-3 mt-6 pb-2 border-b-2 border-accent">{children}</h1>,
                              h2: ({children}) => <h2 className="text-lg font-serif font-bold text-ink mb-3 mt-6 pb-2 border-b border-ink/20">{children}</h2>,
                              h3: ({children}) => <h3 className="text-base font-serif font-bold text-ink mb-2 mt-4">{children}</h3>,
                              h4: ({children}) => <h4 className="text-sm font-serif font-semibold text-accent mb-2 mt-3">{children}</h4>,
                              p: ({children}) => <p className="text-sm font-serif text-ink/80 leading-relaxed mb-3">{children}</p>,
                              ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-3 ml-2">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside space-y-1 mb-3 ml-2">{children}</ol>,
                              li: ({children}) => <li className="text-sm font-serif text-ink/80 leading-relaxed">{children}</li>,
                              strong: ({children}) => <strong className="font-bold text-ink">{children}</strong>,
                              blockquote: ({children}) => <blockquote className="border-l-4 border-accent bg-accent/5 pl-4 py-2 my-3 italic text-ink/70">{children}</blockquote>,
                              hr: () => <hr className="my-6 border-ink/10" />,
                            }}
                          >{multiSystemAnalysis.ziwei}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 深度求解按钮 - 在生成分析报告后显示 */}
                {showAnalysisReport && Object.keys(multiSystemAnalysis).length > 0 && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => {
                        setStep('deepAnalysis');
                        setDeepSelectedHistoryIds([]);
                      }}
                      className="px-8 py-3 bg-ink text-paper font-serif text-sm hover:bg-ink/90 transition-all"
                    >
                      深度求解 →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'charts' && !chartData && (
          <div className="animate-fade-in text-center py-20">
            <p className="text-sm font-serif text-ink/60 mb-6">暂无命盘数据，请先填写出生信息</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setStep('input')}
                className="px-6 py-2 border border-ink/20 text-sm font-serif hover:bg-ink/5 transition-colors"
              >
                返回填写
              </button>
              {recentProfiles.length > 0 && (
                <button
                  onClick={() => handleOpenRecentProfile(recentProfiles[0])}
                  className="px-6 py-2 bg-ink text-paper text-sm font-serif hover:bg-ink/90 transition-colors"
                >
                  打开最近档案
                </button>
              )}
            </div>
          </div>
        )}

        {/* 深度分析页面 - 使用 Portal 渲染到 body 以实现全屏 */}
        {step === 'deepAnalysis' && createPortal(
          <DeepAnalysisPage
            historyList={historyList}
            selectedIds={deepSelectedHistoryIds}
            onSelectIds={setDeepSelectedHistoryIds}
            chatMessages={deepChatMessages}
            onChatMessagesChange={setDeepChatMessages}
            chatInput={deepChatInput}
            onChatInputChange={setDeepChatInput}
            isLoading={isDeepChatLoading}
            onSetLoading={setIsDeepChatLoading}
            onBack={() => setStep(chartData ? 'charts' : 'input')}
            onNewProfile={() => setStep('input')}
            aiModel="deepseek"
            apiKey={undefined}
            userData={userData}
            chartData={chartData}
            user={user}
            remainingCalls={remainingCalls}
            onRemainingCallsChange={setRemainingCalls}
            onLogout={logout}
            onShowAuthModal={() => setShowAuthModal(true)}
            recentProfiles={recentProfiles}
            onOpenRecentProfile={handleOpenRecentProfile}
            onDeleteRecentProfile={handleDeleteRecentProfile}
            onHistoryListRefresh={refreshHistoryList}
          />,
          document.body
        )}

      </main>
      
      <footer className="mt-20 text-center text-[10px] font-mono text-ink/20">
        <p>© {new Date().getFullYear()} LIFELINE. 数据驱动命运.</p>
      </footer>
    </div>
  );
}

export default App;

