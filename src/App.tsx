import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import html2canvas from 'html2canvas';
import MinimalForm from './components/MinimalForm';
import { AstrologyEngine, BaseChartData } from './lib/AstrologyEngine';
import { KeyYear } from './components/DualLineChart';
import { prepareAIAnalysisContext } from './lib/ScoreGenerator';
import { generatePreviewAnalysis } from './lib/PreviewAnalysisService';
import { getCoordinates } from './lib/CityLookup';
import { buildAnalysisPrompt, validateActivationCode, validateApiKey } from './lib/AIPrompts';
import { callAIService } from './lib/AIService';
import { 
  getAnalysisHistory, 
  formatTimestamp,
  type AnalysisHistoryItem 
} from './lib/HistoryStorage';

// --- Components ---

const DataCard = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => (
  <div className={`border border-ink/10 p-6 ${className}`}>
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
  onCopyImage
}: { 
  description: string, 
  visible: boolean,
  copyLabel?: string,
  onCopy?: () => void,
  onCopyImage?: () => void
}) => {
  const [copied, setCopied] = React.useState(false);
  const [imageCopied, setImageCopied] = React.useState(false);

  const handleCopy = () => {
    if (onCopy) {
      onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyImage = async () => {
    if (onCopyImage) {
      await onCopyImage();
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
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
                handleCopy();
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
                handleCopyImage();
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
  <span className="ml-1 px-1 py-0.5 bg-ink text-paper text-[10px] font-mono leading-none">
    {mutagen}
  </span>
);

function App() {
  const [step, setStep] = useState<'input' | 'charts'>('input');
  const [chartData, setChartData] = useState<BaseChartData | null>(null);
  const [userData, setUserData] = useState<{ date: Date; place: string; name: string; gender: '男' | '女'; orientation?: string } | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  // @ts-expect-error - Used in performAIAnalysis via result.keyYears
  const [keyYears, setKeyYears] = useState<KeyYear[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<'deepseek' | 'chatgpt'>('deepseek');
  const [authMode, setAuthMode] = useState<'activation' | 'apikey'>('activation');
  const [activationCode, setActivationCode] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Refs for card screenshots
  const baziCardRef = useRef<HTMLDivElement>(null);
  const westernCardRef = useRef<HTMLDivElement>(null);
  const ziweiCardRef = useRef<HTMLDivElement>(null);
  const [historyList, setHistoryList] = useState<AnalysisHistoryItem[]>([]);
  const [viewingHistoryItem, setViewingHistoryItem] = useState<AnalysisHistoryItem | null>(null);

  // 第二页新增选项
  const [showExpandedOptions, setShowExpandedOptions] = useState(false);
  const [selectedInfoSources, setSelectedInfoSources] = useState<string[]>([]);
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [showAnalysisReport, setShowAnalysisReport] = useState(false);

  // 加载历史记录
  useEffect(() => {
    setHistoryList(getAnalysisHistory());
  }, []);

  const handleFormSubmit = (data: { date: Date; place: string; name: string; gender: '男' | '女'; orientation?: string }) => {
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
    // 默认使用所有三种体系进行混合分析
    setSelectedInfoSources(['bazi', 'western', 'ziwei']);
    setSelectedAspects([]);
    setShowExpandedOptions(true);
    setShowAnalysisReport(false);
    setAiAnalysis(null);
    setAuthError(null);
    setIsAuthenticated(false);
  };

  const performAIAnalysis = async () => {
    if (!userData || !chartData) return;
    if (!isAuthenticated) {
      setAuthError('请先完成身份验证');
      return;
    }
    
    setIsAnalyzing(true);
    setPreviewError(null);
    
    const birthYear = userData.date.getFullYear();
    const currentAge = new Date().getFullYear() - birthYear;
    
    // 准备命理数据
    const baziData = chartData.bazi ? {
      yearPillar: chartData.bazi.year,
      monthPillar: chartData.bazi.month,
      dayPillar: chartData.bazi.day,
      hourPillar: chartData.bazi.hour,
      dayMaster: chartData.bazi.dayGan,
      fiveElements: chartData.bazi.wuxingCount,
    } : undefined;
    
    const westernData = chartData.western ? {
      sunSign: chartData.western.sunSign,
      moonSign: chartData.western.moonSign,
      risingSign: chartData.western.ascendant || '未知',
      dominantPlanet: chartData.western.sunElement || '未知',
    } : undefined;
    
    const ziweiData = chartData.ziwei ? {
      mingGong: chartData.ziwei.mingGong,
      shenGong: chartData.ziwei.mingGong,
      majorStars: chartData.ziwei.palaces
        .filter(p => p.name === '命宫')
        .flatMap(p => p.stars.map(s => s.name))
        .slice(0, 5),
    } : undefined;
    
    // 调用AI生成趋势数据
    const result = await generatePreviewAnalysis({
      birthYear,
      currentAge,
      selectedSystems: selectedInfoSources as ('bazi' | 'western' | 'ziwei')[],
      baziData: selectedInfoSources.includes('bazi') ? baziData : undefined,
      westernData: selectedInfoSources.includes('western') ? westernData : undefined,
      ziweiData: selectedInfoSources.includes('ziwei') ? ziweiData : undefined,
    });
    
    if (result.success && result.keyYears) {
      setKeyYears(result.keyYears);
      
      // 构建包含完整用户信息的AI分析上下文
      const context = prepareAIAnalysisContext(
        result.keyYears, 
        selectedInfoSources, 
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
        // 完整命理数据
        {
          bazi: selectedInfoSources.includes('bazi') ? {
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
          western: selectedInfoSources.includes('western') ? {
            sunSign: chartData.western.sunSign,
            moonSign: chartData.western.moonSign,
            ascendant: chartData.western.ascendant,
            planets: chartData.western.planets?.map(p => ({ name: p.name, sign: p.sign })),
          } : undefined,
          ziwei: selectedInfoSources.includes('ziwei') ? {
            mingGong: chartData.ziwei.mingGong,
            palaces: chartData.ziwei.palaces?.map(p => ({
              name: p.name,
              stars: p.stars.map(s => ({ name: s.name, mutagen: s.mutagen })),
            })),
          } : undefined,
        }
      );
      const { systemPrompt, userPrompt } = buildAnalysisPrompt(context, aiModel, undefined);

      const analysisResult = await callAIService({
        systemPrompt,
        userPrompt,
        model: aiModel,
        apiKey: authMode === 'apikey' ? apiKey : undefined,
        userData,
        chartData,
      });

      if (analysisResult.success && analysisResult.analysis) {
        setAiAnalysis(analysisResult.analysis);
        setShowAnalysisReport(true);
      } else {
        setPreviewError('AI分析失败，请重试');
      }
    } else {
      setPreviewError(result.error || '生成失败，请重试');
    }

    setIsAnalyzing(false);
  };

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-6xl mx-auto bg-paper text-ink selection:bg-accent selection:text-white">
      <header className="mb-16 text-center animate-fade-in relative w-full">
        <h1 className="text-4xl font-serif font-bold tracking-tighter mb-2">LIFELINE</h1>
        <p className="text-[10px] font-mono text-ink/40 uppercase tracking-[0.3em]">命运的架构</p>
        
        {/* 历史记录按钮 */}
        {historyList.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-mono text-ink/40 hover:text-accent transition-colors flex items-center gap-1"
          >
            <span>📜</span>
            <span className="hidden sm:inline">历史 ({historyList.length})</span>
          </button>
        )}
      </header>

      {/* 历史记录面板 */}
      {showHistory && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4">
          <div className="bg-paper w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-ink/10 shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-ink/10">
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
                <button
                  onClick={() => setViewingHistoryItem(null)}
                  className="text-xs font-mono text-accent hover:underline mb-4"
                >
                  ← 返回列表
                </button>
                <div className="mb-6">
                  <h3 className="font-serif font-bold text-lg">{viewingHistoryItem.userData.name} - {viewingHistoryItem.userData.gender}</h3>
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
                          <p className="font-serif text-sm truncate">{item.userData.name} - {item.userData.gender}</p>
                          <p className="text-xs text-ink/40 font-mono">{formatTimestamp(item.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
            <div className="text-center mb-8">
               <p className="font-mono text-xs text-ink/40 uppercase tracking-widest mb-2">选择分析数据源</p>
            </div>

            <div className="space-y-6">
              {/* Bazi Card */}
              <div className="relative">
                <div 
                  ref={baziCardRef}
                  onClick={() => toggleChartSelection('bazi')}
                  className={`cursor-pointer transition-all duration-300 ${selectedCharts.includes('bazi') ? 'ring-2 ring-accent ring-offset-4 ring-offset-paper' : 'opacity-70 hover:opacity-100'}`}
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
                />
              </div>

              {/* Western Card */}
              <div className="relative">
                <div 
                  ref={westernCardRef}
                  onClick={() => toggleChartSelection('western')}
                  className={`cursor-pointer transition-all duration-300 ${selectedCharts.includes('western') ? 'ring-2 ring-accent ring-offset-4 ring-offset-paper' : 'opacity-70 hover:opacity-100'}`}
                >
                  <DataCard title="02. 天体坐标 (Western)">
                  {/* Main Luminaries */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
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
                />
              </div>

              {/* Ziwei Card (Simplified) */}
              <div className="relative">
                <div 
                  ref={ziweiCardRef}
                  onClick={() => toggleChartSelection('ziwei')}
                  className={`cursor-pointer transition-all duration-300 ${selectedCharts.includes('ziwei') ? 'ring-2 ring-accent ring-offset-4 ring-offset-paper' : 'opacity-70 hover:opacity-100'}`}
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
                              className="inline-flex items-center px-1 py-0.5 border border-ink/10 font-mono text-[10px] text-ink/80"
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
                />
              </div>
            </div>

            {/* 启动分析按钮 - 仅在未展开时显示 */}
            {!showExpandedOptions && (
              <div className="flex flex-col items-center pt-8 gap-4">
                <button
                  onClick={startAnalysis}
                  disabled={selectedCharts.length === 0 || isAnalyzing}
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
                {/* 体系介绍 */}
                <div className="border border-accent/30 p-6 bg-accent/5">
                  <h3 className="text-sm font-serif font-bold mb-4">混合体系分析</h3>
                  <div className="text-xs text-ink/60 font-mono space-y-2">
                    <p><span className="font-bold text-accent">生辰八字</span>：基于出生时间的天干地支，擅长分析性格特质、事业走向、五行喜忌</p>
                    <p><span className="font-bold text-accent">天体星座</span>：基于行星位置与星座关系，擅长解读情感模式、人际关系、心理动机</p>
                    <p><span className="font-bold text-accent">紫微斗数</span>：基于命宫星曜排布，擅长推演人生大运、财富状况、婚姻家庭</p>
                    <p className="text-[10px] text-ink/40 mt-3">我们将综合运用三种体系，为您提供多维度的命运解读。<a href="#" className="text-accent hover:underline">了解更多 →</a></p>
                  </div>
                </div>

                {/* 1. 关心的方面 */}
                <div className="border border-accent/30 p-6 bg-accent/5">
                  <h3 className="text-sm font-serif font-bold mb-4">1. 关心的方面</h3>
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

                {/* 2. 选择模型 */}
                <div className="border border-accent/30 p-6 bg-accent/5">
                  <h3 className="text-sm font-serif font-bold mb-4">2. 选择 AI 模型</h3>
                  <p className="text-xs text-ink/40 font-mono mb-4">选择认证方式获取分析能力</p>
                  
                  {/* 模型选择 */}
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

                  {/* 认证方式 */}
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

                    {/* 输入区域 */}
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

                    {/* 错误提示 */}
                    {authError && (
                      <p className="mt-2 text-xs text-red-500 font-mono">{authError}</p>
                    )}

                    {/* 提示信息 */}
                    {!isAuthenticated && (
                      <p className="mt-2 text-[10px] text-ink/40 font-mono">
                        {authMode === 'activation' 
                          ? '激活码可通过邀请获取，或联系客服购买' 
                          : `使用自己的 ${aiModel === 'deepseek' ? 'DeepSeek' : 'OpenAI'} API Key，费用由您的账户承担`
                        }
                      </p>
                    )}
                  </div>
                </div>

                {/* 【AI深度分析】按钮 */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={performAIAnalysis}
                    disabled={isAnalyzing || !isAuthenticated || selectedAspects.length === 0}
                    className={`px-8 py-3 text-sm font-mono transition-all ${
                      isAuthenticated && selectedAspects.length > 0
                        ? 'bg-accent text-white hover:bg-accent/80'
                        : 'bg-ink/20 text-ink/40 cursor-not-allowed'
                    } disabled:opacity-50`}
                  >
                    {isAnalyzing ? '正在生成AI深度分析...' : '【AI深度分析】'}
                  </button>
                </div>

                {/* 分析报告展示区 */}
                {showAnalysisReport && aiAnalysis && (
                  <div className="border border-accent/30 p-6 bg-accent/5 mt-6">
                    <h3 className="text-sm font-serif font-bold mb-4">AI深度分析报告</h3>
                    <div className="ai-analysis-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({children}) => <h1 className="text-2xl font-serif font-bold text-ink mb-4 mt-8 pb-3 border-b-2 border-accent">{children}</h1>,
                          h2: ({children}) => <h2 className="text-xl font-serif font-bold text-ink mb-4 mt-8 pb-2 border-b border-ink/20">{children}</h2>,
                          h3: ({children}) => <h3 className="text-lg font-serif font-bold text-ink mb-3 mt-6">{children}</h3>,
                          h4: ({children}) => <h4 className="text-base font-serif font-semibold text-accent mb-2 mt-5">{children}</h4>,
                          p: ({children}) => <p className="text-sm font-serif text-ink/80 leading-relaxed mb-4">{children}</p>,
                          ul: ({children}) => <ul className="list-disc list-inside space-y-2 mb-4 ml-2">{children}</ul>,
                          ol: ({children}) => <ol className="list-decimal list-inside space-y-2 mb-4 ml-2">{children}</ol>,
                          li: ({children}) => <li className="text-sm font-serif text-ink/80 leading-relaxed">{children}</li>,
                          strong: ({children}) => <strong className="font-bold text-ink">{children}</strong>,
                          blockquote: ({children}) => <blockquote className="border-l-4 border-accent bg-accent/5 pl-4 py-3 my-4 italic text-ink/70">{children}</blockquote>,
                          hr: () => <hr className="my-8 border-ink/10" />,
                          table: ({children}) => <div className="overflow-x-auto my-6"><table className="min-w-full border-collapse border border-ink/20 text-sm font-serif">{children}</table></div>,
                          thead: ({children}) => <thead className="bg-ink/5">{children}</thead>,
                          tbody: ({children}) => <tbody>{children}</tbody>,
                          tr: ({children}) => <tr className="border-b border-ink/10 hover:bg-ink/5 transition-colors">{children}</tr>,
                          th: ({children}) => <th className="border-r border-ink/10 px-4 py-2 text-left font-bold text-ink/80 last:border-r-0">{children}</th>,
                          td: ({children}) => <td className="border-r border-ink/10 px-4 py-2 text-ink/70 last:border-r-0">{children}</td>,
                        }}
                      >{aiAnalysis}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="mt-20 text-center text-[10px] font-mono text-ink/20">
        <p>© {new Date().getFullYear()} LIFELINE. 数据驱动命运.</p>
      </footer>
    </div>
  );
}

export default App;

