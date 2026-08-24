import { getBankEvents, getBankrollState } from '@/lib/actions/bank-actions';
import { getDashboardData } from '@/lib/actions/bet-actions';
import BankEventList from './BankEventList';
import FAB from '@/components/FAB';
import { Wallet, ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function BankPage() {
  const [events, bankState, { globalProfit }] = await Promise.all([
    getBankEvents(),
    getBankrollState(),
    getDashboardData()
  ]);

  const { totalDeposited, totalWithdrawn } = bankState;
  const netCapital = totalDeposited - totalWithdrawn;
  
  // El Profit de apuestas es simplemente la suma de las ganancias/pérdidas de todas las apuestas
  const displayProfit = globalProfit;

  // El Saldo Disponible (Bankroll) es tu capital activo (depósitos - retiros) más tus ganancias de apuestas
  const displayBankroll = netCapital + displayProfit;

  return (
    <main className="flex-1 flex flex-col p-4 w-full h-full pb-20 max-w-7xl mx-auto">
      <header className="py-6 flex flex-col items-center justify-center">
        <h1 className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">
          Saldo Disponible (Bankroll)
        </h1>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-800 rounded-2xl shadow-inner border border-slate-700/50">
            <Wallet className="w-8 h-8 text-orange-500" />
          </div>
          <span className="text-4xl font-black tracking-tight text-slate-100">
            Bs {displayBankroll.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 w-full max-w-2xl bg-slate-800/40 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl shadow-black/30">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-slate-400">
              <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-widest text-center">Depósitos<br/>(Tu Capital)</span>
            </div>
            <span className="font-bold text-emerald-400">Bs {totalDeposited.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-slate-400">
              <ArrowUpCircle className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] uppercase tracking-widest text-center">Retiros<br/>(A tu banco)</span>
            </div>
            <span className="font-bold text-orange-400">Bs {totalWithdrawn.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-slate-400">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] uppercase tracking-widest text-center">Capital<br/>Activo</span>
            </div>
            <span className="font-bold text-blue-400">Bs {netCapital.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-slate-400">
              {displayProfit >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
              <span className="text-[10px] uppercase tracking-widest text-center">Profit<br/>Apuestas</span>
            </div>
            <span className={cn("font-bold", displayProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
              {displayProfit >= 0 ? '+' : ''}Bs {displayProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </header>

      <section className="mt-4 flex-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-200">Historial de Eventos</h2>
          <span className="text-xs text-slate-500 font-medium">{events.length} registrados</span>
        </div>

        <BankEventList initialEvents={events} />
      </section>

      <FAB />
    </main>
  );
}
