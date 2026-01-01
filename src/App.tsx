import React, { useState } from 'react';
import MinimalForm from './components/MinimalForm';
import { AstrologyEngine, BaseChartData } from './lib/AstrologyEngine';
import LifePathChart from './components/LifePathChart';
import { getCoordinates } from './lib/CityLookup';
import { SeededRandom } from './lib/SeededRandom';

// --- Components ---

const DataCard = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => (
  <div className={`border border-ink/10 p-6 ${className}`}>
    <h3 className="text-xs font-mono uppercase tracking-widest mb-4 text-ink/40">{title}</h3>
    <div className="font-serif text-ink">
      {children}
    </div>
  </div>
);

const KeyValue = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-baseline mb-2 text-sm">
    <span className="font-mono text-ink/40 text-xs">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const MutagenBadge = ({ mutagen }: { mutagen: string }) => (
  <span className="ml-1 px-1 py-0.5 bg-ink text-paper text-[10px] font-mono leading-none">
    {mutagen}
  </span>
);

// --- Mock Data Generator ---

const generateLifePath = (seed: string, startAge: number = 0, endAge: number = 80) => {
  const rng = new SeededRandom(seed);
  const events = [];
  let currentScore = 50;
  
  for (let age = startAge; age <= endAge; age++) {
    // Random walk with momentum
    const change = (rng.next() - 0.5) * 20;
    currentScore += change;
    // Clamp between 20 and 90
    currentScore = Math.max(20, Math.min(90, currentScore));
    
    let summary = "平稳的成长期与反思期。";
    if (currentScore > 75) summary = "巅峰状态。充满活力与成功。";
    if (currentScore < 35) summary = "充满挑战的时期，需要耐心与韧性。";
    if (Math.abs(change) > 15) summary = "人生道路的重要转折点。";

    events.push({
      age,
      score: Math.round(currentScore),
      summary
    });
  }
  return events;
};

function App() {
  const [step, setStep] = useState<'input' | 'charts' | 'analysis'>('input');
  const [chartData, setChartData] = useState<BaseChartData | null>(null);
  const [userData, setUserData] = useState<{ date: Date; place: string; name: string; gender: '男' | '女'; orientation?: string } | null>(null);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [lifePathData, setLifePathData] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

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
      setSelectedCharts(selectedCharts.filter(c => c !== chart));
    } else {
      setSelectedCharts([...selectedCharts, chart]);
    }
  };

  const startAnalysis = async () => {
    if (!userData || !chartData) return;
    setIsAnalyzing(true);
    
    // Use user data to seed the random generator for consistent "mock" results
    const seed = `${userData.name}-${userData.gender}-${userData.date.toISOString()}-${userData.place}`;
    setLifePathData(generateLifePath(seed));

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userData,
          chartData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiAnalysis(data.analysis);
      } else {
        let details = '';
        try {
          details = await response.text();
        } catch {}
        console.error('Failed to fetch analysis', {
          status: response.status,
          details,
        });
        setAiAnalysis("（AI 分析服务暂时不可用，请检查网络或 API 配置。以下为基础命理数据生成的默认解读。）\n\n根据您的命盘，您拥有坚韧的性格特质。目前的星象显示您正处于一个积累能量的阶段。建议您保持耐心，关注内心的声音，在行动前深思熟虑。");
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setAiAnalysis("（连接 AI 服务失败。以下为基础命理数据生成的默认解读。）\n\n根据您的命盘，您拥有坚韧的性格特质。目前的星象显示您正处于一个积累能量的阶段。建议您保持耐心，关注内心的声音，在行动前深思熟虑。");
    } finally {
      setIsAnalyzing(false);
      setStep('analysis');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-4xl mx-auto bg-paper text-ink selection:bg-accent selection:text-white">
      <header className="mb-16 text-center animate-fade-in">
        <h1 className="text-4xl font-serif font-bold tracking-tighter mb-2">LIFELINE</h1>
        <p className="text-[10px] font-mono text-ink/40 uppercase tracking-[0.3em]">命运的架构</p>
      </header>

      <main className="w-full max-w-2xl">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bazi Card */}
              <div 
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

              {/* Western Card */}
              <div 
                onClick={() => toggleChartSelection('western')}
                className={`cursor-pointer transition-all duration-300 ${selectedCharts.includes('western') ? 'ring-2 ring-accent ring-offset-4 ring-offset-paper' : 'opacity-70 hover:opacity-100'}`}
              >
                <DataCard title="02. 天体坐标 (Western)">
                  <KeyValue label="Sun 太阳" value={chartData.western.sunSign} />
                  <KeyValue label="Moon 月亮" value={chartData.western.moonSign} />
                  {chartData.western.planets.map(p => (
                     <KeyValue key={p.name} label={p.name} value={p.sign} />
                  ))}
                </DataCard>
              </div>
            </div>

            {/* Ziwei Card (Simplified) */}
            <div 
                onClick={() => toggleChartSelection('ziwei')}
                className={`cursor-pointer transition-all duration-300 ${selectedCharts.includes('ziwei') ? 'ring-2 ring-accent ring-offset-4 ring-offset-paper' : 'opacity-70 hover:opacity-100'}`}
            >
              <DataCard title="03. 紫微斗数 (Ziwei)">
                 <div className="grid grid-cols-4 gap-2 text-xs">
                    {chartData.ziwei.palaces?.map((palace) => (
                      <div
                        key={palace.name}
                        className={`p-2 border ${palace.name === '命宫' ? 'border-ink bg-ink/5' : 'border-ink/10'} flex flex-col text-center`}
                      >
                        <div className="font-bold">{palace.name}</div>
                        <div className="text-ink/50 text-[11px] font-mono">
                          {palace.heavenlyStem}{palace.earthlyBranch}
                        </div>
                        <div className="mt-2 flex flex-wrap justify-center gap-1">
                          {palace.stars.slice(0, 10).map((s) => (
                            <span
                              key={`${palace.name}-${s.name}-${s.mutagen ?? ''}`}
                              className="px-1 py-0.5 border border-ink/10 font-mono text-[10px] text-ink/80"
                            >
                              {s.name}
                              {s.mutagen ? <MutagenBadge mutagen={s.mutagen} /> : null}
                            </span>
                          ))}
                        </div>
                        {palace.stars.length > 10 ? (
                          <div className="mt-2 text-[10px] font-mono text-ink/40">
                            +{palace.stars.length - 10}...
                          </div>
                        ) : null}
                      </div>
                    ))}
                 </div>
              </DataCard>
            </div>

            <div className="flex justify-center pt-8">
              <button 
                onClick={startAnalysis}
                disabled={selectedCharts.length === 0 || isAnalyzing}
                className="btn-primary group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10">
                  {isAnalyzing ? '正在计算神经矩阵...' : '启动命运分析'}
                </span>
                <div className="absolute inset-0 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300 ease-out -z-0"></div>
              </button>
            </div>
          </div>
        )}

        {step === 'analysis' && (
           <div className="animate-slide-up w-full">
             <div className="mb-12 text-center">
                <h2 className="text-2xl font-serif font-bold mb-2">人生轨迹分析</h2>
                <p className="font-mono text-xs text-ink/40 uppercase tracking-widest">能量流向预测</p>
             </div>

             {aiAnalysis && (
               <div className="mb-12 border border-ink/10 p-6 bg-white/50 font-serif leading-relaxed whitespace-pre-line">
                 <h3 className="text-xs font-mono uppercase tracking-widest mb-4 text-ink/40">DeepSeek 深度解读</h3>
                 {aiAnalysis}
               </div>
             )}
             
             <div className="mb-12 border border-ink/10 p-4 bg-white/50">
                <LifePathChart data={lifePathData} />
             </div>

             <div className="grid grid-cols-1 gap-8">
                {lifePathData.filter((_, i) => i % 10 === 0).map((event) => (
                  <div key={event.age} className="flex gap-4 border-l border-ink/10 pl-6 py-2">
                    <div className="font-mono text-accent text-xl font-bold w-12">{event.age}</div>
                    <div>
                      <p className="font-serif text-lg mb-1">{event.summary}</p>
                      <div className="h-1 w-24 bg-ink/5 rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${event.score}%` }}></div>
                      </div>
                    </div>
                  </div>
                ))}
             </div>

             <div className="mt-16 text-center">
               <button onClick={() => setStep('input')} className="text-xs font-mono underline hover:text-accent">
                 重置系统
               </button>
             </div>
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
