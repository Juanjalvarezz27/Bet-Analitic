import { getDashboardData } from '@/lib/actions/bet-actions';
import { getBankrollState } from '@/lib/actions/bank-actions';
import BetCard from '@/components/BetCard';
import FAB from '@/components/FAB';
import { Wallet, Skull, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [{ recentBets, globalProfit }, { isBankrupt, totalDeposited }] = await Promise.all([
    getDashboardData(),
    getBankrollState(),
  ]);

  // El profit mostrado es simplemente la suma de las ganancias/pérdidas de las apuestas
  const displayProfit = globalProfit;

  return (
    <main className="flex-1 flex flex-col p-4 w-full h-full pb-20">
      <header className="py-6 flex flex-col items-center justify-center">
        <h1 className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">
          Profit Global
        </h1>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl shadow-black/20">
            <Wallet className="w-8 h-8 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
          </div>
          <span className={cn(
            "text-4xl font-black tracking-tight",
            displayProfit > 0 ? "text-emerald-400" : displayProfit < 0 ? "text-red-400" : "text-slate-100"
          )}>
            {displayProfit >= 0 ? '+' : ''}Bs {displayProfit.toFixed(2)}
          </span>
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
          <div className="text-red-400/60">
            <ArrowDownCircle className="w-5 h-5" />
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
