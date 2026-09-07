import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { RiskAssessment, RainfallObservation, ForecastHour } from '../../types';

const COLORS = { LOW: '#22c55e', MODERATE: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };

const tooltipStyle = {
  backgroundColor: '#1e293b', border: '1px solid #334155',
  borderRadius: '8px', fontSize: '12px', color: '#e2e8f0'
};

// ---- Risk History Chart ----
export function RiskHistoryChart({ data }: { data: RiskAssessment[] }) {
  const chartData = [...data].reverse().map(r => ({
    time: format(parseISO(r.timestamp), 'dd MMM HH:mm'),
    score: r.finalScore,
    hazard: r.hazardScore,
    impact: r.impactScore,
    level: r.riskLevel,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'CRITICAL', fill: '#ef4444', fontSize: 10 }} />
        <ReferenceLine y={65} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'HIGH', fill: '#f97316', fontSize: 10 }} />
        <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'MODERATE', fill: '#f59e0b', fontSize: 10 }} />
        <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="url(#scoreGrad)" name="Risk Score" />
        <Line type="monotone" dataKey="hazard" stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 2" dot={false} name="Hazard" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---- Rainfall Chart (observed + forecast) ----
export function RainfallChart({
  observations,
  forecast,
}: {
  observations: RainfallObservation[];
  forecast?: { hourly: ForecastHour[] };
}) {
  const obsData = [...observations].reverse().slice(-24).map(o => ({
    time: format(parseISO(o.timestamp), 'HH:mm'),
    precipitation: o.current_mmph,
    type: 'observed',
  }));

  const fcData = (forecast?.hourly || []).slice(0, 24).map((h, i) => ({
    time: `+${h.hour}h`,
    precipitation: h.precipitation_mm,
    type: 'forecast',
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={[...obsData, ...fcData]} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} unit="mm" />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="precipitation" name="Rainfall (mm/h)" radius={[2,2,0,0]}
          fill="#3b82f6"
          label={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Risk Distribution Pie ----
export function RiskDistributionChart({ data }: { data: { LOW: number; MODERATE: number; HIGH: number; CRITICAL: number } }) {
  const pieData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
          {pieData.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
          ))}
        </Pie>
        <Legend formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---- Risk Score Bar Chart by District ----
export function RiskByDistrictChart({ data }: { data: Array<{ district: string; avgScore: number; maxLevel: string }> }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
        <YAxis dataKey="district" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} width={80} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="avgScore" name="Avg Risk Score" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell key={entry.district} fill={COLORS[entry.maxLevel as keyof typeof COLORS] || '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Cumulative Rainfall ----
export function CumulativeRainfallChart({ observations }: { observations: RainfallObservation[] }) {
  const chartData = [...observations].reverse().map(o => ({
    time: format(parseISO(o.timestamp), 'dd MMM HH:mm'),
    '24h': o.cumulative_24h_mm,
    '72h': o.cumulative_72h_mm,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} unit="mm" />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="24h" stroke="#3b82f6" strokeWidth={2} dot={false} name="24h Cumulative" />
        <Line type="monotone" dataKey="72h" stroke="#8b5cf6" strokeWidth={2} dot={false} name="72h Cumulative" />
        <ReferenceLine y={100} stroke="#f97316" strokeDasharray="3 3" label={{ value: '100mm threshold', fill: '#f97316', fontSize: 10 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
