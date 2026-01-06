/**
 * 关键年份展示组件
 * 极简优雅设计：细线条 + 小圆点 + 精致tooltip
 */

import { useState, useMemo } from 'react';

export interface KeyYear {
  year: number;
  age: number;
  type: 'peak' | 'valley' | 'turning' | 'volatile';
  dimension: 'career' | 'relationship' | 'both';
  score: { career: number; relationship: number };
  summary: string;
}

export interface YearScore {
  year: number;
  age: number;
  career: number;
  relationship: number;
}

interface KeyYearsChartProps {
  keyYears: KeyYear[];
  birthYear: number;
  currentAge: number;
  fullData?: YearScore[];
  isUnlocked?: boolean;
}

const KeyYearsChart = ({ keyYears, birthYear, currentAge, fullData, isUnlocked = false }: KeyYearsChartProps) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    clientX: number;
    clientY: number;
    year: number;
    age: number;
    career: number;
    relationship: number;
    isKeyYear: boolean;
    summary?: string;
  } | null>(null);

  // 图表尺寸 - 宽高比约 3:1，避免拉伸
  const width = 960;
  const height = 320;
  const padding = { top: 40, right: 30, bottom: 50, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // 展示范围
  const minAge = Math.max(0, currentAge - 10);
  const maxAge = currentAge + 30;
  const ageRange = maxAge - minAge;

  // 生成背景假曲线（预览模式）
  const { fakePath1, fakePath2 } = useMemo(() => {
    const pts1: string[] = [];
    const pts2: string[] = [];
    
    for (let i = 0; i <= 80; i++) {
      const x = padding.left + (i / 80) * chartWidth;
      // 使用关键年份作为锚点生成平滑曲线
      const baseCareer = 50 + Math.sin(i * 0.12) * 20 + Math.sin(i * 0.05 + 1) * 15;
      const baseRel = 50 + Math.sin(i * 0.1 + 2) * 18 + Math.sin(i * 0.07) * 12;
      
      const y1 = padding.top + chartHeight - ((baseCareer - 20) / 60) * chartHeight;
      const y2 = padding.top + chartHeight - ((baseRel - 20) / 60) * chartHeight;
      
      pts1.push(`${x.toFixed(1)},${y1.toFixed(1)}`);
      pts2.push(`${x.toFixed(1)},${y2.toFixed(1)}`);
    }
    
    return {
      fakePath1: `M ${pts1.join(' L ')}`,
      fakePath2: `M ${pts2.join(' L ')}`
    };
  }, [chartWidth, chartHeight, padding]);

  // 生成真实曲线（解锁模式）
  const { realPath1, realPath2 } = useMemo(() => {
    if (!fullData || fullData.length === 0) return { realPath1: '', realPath2: '' };
    
    const filtered = fullData.filter(d => d.age >= minAge && d.age <= maxAge);
    if (filtered.length === 0) return { realPath1: '', realPath2: '' };
    
    const pts1: string[] = [];
    const pts2: string[] = [];
    
    filtered.forEach(d => {
      const x = padding.left + ((d.age - minAge) / ageRange) * chartWidth;
      const y1 = padding.top + chartHeight - ((d.career - 20) / 60) * chartHeight;
      const y2 = padding.top + chartHeight - ((d.relationship - 20) / 60) * chartHeight;
      pts1.push(`${x.toFixed(1)},${Math.max(padding.top, Math.min(padding.top + chartHeight, y1)).toFixed(1)}`);
      pts2.push(`${x.toFixed(1)},${Math.max(padding.top, Math.min(padding.top + chartHeight, y2)).toFixed(1)}`);
    });
    
    return {
      realPath1: `M ${pts1.join(' L ')}`,
      realPath2: `M ${pts2.join(' L ')}`
    };
  }, [fullData, minAge, maxAge, ageRange, chartWidth, chartHeight, padding]);

  // 关键年份点位置
  const keyPoints = useMemo(() => {
    return keyYears.map(ky => {
      const x = padding.left + ((ky.age - minAge) / ageRange) * chartWidth;
      const careerY = padding.top + chartHeight - ((ky.score.career - 20) / 60) * chartHeight;
      const relY = padding.top + chartHeight - ((ky.score.relationship - 20) / 60) * chartHeight;
      
      return {
        ...ky,
        x: Math.max(padding.left, Math.min(width - padding.right, x)),
        careerY: Math.max(padding.top, Math.min(padding.top + chartHeight, careerY)),
        relY: Math.max(padding.top, Math.min(padding.top + chartHeight, relY)),
      };
    });
  }, [keyYears, minAge, ageRange, chartWidth, chartHeight, padding, width]);

  // 鼠标事件
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    
    // 检查关键年份点
    for (const pt of keyPoints) {
      if (Math.abs(mouseX - pt.x) < 25) {
        setHoveredPoint({
          clientX: e.clientX,
          clientY: e.clientY,
          year: pt.year,
          age: pt.age,
          career: pt.score.career,
          relationship: pt.score.relationship,
          isKeyYear: true,
          summary: pt.summary,
        });
        return;
      }
    }
    
    // 解锁模式下检查曲线点
    if (isUnlocked && fullData) {
      const age = Math.round(minAge + (mouseX - padding.left) / chartWidth * ageRange);
      const dataPoint = fullData.find(d => d.age === age);
      if (dataPoint && mouseX >= padding.left && mouseX <= width - padding.right) {
        setHoveredPoint({
          clientX: e.clientX,
          clientY: e.clientY,
          year: dataPoint.year,
          age: dataPoint.age,
          career: dataPoint.career,
          relationship: dataPoint.relationship,
          isKeyYear: keyYears.some(k => k.year === dataPoint.year),
        });
        return;
      }
    }
    
    // 预览模式下显示锁定提示
    if (!isUnlocked && mouseX >= padding.left && mouseX <= width - padding.right) {
      const age = Math.round(minAge + (mouseX - padding.left) / chartWidth * ageRange);
      const nearKey = keyPoints.some(p => Math.abs(p.x - mouseX) < 30);
      if (!nearKey) {
        setHoveredPoint({
          clientX: e.clientX,
          clientY: e.clientY,
          year: birthYear + age,
          age,
          career: 0,
          relationship: 0,
          isKeyYear: false,
        });
        return;
      }
    }
    
    setHoveredPoint(null);
  };

  return (
    <div className="w-full">
      {/* 图例 */}
      <div className="flex justify-between items-center mb-4 px-1">
        <span className="text-[11px] font-mono text-ink/30 uppercase tracking-wider">
          {isUnlocked ? 'Full Trajectory' : 'Key Years Preview'}
        </span>
        <div className="flex gap-5 text-[11px] font-mono text-ink/40">
          <span className="flex items-center gap-2">
            <span className="w-3 h-[2px] bg-amber-600/70"></span>
            事业
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-[2px] bg-rose-500/70"></span>
            情感
          </span>
        </div>
      </div>

      {/* SVG 图表 */}
      <div className="relative">
        <svg 
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ aspectRatio: `${width}/${height}` }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          {/* 背景 */}
          <rect x="0" y="0" width={width} height={height} fill="transparent" />
          
          {/* 水平参考线 */}
          <g stroke="currentColor" strokeOpacity="0.06">
            {[30, 50, 70].map(val => {
              const y = padding.top + chartHeight - ((val - 20) / 60) * chartHeight;
              return (
                <line key={val} x1={padding.left} y1={y} x2={width - padding.right} y2={y} strokeDasharray="2 6" />
              );
            })}
          </g>

          {/* 曲线 */}
          {!isUnlocked ? (
            <>
              <path d={fakePath1} fill="none" stroke="#b45309" strokeWidth="1.5" strokeOpacity="0.15" />
              <path d={fakePath2} fill="none" stroke="#e11d48" strokeWidth="1.5" strokeOpacity="0.15" />
            </>
          ) : (
            <>
              <path d={realPath1} fill="none" stroke="#b45309" strokeWidth="1.8" strokeOpacity="0.7" strokeLinecap="round" />
              <path d={realPath2} fill="none" stroke="#e11d48" strokeWidth="1.8" strokeOpacity="0.7" strokeLinecap="round" />
            </>
          )}

          {/* 关键年份竖线 */}
          {keyPoints.map(pt => (
            <line
              key={`vline-${pt.year}`}
              x1={pt.x}
              y1={padding.top}
              x2={pt.x}
              y2={padding.top + chartHeight}
              stroke="#c9a227"
              strokeWidth="1"
              strokeOpacity="0.25"
              strokeDasharray="3 5"
            />
          ))}

          {/* 关键年份点 - 事业（小实心圆） */}
          {keyPoints.map(pt => (
            <circle
              key={`c-${pt.year}`}
              cx={pt.x}
              cy={pt.careerY}
              r="5"
              fill="#b45309"
              stroke="#fff"
              strokeWidth="1.5"
              style={{ cursor: 'pointer' }}
            />
          ))}

          {/* 关键年份点 - 情感（小实心圆） */}
          {keyPoints.map(pt => (
            <circle
              key={`r-${pt.year}`}
              cx={pt.x}
              cy={pt.relY}
              r="5"
              fill="#e11d48"
              stroke="#fff"
              strokeWidth="1.5"
              style={{ cursor: 'pointer' }}
            />
          ))}

          {/* 年份标签 */}
          {keyPoints.map(pt => (
            <g key={`lbl-${pt.year}`}>
              <text
                x={pt.x}
                y={padding.top + chartHeight + 20}
                fontSize="11"
                fill="#c9a227"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                fontWeight="600"
              >
                {pt.year}
              </text>
              <text
                x={pt.x}
                y={padding.top + chartHeight + 34}
                fontSize="9"
                fill="currentColor"
                fillOpacity="0.3"
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
              >
                {pt.age}岁
              </text>
            </g>
          ))}

          {/* 悬停指示线 */}
          {hoveredPoint && (
            <line
              x1={padding.left + ((hoveredPoint.age - minAge) / ageRange) * chartWidth}
              y1={padding.top}
              x2={padding.left + ((hoveredPoint.age - minAge) / ageRange) * chartWidth}
              y2={padding.top + chartHeight}
              stroke="#c9a227"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
          )}
        </svg>

        {/* Tooltip - 使用 fixed 定位避免被裁剪 */}
        {hoveredPoint && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: hoveredPoint.clientX > window.innerWidth - 250 
                ? hoveredPoint.clientX - 220 
                : hoveredPoint.clientX + 16,
              top: Math.max(80, Math.min(hoveredPoint.clientY - 40, window.innerHeight - 200)),
            }}
          >
            <div className="bg-paper/98 backdrop-blur-sm border border-ink/10 shadow-xl rounded-sm px-4 py-3 w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono font-semibold text-ink/70">
                  {hoveredPoint.year}年
                </span>
                <span className="text-xs text-ink/40">({hoveredPoint.age}岁)</span>
                {hoveredPoint.isKeyYear && (
                  <span className="text-amber-500 text-sm">★</span>
                )}
              </div>
              
              {isUnlocked || hoveredPoint.isKeyYear ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink/50">事业</span>
                    <span className="text-base font-mono font-bold text-amber-700">{hoveredPoint.career}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink/50">情感</span>
                    <span className="text-base font-mono font-bold text-rose-600">{hoveredPoint.relationship}</span>
                  </div>
                  {hoveredPoint.summary && (
                    <div className="pt-2 mt-1 border-t border-ink/10 text-xs text-ink/60 leading-relaxed">
                      {hoveredPoint.summary}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-ink/40 italic">
                  深度分析后解锁完整数据
                </div>
              )}
            </div>
          </div>
        )}

        {/* 底部提示 */}
        {!isUnlocked && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-paper to-transparent pointer-events-none flex items-end justify-center pb-1">
            <span className="text-[10px] font-mono text-ink/25">
              完整曲线请获取深度分析
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyYearsChart;
