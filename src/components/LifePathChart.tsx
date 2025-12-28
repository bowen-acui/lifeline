import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface LifeEvent {
  age: number;
  score: number;
  summary: string;
}

interface LifePathChartProps {
  data: LifeEvent[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-paper border border-ink/10 p-4 shadow-lg max-w-xs">
        <p className="font-mono text-xs text-ink/40 mb-1">年龄 {label}</p>
        <p className="font-serif text-sm text-ink mb-2">{payload[0].payload.summary}</p>
        <p className="font-mono text-xs text-accent">能量指数: {payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

const LifePathChart = ({ data }: LifePathChartProps) => {
  return (
    <div className="w-full h-[400px] animate-fade-in">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" strokeOpacity={0.05} vertical={false} />
          <XAxis 
            dataKey="age" 
            stroke="#1a1a1a" 
            strokeOpacity={0.2} 
            tick={{ fontFamily: 'monospace', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            hide={true} 
            domain={[0, 100]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d4af37', strokeWidth: 1, strokeDasharray: '5 5' }} />
          <ReferenceLine y={50} stroke="#1a1a1a" strokeOpacity={0.1} strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#d4af37" 
            strokeWidth={2}
            fill="url(#colorScore)" 
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LifePathChart;
