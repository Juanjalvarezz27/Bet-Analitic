'use client';
import React from 'react';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Target, TrendingUp, DollarSign, Activity, Calendar, ChevronDown, Loader2, Search, X, ChevronRight, Trophy, TrendingDown, AlertTriangle } from 'lucide-react';
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

const formatMoney = (val: number) => {
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBetId, setExpandedBetId] = useState<string | null>(null);

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

  // Filtrar por búsqueda antes de agrupar
  const filteredBets = searchQuery.trim()
    ? historyBets.filter(b =>
        b.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.market || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : historyBets;

  const groupedBets = filteredBets.reduce((acc, bet) => {
    const d = new Date(bet.date).toISOString().split('T')[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(bet);
    return acc;
  }, {} as Record<string, Bet[]>);

  // Resumen del período: mejor y peor día
  const bestDay = initialStats.dailyProfit.length > 0
    ? initialStats.dailyProfit.reduce((best, d) => d.profit > best.profit ? d : best)
    : null;
  const worstDay = initialStats.dailyProfit.length > 0
    ? initialStats.dailyProfit.reduce((worst, d) => d.profit < worst.profit ? d : worst)
    : null;

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
            {initialStats.totalProfit >= 0 ? '+' : ''}Bs {formatMoney(initialStats.totalProfit)}
          </span>
        </div>
      </div>

      {/* KPIs Adicionales */}
      <div className="bg-slate-700/50 rounded-3xl overflow-hidden mt-2 border border-slate-700/50 shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-slate-700/50">
          <div className="bg-slate-800/90 p-5 flex flex-col gap-1 hover:bg-slate-800 transition-colors">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cuota Promedio</span>
            <span className="text-xl font-black text-slate-200">{initialStats.avgOdds.toFixed(2)}</span>
          </div>
          <div className="bg-slate-800/90 p-5 flex flex-col gap-1 hover:bg-slate-800 transition-colors">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Stake Promedio</span>
            <span className="text-xl font-black text-slate-200">Bs {formatMoney(initialStats.avgStake)}</span>
          </div>
          <div className="bg-slate-800/90 p-5 flex flex-col gap-1 hover:bg-slate-800 transition-colors">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Mejor Día
            </span>
            {bestDay ? (
              <>
                <span className="text-xl font-black text-emerald-400">+Bs {formatMoney(bestDay.profit)}</span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5">{formatDate(bestDay.date)}</span>
              </>
            ) : (
               <span className="text-xl font-black text-slate-500">-</span>
            )}
          </div>
          <div className="bg-slate-800/90 p-5 flex flex-col gap-1 hover:bg-slate-800 transition-colors">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Peor Día
            </span>
            {worstDay && worstDay.profit < 0 ? (
              <>
                <span className="text-xl font-black text-red-400">Bs {formatMoney(worstDay.profit)}</span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5">{formatDate(worstDay.date)}</span>
              </>
            ) : (
               <span className="text-xl font-black text-slate-500">-</span>
            )}
          </div>
          <div className="bg-slate-800/90 p-5 flex flex-col gap-1 hover:bg-slate-800 transition-colors">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Mejor Ganancia</span>
            <span className="text-xl font-black text-emerald-400">+Bs {formatMoney(initialStats.highestWin)}</span>
          </div>
          <div className="bg-slate-800/90 p-5 flex flex-col gap-1 hover:bg-slate-800 transition-colors">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Peor Pérdida</span>
            <span className="text-xl font-black text-red-400">Bs {formatMoney(initialStats.worstLoss)}</span>
          </div>
        </div>
      </div>

      {/* Gráfico de Ganancia por Día (Barras) */}
      <div className="bg-slate-800/50 p-5 rounded-3xl border border-slate-700/50 flex flex-col gap-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          Ganancia Diaria
        </h2>

        {initialStats.dailyProfit.length > 0 ? (() => {
          const DAY_THRESHOLD = 20;  // hasta aquí caben en pantalla sin scroll
          const needsScroll = initialStats.dailyProfit.length > DAY_THRESHOLD;
          // px por barra solo cuando hace scroll; si no, Recharts reparte el espacio solo
          const scrollWidth = initialStats.dailyProfit.length * 56;
          // formateo corto para el eje Y
          const fmtY = (val: number) => {
            if (Math.abs(val) >= 1000) return `Bs ${(val / 1000).toFixed(1)}k`;
            return `Bs ${val}`;
          };
          const interval = needsScroll ? Math.floor(initialStats.dailyProfit.length / 12) : 0;

          return (
            <div className={`h-64 w-full ${needsScroll ? 'overflow-x-auto scrollbar-hide' : ''}`}>
              <ResponsiveContainer
                width={needsScroll ? scrollWidth : '100%'}
                height="100%"
              >
                <BarChart
                  data={initialStats.dailyProfit}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                  barCategoryGap="28%"
                >
                  <defs>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="gradRed" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#475569"
                    fontSize={10}
                    tickFormatter={formatDate}
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                    interval={interval}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={10}
                    tickFormatter={fmtY}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tickCount={5}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#0f172a' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', padding: '10px 14px' }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '11px' }}
                    labelFormatter={(label) => formatDate(label as string)}
                    formatter={(value) => [`Bs ${formatMoney(value as number)}`, 'Ganancia del día']}
                  />
                  <Bar dataKey="profit" radius={[6, 6, 2, 2]} maxBarSize={48} minPointSize={3}>
                    {initialStats.dailyProfit.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.profit >= 0 ? 'url(#gradGreen)' : 'url(#gradRed)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })() : (
          <div className="h-64 flex items-center justify-center">
            <span className="text-slate-500 text-sm">No hay datos en este período</span>
          </div>
        )}
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
                  tickFormatter={(val) => `Bs ${formatMoney(val)}`}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  labelFormatter={(label) => formatDate(label as string)}
                  formatter={(value) => [`Bs ${formatMoney(value as number)}`, 'Profit Acumulado']}
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

            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por evento o mercado..."
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
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
              {searchQuery && (
                <span className="ml-auto text-[11px] text-slate-500 self-center">
                  {filteredBets.length} resultado{filteredBets.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Lista Agrupada por Día */}
            <div className="flex flex-col gap-6">
              {Object.entries(groupedBets).map(([dateStr, bets]) => (
                <div key={dateStr} className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-700">
                    {formatDate(dateStr)}
                  </h3>
                  <div className="flex flex-col gap-2">
                    {bets.map((bet) => {
                      const isExpanded = expandedBetId === bet.id;
                      const betTime = new Date(bet.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={bet.id} className="bg-slate-800/80 rounded-xl border border-slate-700/50 overflow-hidden transition-all">
                          {/* Fila principal — clickeable */}
                          <button
                            onClick={() => setExpandedBetId(isExpanded ? null : bet.id)}
                            className="w-full p-3 flex justify-between items-center gap-2 hover:bg-slate-700/30 transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-300 truncate">{bet.event}</p>
                              <p className="text-[11px] text-slate-500">{bet.market} • {bet.sport}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={cn(
                                "text-xs font-bold px-2 py-0.5 rounded-md",
                                bet.status === 'WON' ? 'bg-emerald-500/20 text-emerald-400' : bet.status === 'LOST' ? 'bg-red-500/20 text-red-400' : 'bg-slate-700 text-slate-300'
                              )}>
                                {bet.status === 'WON' ? `+Bs ${formatMoney(bet.profit || 0)}` : bet.status === 'LOST' ? `Bs ${formatMoney(bet.profit || 0)}` : 'Bs 0.00'}
                              </span>
                              <ChevronRight className={cn(
                                "w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0",
                                isExpanded && "rotate-90"
                              )} />
                            </div>
                          </button>

                          {/* Panel expandido con detalle */}
                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-slate-700/50 pt-3 grid grid-cols-3 gap-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Stake</span>
                                <span className="text-sm font-bold text-slate-200">Bs {formatMoney(bet.stake)}</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Cuota</span>
                                <span className="text-sm font-bold text-slate-200">{bet.odds.toFixed(2)}</span>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Hora</span>
                                <span className="text-sm font-bold text-slate-200">{betTime}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
