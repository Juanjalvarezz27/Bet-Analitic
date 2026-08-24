import { getDashboardData } from '@/lib/actions/bet-actions';
import { getBankrollState } from '@/lib/actions/bank-actions';
import BetCard from '@/components/BetCard';
import FAB from '@/components/FAB';
import { Wallet, Skull, TrendingUp, TrendingDown, CalendarDays, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [{ recentBets, globalProfit, todayProfit }, { isBankrupt, totalDeposited, totalWithdrawn }] = await Promise.all([
    getDashboardData(),
    getBankrollState(),
  ]);

  // Saldo disponible en el casino = capital activo + ganancias de apuestas
  const netCapital = totalDeposited - totalWithdrawn;
  const casinoBankroll = netCapital + globalProfit;

  return (
    <main className="flex-1 flex flex-col p-4 w-full h-full pb-20">
      <header className="py-6 flex flex-col items-center justify-center gap-6">

        {/* Saldo disponible en casino — número principal */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">
            Saldo en Casino
          </span>
          <div className="flex items-center gap-3 w-full justify-center">
            <div className="p-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl shadow-black/20 shrink-0">
              <Wallet className="w-8 h-8 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
            </div>
            <div className={cn(
              "text-3xl sm:text-4xl font-black tracking-tight break-all",
              casinoBankroll > 0 ? "text-slate-100" : casinoBankroll < 0 ? "text-red-400" : "text-slate-400"
            )}>
              <span className="text-xl sm:text-2xl mr-1 opacity-80">Bs</span>
              {casinoBankroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Tarjetas: Profit hoy y Profit total */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {/* Profit de Hoy */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-2 shadow-lg overflow-hidden">
            <div className="flex items-center gap-1.5 text-slate-400">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] uppercase tracking-widest font-medium">Hoy</span>
            </div>
            <div className="flex items-center gap-1.5">
              {todayProfit >= 0
                ? <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                : <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
              }
              <span className={cn(
                "text-lg sm:text-xl font-black break-all leading-tight",
                todayProfit > 0 ? "text-emerald-400" : todayProfit < 0 ? "text-red-400" : "text-slate-400"
              )}>
                {todayProfit >= 0 ? '+' : ''}Bs {todayProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Profit Global */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-2 shadow-lg overflow-hidden">
            <div className="flex items-center gap-1.5 text-slate-400">
              <BarChart2 className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[10px] uppercase tracking-widest font-medium">Total</span>
            </div>
            <div className="flex items-center gap-1.5">
              {globalProfit >= 0
                ? <TrendingUp className="w-4 h-4 text-blue-400 shrink-0" />
                : <TrendingDown className="w-4 h-4 text-red-400 shrink-0" />
              }
              <span className={cn(
                "text-lg sm:text-xl font-black break-all leading-tight",
                globalProfit > 0 ? "text-blue-400" : globalProfit < 0 ? "text-red-400" : "text-slate-400"
              )}>
                {globalProfit >= 0 ? '+' : ''}Bs {globalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Banner de quiebra */}
      {isBankrupt && (
        <div className="mb-4 flex items-center gap-4 bg-red-950/60 border border-red-700/50 rounded-2xl p-4">
          <div className="p-2 bg-red-900/50 rounded-xl">
            <Skull className="w-7 h-7 text-red-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-300 text-sm">Quiebra registrada</p>
            <p className="text-xs text-red-400/70 mt-0.5">El bankroll llegó a 0. Registra un depósito para continuar.</p>
          </div>
        </div>
      )}

      <section className="mt-4 flex-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-200">Apuestas de Hoy</h2>
          <span className="text-xs text-slate-500 font-medium">{recentBets.length} registradas</span>
        </div>

        {recentBets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {recentBets.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700 mt-6">
            <p className="text-slate-400 text-sm">No hay apuestas de hoy.</p>
            <p className="text-slate-500 text-xs mt-1">Usa el botón naranja para empezar.</p>
          </div>
        )}
      </section>

      <FAB />
    </main>
  );
}
