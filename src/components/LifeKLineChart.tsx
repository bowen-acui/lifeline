import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface KLineDataPoint {
  age: number;
  open: number;
  high: number;
  low: number;
  close: number;
  description?: string;
}

interface KLineChartData {
  title: string;
  subtitle?: string;
  data: KLineDataPoint[];
  summary?: string;
  keyYears?: Array<{ age: number; event: string }>;
}

interface LifeKLineChartProps {
  chartData: KLineChartData;
}

// 全屏模态框
function FullscreenModal({ chartData, onClose }: { chartData: KLineChartData; onClose: () => void }) {
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div 
        className="bg-paper w-full max-w-6xl max-h-[90vh] overflow-auto border border-ink/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-ink/10">
          <div>
            <h3 className="text-lg font-serif font-bold">{chartData.title} - 人生运势K线图</h3>
            {chartData.subtitle && <p className="text-sm text-ink/50">{chartData.subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink text-2xl">×</button>
        </div>
        <div className="p-6">
          <KLineChartSVG chartData={chartData} width={1000} height={500} isFullscreen />
          
          {chartData.keyYears && chartData.keyYears.length > 0 && (
            <div className="mt-6 border-t border-ink/10 pt-4">
              <h4 className="text-sm font-serif font-bold mb-3">重要年份节点</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {chartData.keyYears.map((ky, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="font-mono text-accent font-bold">{ky.age}岁</span>
                    <span className="text-ink/70">{ky.event}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {chartData.summary && (
            <div className="mt-6 border-t border-ink/10 pt-4">
              <h4 className="text-sm font-serif font-bold mb-3">运势解读</h4>
              <p className="text-sm text-ink/70 leading-relaxed">{chartData.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// K线图SVG
function KLineChartSVG({ chartData, width = 600, height = 300, isFullscreen = false }: { 
  chartData: KLineChartData; width?: number; height?: number; isFullscreen?: boolean;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<KLineDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  const data = chartData.data;
  if (!data || data.length === 0) return <p className="text-ink/40 text-sm">暂无数据</p>;

  const padding = { top: 30, right: 40, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minValue = Math.min(...data.map(d => d.low));
  const maxValue = Math.max(...data.map(d => d.high));
  const yMin = Math.max(0, minValue - 5);
  const yMax = Math.min(100, maxValue + 5);
  const yRange = yMax - yMin || 1;

  const minAge = Math.min(...data.map(d => d.age));
  const maxAge = Math.max(...data.map(d => d.age));
  const ageRange = maxAge - minAge || 1;

  const xScale = (age: number) => padding.left + ((age - minAge) / ageRange) * chartWidth;
  const yScale = (value: number) => padding.top + chartHeight - ((value - yMin) / yRange) * chartHeight;

  const candleWidth = Math.max(6, Math.min(isFullscreen ? 30 : 18, chartWidth / data.length * 0.7));
  const yTicks = [0, 25, 50, 75, 100].filter(t => t >= yMin && t <= yMax);
  const xTickInterval = isFullscreen ? 5 : 10;
  const xTicks = data.filter(d => d.age % xTickInterval === 0).map(d => d.age);
  const keyYearAges = new Set(chartData.keyYears?.map(k => k.age) || []);

  const handleMouseMove = (e: React.MouseEvent, point: KLineDataPoint) => {
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10 });
    }
    setHoveredPoint(point);
  };

  const getTrendText = (p: KLineDataPoint) => {
    const change = p.close - p.open;
    if (change > 10) return '大幅上升';
    if (change > 0) return '稳步上升';
    if (change > -10) return '略有下降';
    return '明显下降';
  };

  return (
    <div className="relative">
      <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} 
           className="font-mono" onMouseLeave={() => setHoveredPoint(null)}>
        
        {/* 网格 */}
        <g>
          {yTicks.map(tick => (
            <line key={`y-${tick}`} x1={padding.left} y1={yScale(tick)} x2={width - padding.right} y2={yScale(tick)}
                  stroke="currentColor" strokeOpacity={0.08} strokeDasharray="4,4" />
          ))}
        </g>

        {/* Y轴 */}
        <g>
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom}
                stroke="currentColor" strokeOpacity={0.2} />
          {yTicks.map(tick => (
            <text key={`yl-${tick}`} x={padding.left - 10} y={yScale(tick)} textAnchor="end" 
                  dominantBaseline="middle" className="text-[11px] fill-current opacity-50">{tick}</text>
          ))}
        </g>

        {/* X轴 */}
        <g>
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom}
                stroke="currentColor" strokeOpacity={0.2} />
          {xTicks.map(age => (
            <g key={`x-${age}`}>
              <line x1={xScale(age)} y1={height - padding.bottom} x2={xScale(age)} y2={height - padding.bottom + 6}
                    stroke="currentColor" strokeOpacity={0.2} />
              <text x={xScale(age)} y={height - padding.bottom + 20} textAnchor="middle" 
                    className="text-[11px] fill-current opacity-50">{age}岁</text>
            </g>
          ))}
        </g>

        {/* K线 */}
        <g>
          {data.map((d, i) => {
            const x = xScale(d.age);
            const isUp = d.close >= d.open;
            const isKeyYear = keyYearAges.has(d.age);
            const isHovered = hoveredPoint?.age === d.age;
            const color = isUp ? '#22c55e' : '#ef4444';
            const bodyTop = yScale(Math.max(d.open, d.close));
            const bodyBottom = yScale(Math.min(d.open, d.close));
            const bodyHeight = Math.max(2, bodyBottom - bodyTop);

            return (
              <g key={i} style={{ cursor: 'pointer' }} onMouseMove={(e) => handleMouseMove(e, d)}>
                {isKeyYear && <circle cx={x} cy={padding.top - 10} r={4} fill="#d4af37" />}
                {isHovered && (
                  <rect x={x - candleWidth} y={padding.top} width={candleWidth * 2} height={chartHeight}
                        fill="currentColor" fillOpacity={0.05} />
                )}
                <line x1={x} y1={yScale(d.high)} x2={x} y2={yScale(d.low)} stroke={color} strokeWidth={isHovered ? 2 : 1} />
                <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight}
                      fill={color} stroke={isHovered ? '#000' : color} strokeWidth={isHovered ? 2 : 1} rx={1} />
              </g>
            );
          })}
        </g>

        {/* 图例 */}
        <g transform={`translate(${width - padding.right - 120}, ${padding.top - 15})`}>
          <rect x={0} y={0} width={14} height={14} fill="#22c55e" rx={2} />
          <text x={18} y={11} className="text-[11px] fill-current opacity-60">运势上升</text>
          <rect x={70} y={0} width={14} height={14} fill="#ef4444" rx={2} />
          <text x={88} y={11} className="text-[11px] fill-current opacity-60">运势下降</text>
        </g>

        <text x={width / 2} y={height - 8} textAnchor="middle" className="text-[11px] fill-current opacity-40">年龄</text>
        <text x={15} y={height / 2} textAnchor="middle" transform={`rotate(-90, 15, ${height / 2})`} 
              className="text-[11px] fill-current opacity-40">整体运势</text>
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div className="absolute pointer-events-none bg-ink text-paper px-3 py-2 text-xs font-serif shadow-lg z-10"
             style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}>
          <div className="font-bold mb-1">{hoveredPoint.age}岁</div>
          <div className="space-y-0.5 text-paper/80">
            <div>开盘: {hoveredPoint.open} → 收盘: {hoveredPoint.close}</div>
            <div>最高: {hoveredPoint.high} / 最低: {hoveredPoint.low}</div>
            <div className={hoveredPoint.close >= hoveredPoint.open ? 'text-green-300' : 'text-red-300'}>
              趋势: {getTrendText(hoveredPoint)}
            </div>
            {hoveredPoint.description && (
              <div className="mt-1 pt-1 border-t border-paper/20 text-paper/90">{hoveredPoint.description}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 主组件
export default function LifeKLineChart({ chartData }: LifeKLineChartProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  return (
    <div className="space-y-4">
      {/* 标题和副标题 */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-serif font-bold text-sm">{chartData.title}</h4>
          {chartData.subtitle && <p className="text-xs text-ink/50">{chartData.subtitle}</p>}
        </div>
      </div>

      <div className="relative group">
        <KLineChartSVG chartData={chartData} width={560} height={280} />
        <button onClick={() => setShowFullscreen(true)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-ink/80 text-paper px-2 py-1 text-xs">
          全屏查看
        </button>
      </div>

      {chartData.summary && (
        <p className="text-xs text-ink/60 leading-relaxed border-l-2 border-accent/30 pl-3">{chartData.summary}</p>
      )}

      {chartData.keyYears && chartData.keyYears.length > 0 && (
        <div className="text-xs">
          <span className="text-ink/40 mr-2">重要节点:</span>
          {chartData.keyYears.slice(0, 5).map((ky, i) => (
            <span key={i} className="inline-flex items-center mr-3">
              <span className="w-2 h-2 bg-accent rounded-full mr-1"></span>
              <span className="font-mono text-accent">{ky.age}岁</span>
              <span className="text-ink/50 ml-1">{ky.event}</span>
            </span>
          ))}
        </div>
      )}

      {showFullscreen && createPortal(
        <FullscreenModal chartData={chartData} onClose={() => setShowFullscreen(false)} />,
        document.body
      )}
    </div>
  );
}
