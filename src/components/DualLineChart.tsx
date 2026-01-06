import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';

export interface YearScore {
  year: number;       // 公历年
  age: number;        // 年龄
  career: number;     // 事业/资源/声望 (0-100)
  relationship: number; // 情感/家庭/人际 (0-100)
  // 体系贡献（用于解释）
  contributions?: {
    bazi?: { career: number; relationship: number };
    western?: { career: number; relationship: number };
    ziwei?: { career: number; relationship: number };
  };
}

export interface KeyYear {
  year: number;
  age: number;
  type: 'peak' | 'valley' | 'turning' | 'volatile';
  dimension: 'career' | 'relationship' | 'both';
  score: { career: number; relationship: number };
  summary: string;
  detailedExplanation?: string; // 付费解锁
}

interface DualLineChartProps {
  data: YearScore[];
  keyYears: KeyYear[];
  onYearClick?: (year: number) => void;
  selectedYear?: number | null;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as YearScore;
    return (
      <div className="bg-paper border border-ink/10 p-4 shadow-lg max-w-xs">
        <p className="font-mono text-xs text-ink/40 mb-1">{data.year}年 (年龄 {data.age})</p>
        <div className="space-y-1 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="font-serif text-sm">事业/声望: {data.career}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-400"></div>
            <span className="font-serif text-sm">情感/人际: {data.relationship}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const DualLineChart = ({ data, keyYears, onYearClick }: DualLineChartProps) => {


  return (
    <div className="w-full h-[400px] animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          onClick={(e) => {
            if (e && e.activePayload && onYearClick) {
              onYearClick(e.activePayload[0].payload.year);
            }
          }}
        >
          <defs>
            <linearGradient id="careerGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="relationshipGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" strokeOpacity={0.05} vertical={false} />
          <XAxis 
            dataKey="year" 
            stroke="#1a1a1a" 
            strokeOpacity={0.2} 
            tick={{ fontFamily: 'monospace', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            tickFormatter={(value) => `${value}`}
          />
          <YAxis 
            domain={[0, 100]}
            stroke="#1a1a1a" 
            strokeOpacity={0.2}
            tick={{ fontFamily: 'monospace', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d4af37', strokeWidth: 1, strokeDasharray: '5 5' }} />
          <Legend 
            verticalAlign="top" 
            height={36}
            formatter={(value) => (
              <span className="font-serif text-xs text-ink/60">
                {value === 'career' ? '事业/资源/声望' : '情感/家庭/人际'}
              </span>
            )}
          />
          <ReferenceLine y={50} stroke="#1a1a1a" strokeOpacity={0.1} strokeDasharray="3 3" />
          
          {/* 关键年份标记 */}
          {keyYears.map(ky => (
            <ReferenceLine 
              key={ky.year} 
              x={ky.year} 
              stroke="#d4af37" 
              strokeOpacity={0.3} 
              strokeDasharray="2 2"
            />
          ))}
          
          <Line 
            type="monotone" 
            dataKey="career" 
            name="career"
            stroke="#d97706" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: '#d97706' }}
            animationDuration={1500}
          />
          <Line 
            type="monotone" 
            dataKey="relationship" 
            name="relationship"
            stroke="#f43f5e" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: '#f43f5e' }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DualLineChart;
