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
  const displayProfit = globalProfit;
  const displayBankroll = netCapital + displayProfit;

  const stats = [
    { label: 'Depósitos', value: totalDeposited, icon: ArrowDownCircle, color: 'text-emerald-400', prefix: '+' },
    { label: 'Retiros', value: totalWithdrawn, icon: ArrowUpCircle, color: 'text-orange-400', prefix: '-' },
    { label: 'Capital Activo', value: netCapital, icon: Wallet, color: 'text-blue-400', prefix: '' },
    { label: 'Profit Apuestas', value: displayProfit, icon: displayProfit >= 0 ? TrendingUp : TrendingDown, color: displayProfit >= 0 ? 'text-emerald-400' : 'text-red-400', prefix: displayProfit >= 0 ? '+' : '' },
  ];

  return (
    <main className="flex-1 flex flex-col w-full h-full pb-20">

      {/* Hero header con gradiente */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800/80 to-transparent px-4 pt-8 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.08)_0%,_transparent_70%)]" />
        <div className="relative flex flex-col items-center gap-2">
          <span className="text-slate-400 text-xs font-medium uppercase tracking-[0.2em]">Saldo Disponible</span>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl shrink-0">
              <Wallet className="w-6 h-6 text-orange-400" />
            </div>
            <div className={cn(
              "text-3xl sm:text-4xl font-black tracking-tight break-all",
              displayBankroll > 0 ? "text-white" : displayBankroll < 0 ? "text-red-400" : "text-slate-400"
            )}>
              <span className="text-xl sm:text-2xl mr-1 opacity-80">Bs</span>
              {displayBankroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Cards de stats en scroll horizontal en mobile */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{stat.label}</span>
              </div>
              <span className={cn("text-base sm:text-lg font-black leading-none break-all", stat.color)}>
                {stat.prefix}Bs {stat.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Historial */}
      <section className="mt-6 flex-1 px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-200">Historial de Movimientos</h2>
          <span className="text-xs text-slate-500 bg-slate-800/60 px-2 py-1 rounded-full">{events.length} registros</span>
        </div>
        <BankEventList initialEvents={events} />
      </section>

      <FAB />
    </main>
  );
}
