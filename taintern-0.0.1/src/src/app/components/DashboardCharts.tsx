import React, { useMemo } from 'react';
import { Database, PieChart as PieChartIcon } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { useAppData } from '../lib/AppDataContext';
import { parseMoneyToNumber } from '../lib/data-utils';

const COLORS = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FFCD56', '#C9CBCF', '#4BC0C0', '#36A2EB'];
const BRUTAL_COLORS = ['#000000', '#FF6321', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

export function DashboardCharts() {
  const { appData } = useAppData();

  const chartData = useMemo(() => {
    const centers = appData.Final_Centers.data || [];
    const businessMap: Record<string, number> = {};
    const centerMap: Record<string, number> = {};

    centers.forEach((row: any) => {
      const business = row.Business || 'Unknown';
      const center = row["Mã AE"] || 'Unknown';
      const amount = parseMoneyToNumber(row['TOTAL PAYMENT'] || 0);

      businessMap[business] = (businessMap[business] || 0) + amount;
      centerMap[center] = (centerMap[center] || 0) + amount;
    });

    const businessData = Object.entries(businessMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const centerData = Object.entries(centerMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { businessData, centerData };
  }, [appData.Final_Centers.data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
      {/* Bar Chart: Top Centers by Payroll */}
      <div className="bg-white/65 backdrop-blur-2xl p-8 rounded-[2.5rem] border-2 border-slate-900/10 shadow-hard-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none">
          <Database className="w-24 h-24 text-slate-900" />
        </div>
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
              Top <span className="italic text-primary">Centers</span>
            </h3>
            <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Payroll Distribution by Mã AE</p>
          </div>
          <div className="px-3 py-1 bg-slate-900 rounded-lg border-2 border-slate-800 shadow-hard-sm">
            <span className="text-[0.625rem] uppercase tracking-widest font-black text-primary">VND (M)</span>
          </div>
        </div>

        <div className="h-[320px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.centerData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: '0.625rem', fontWeight: 800 }}
                dy={15}
                angle={-15}
                textAnchor="end"
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: '0.625rem', fontWeight: 800 }}
                tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 2 }}
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: '2px solid #000', 
                  boxShadow: '4px 4px 0px #000',
                  padding: '16px',
                  fontFamily: 'inherit'
                }}
                itemStyle={{ fontWeight: 800, fontSize: '0.75rem' }}
                labelStyle={{ fontWeight: 900, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: '#94a3b8' }}
                formatter={(value: number) => [formatCurrency(value), 'PAYROLL']}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={36}>
                {chartData.centerData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? '#000' : COLORS[index % COLORS.length]} 
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart: Business Distribution */}
      <div className="bg-white/65 backdrop-blur-2xl p-8 rounded-[2.5rem] border-2 border-slate-900/10 shadow-hard-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none">
          <PieChartIcon className="w-24 h-24 text-slate-900" />
        </div>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
              Business <span className="italic text-primary">Mix</span>
            </h3>
            <p className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Revenue Stream Allocation</p>
          </div>
          <div className="px-3 py-1 bg-primary rounded-lg border-2 border-slate-900 shadow-hard-sm">
            <span className="text-[0.625rem] uppercase tracking-widest font-black text-slate-900">Share %</span>
          </div>
        </div>

        <div className="h-[320px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.businessData}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={8}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.businessData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    className="hover:scale-105 transition-transform origin-center cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '20px', 
                  border: '2px solid #000', 
                  boxShadow: '4px 4px 0px #000',
                  padding: '16px'
                }}
                itemStyle={{ fontWeight: 800, fontSize: '0.75rem' }}
                labelStyle={{ fontWeight: 900, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px', color: '#94a3b8' }}
                formatter={(value: number) => [formatCurrency(value), 'PAYROLL']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={40} 
                iconType="rect" 
                iconSize={10}
                wrapperStyle={{ 
                  fontSize: '0.625rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em',
                  paddingTop: '30px' 
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
