'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Target, TrendingUp, DollarSign, Activity, Calendar, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { getPaginatedBets } from '@/lib/actions/bet-actions';
import type { Bet } from '@prisma/client';

interface StatsData {
  winRate: number;
  roi: number;
  totalProfit: number;
  totalBets: number;
  sportStats: Record<string, { profit: number; count: number }>;
  dailyProfit: { date: string; profit: number; cumulative: number }[];
  avgStake: number;
  avgOdds: number;
  highestWin: number;
  worstLoss: number;
}

const PERIODS = [
  { value: 'all', label: 'Histórico' },
  { value: 'year', label: 'Este Año' },
  { value: 'month', label: 'Este Mes' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'today', label: 'Hoy' },
];

export default function StatsDashboard({ initialStats, initialPeriod }: { initialStats: StatsData, initialPeriod: string }) {
  const router = useRouter();
  
  // Usamos estado local temporalmente para feedback instantáneo UI
  const [period, setPeriod] = useState(initialPeriod);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    router.push(`/stats?period=${newPeriod}`);
  };

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyBets, setHistoryBets] = useState<Bet[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('ALL');

  const loadHistory = async (page: number, currentFilter: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await getPaginatedBets(page, period, currentFilter);
      if (page === 1) {
        setHistoryBets(res.bets);
      } else {
        setHistoryBets(prev => [...prev, ...res.bets]);
      }
      setHasMoreHistory(res.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isHistoryOpen) {
      setHistoryPage(1);
      loadHistory(1, historyFilter);
    }
  }, [isHistoryOpen, period, historyFilter]);

  const handleLoadMore = () => {
    const nextPage = historyPage + 1;
    setHistoryPage(nextPage);
    loadHistory(nextPage, historyFilter);
  };

  const groupedBets = historyBets.reduce((acc, bet) => {
    const d = new Date(bet.date).toISOString().split('T')[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(bet);
    return acc;
  }, {} as Record<string, Bet[]>);

  const sportsData = Object.entries(initialStats.sportStats)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.profit - a.profit);

  // Formateador de fecha para los tooltips
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-ES', { month: 'short', day: 'numeric' }).format(d);
  };

  return (
    <div className="flex flex-col gap-6 h-full pb-20">
      
      {/* Filtros de Tiempo */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Calendar className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => handlePeriodChange(p.value)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
              period === p.value
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Tarjetas Principales (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-slate-800/80 backdrop-blur-sm p-5 rounded-3xl border border-slate-700/50 flex flex-col gap-3 relative overflow-hidden group hover:border-slate-600 transition-colors">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          <div className="flex items-center gap-2 text-blue-400">
            <Target className="w-5 h-5" />
            <span className="text-xs font-bold tracking-widest uppercase">Win Rate</span>
          </div>
          <span className="text-3xl font-black text-slate-100">{initialStats.winRate.toFixed(1)}%</span>
        </div>
        
        <div className="bg-slate-800/80 backdrop-blur-sm p-5 rounded-3xl border border-slate-700/50 flex flex-col gap-3 relative overflow-hidden group hover:border-slate-600 transition-colors">
          <div className={cn("absolute -right-4 -top-4 w-16 h-16 rounded-full blur-xl transition-all", 
            initialStats.roi > 0 ? "bg-emerald-500/10 group-hover:bg-emerald-500/20" : "bg-red-500/10 group-hover:bg-red-500/20"
          )}></div>
          <div className={cn("flex items-center gap-2", initialStats.roi >= 0 ? "text-emerald-400" : "text-red-400")}>
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-bold tracking-widest uppercase">ROI</span>
          </div>
          <span className={cn(
            "text-3xl font-black",
            initialStats.roi >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {initialStats.roi > 0 ? '+' : ''}{initialStats.roi.toFixed(1)}%
          </span>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-sm p-5 rounded-3xl border border-slate-700/50 flex flex-col justify-between relative overflow-hidden group hover:border-slate-600 transition-colors col-span-2">
          <div className={cn("absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-3xl transition-all", 
            initialStats.totalProfit > 0 ? "bg-emerald-500/10 group-hover:bg-emerald-500/20" : "bg-red-500/10 group-hover:bg-red-500/20"
          )}></div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className={cn("flex items-center gap-2", initialStats.totalProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
              <DollarSign className="w-5 h-5" />
              <span className="text-xs font-bold tracking-widest uppercase">Profit Total</span>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-700/50">
              {initialStats.totalBets} apuestas
            </span>
          </div>
          
          <span className={cn(
            "text-4xl font-black relative z-10",
            initialStats.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {initialStats.totalProfit >= 0 ? '+' : ''}Bs {initialStats.totalProfit.toFixed(2)}
          </span>
        </div>
      </div>

      {/* KPIs Adicionales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-2">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium">Cuota Promedio</span>
          <span className="text-lg font-bold text-slate-200">{initialStats.avgOdds.toFixed(2)}</span>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium">Stake Promedio</span>
          <span className="text-lg font-bold text-slate-200">Bs {initialStats.avgStake.toFixed(2)}</span>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium">Mejor Ganancia</span>
          <span className="text-lg font-bold text-emerald-400">+Bs {initialStats.highestWin.toFixed(2)}</span>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex flex-col gap-1">
          <span className="text-xs text-slate-400 font-medium">Peor Pérdida</span>
          <span className="text-lg font-bold text-red-400">Bs {initialStats.worstLoss.toFixed(2)}</span>
        </div>
      </div>

      {/* Gráfico de Ganancia por Día (Barras) */}
      <div className="bg-slate-800/50 p-5 rounded-3xl border border-slate-700/50 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          Ganancia Diaria
        </h2>
        
        <div className="h-56 w-full">
          {initialStats.dailyProfit.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={initialStats.dailyProfit} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={formatDate}
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10}
                  tickFormatter={(val) => `Bs ${val}`}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value) => [`Bs ${(value as number).toFixed(2)}`, 'Ganancia']}
                />
                <Bar dataKey="profit" radius={[4, 4, 4, 4]}>
                  {initialStats.dailyProfit.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex h-full items-center justify-center">
               <span className="text-slate-500 text-sm">No hay datos en este período</span>
             </div>
          )}
        </div>
      </div>

      {/* Gráfico de Evolución de Profit (Acumulado) */}
      <div className="bg-slate-800/50 p-5 rounded-3xl border border-slate-700/50 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-400" />
          Evolución de Profit
        </h2>
        
        <div className="h-64 w-full">
          {initialStats.dailyProfit.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={initialStats.dailyProfit} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickFormatter={formatDate}
                  tickMargin={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10}
                  tickFormatter={(val) => `Bs ${val}`}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value) => [`Bs ${(value as number).toFixed(2)}`, 'Profit Acumulado']}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke={initialStats.totalProfit >= 0 ? "#10b981" : "#ef4444"} 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill={initialStats.totalProfit >= 0 ? "url(#colorProfit)" : "url(#colorLoss)"} 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex h-full items-center justify-center">
               <span className="text-slate-500 text-sm">No hay datos en este período</span>
             </div>
          )}
        </div>
      </div>

      {/* Gráfico de Deportes */}
      <div className="bg-slate-800/50 p-5 rounded-3xl border border-slate-700/50 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-400" />
          Rendimiento por Deporte
        </h2>
        
        <div className="h-64 w-full">
          {sportsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sportsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="#64748b" 
                  fontSize={10}
                  tickFormatter={(val) => `Bs ${val}`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  fontSize={11}
                  fontWeight="bold"
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <RechartsTooltip 
                  cursor={{fill: '#1e293b'}}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value, _name, props) => [
                    `Bs ${(value as number).toFixed(2)} (${(props as any).payload.count} apuestas)`, 
                    'Ganancia'
                  ]}
                />
                <Bar dataKey="profit" radius={[0, 4, 4, 0]} barSize={24}>
                  {sportsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex h-full items-center justify-center">
               <span className="text-slate-500 text-sm">No hay datos en este período</span>
             </div>
          )}
        </div>
      </div>

      {/* Historial Desplegable */}
      <div className="bg-slate-800/30 rounded-3xl border border-slate-700/50 overflow-hidden">
        <button 
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-slate-200">Historial de Apuestas</h2>
              <p className="text-xs text-slate-500">Haz clic para ver las apuestas detalladas</p>
            </div>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform", isHistoryOpen && "rotate-180")} />
        </button>
        
        {isHistoryOpen && (
          <div className="p-5 border-t border-slate-700/50 flex flex-col gap-4">
            
            {/* Filtros */}
            <div className="flex gap-2 mb-2">
              {['ALL', 'WON', 'LOST'].map(f => (
                <button
                  key={f}
                  onClick={() => setHistoryFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                    historyFilter === f
                      ? "bg-slate-700 text-slate-200"
                      : "bg-slate-800/50 text-slate-500 hover:text-slate-300"
                  )}
                >
                  {f === 'ALL' ? 'Todas' : f === 'WON' ? 'Ganadas' : 'Perdidas'}
                </button>
              ))}
            </div>

            {/* Lista Agrupada por Día */}
            <div className="flex flex-col gap-6">
              {Object.entries(groupedBets).map(([dateStr, bets]) => (
                <div key={dateStr} className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-700">
                    {formatDate(dateStr)}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {bets.map((bet) => (
                      <div key={bet.id} className="bg-slate-800/80 rounded-xl p-3 flex justify-between items-center gap-2 border border-slate-700/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-300 truncate">{bet.event}</p>
                          <p className="text-[11px] text-slate-500">{bet.market} • {bet.sport}</p>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0">
                          <span className="text-[11px] text-slate-400">Cuota {bet.odds.toFixed(2)}</span>
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-md mt-1",
                            bet.status === 'WON' ? 'bg-emerald-500/20 text-emerald-400' : bet.status === 'LOST' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'
                          )}>
                            {bet.status === 'WON' ? `+Bs ${(bet.profit || 0).toFixed(2)}` : bet.status === 'LOST' ? `Bs ${(bet.profit || 0).toFixed(2)}` : 'Bs 0.00'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {isLoadingHistory && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                </div>
              )}

              {hasMoreHistory && !isLoadingHistory && (
                <button 
                  onClick={handleLoadMore}
                  className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-700 transition-colors"
                >
                  Cargar más apuestas
                </button>
              )}
              
              {!hasMoreHistory && historyBets.length > 0 && (
                <p className="text-center text-xs text-slate-500 mt-2">No hay más apuestas para mostrar</p>
              )}
              
              {!isLoadingHistory && historyBets.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-6">No se encontraron apuestas con estos filtros.</p>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
