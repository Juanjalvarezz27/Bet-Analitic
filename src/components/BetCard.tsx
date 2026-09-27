'use client';

import { Bet } from '@prisma/client';
import { updateBetStatus, deleteBet } from '@/lib/actions/bet-actions';
import { cn, formatCaracasTime } from '@/lib/utils';
import { Check, X, CircleSlash, Trophy, Activity, Sword, Flame, Target, TrendingUp, TrendingDown, Clock, Hash, Trash2, AlertTriangle } from 'lucide-react';
import { useTransition, useState } from 'react';

const getSportIcon = (sport: string) => {
  switch (sport.toLowerCase()) {
    case 'fútbol': return <Target className="w-4 h-4" />;
    case 'baloncesto': return <Activity className="w-4 h-4" />;
    case 'mma': return <Sword className="w-4 h-4" />;
    case 'esports': return <Flame className="w-4 h-4" />;
    default: return <Trophy className="w-4 h-4" />;
  }
};

export default function BetCard({ bet }: { bet: Bet }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleStatusUpdate = (status: 'WON' | 'LOST' | 'VOID') => {
    startTransition(() => {
      updateBetStatus(bet.id, status);
    });
  };

  const handleDelete = () => {
    startTransition(() => {
      deleteBet(bet.id);
    });
  };

  const statusConfig = {
    PENDING: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    WON: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    LOST: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    VOID: { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
  }[bet.status];

  return (
    <div className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-4 flex flex-col gap-4 border border-slate-700/50 shadow-xl shadow-black/20 hover:border-slate-500/50 hover:bg-slate-800/60 transition-all duration-300 group relative overflow-hidden">

      {/* Panel de confirmación de eliminación */}
      {confirmDelete && (
        <div className="absolute inset-0 z-10 bg-slate-900/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-4 p-4 animate-in fade-in duration-150">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 bg-red-500/20 rounded-full border border-red-500/30">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm font-semibold text-slate-100">¿Eliminar apuesta?</p>
            <p className="text-xs text-slate-400 leading-relaxed">Esta acción no se puede deshacer.</p>
          </div>
          <div className="flex gap-3 w-full">
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={isPending}
              className="flex-1 h-9 rounded-xl bg-slate-700/60 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 h-9 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Cabecera: Deporte y Estado */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="p-1.5 bg-slate-700/50 rounded-lg group-hover:bg-slate-700 group-hover:text-orange-400 transition-colors">
            {getSportIcon(bet.sport)}
          </div>
          <span className="text-xs font-medium text-slate-400" suppressHydrationWarning>
            {formatCaracasTime(bet.date)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5", statusConfig.bg, statusConfig.color, statusConfig.border)}>
            {bet.status === 'PENDING' && <Clock className="w-3 h-3" />}
            {bet.status}
          </div>
          {/* Botón eliminar */}
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            className="w-7 h-7 rounded-lg bg-slate-700/30 text-slate-500 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
            title="Eliminar apuesta"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Título de la Apuesta */}
      <div>
        <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 group-hover:text-white transition-colors">{bet.event}</h3>
        {bet.market && (
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Hash className="w-3 h-3 text-slate-500" />
            {bet.market}
          </p>
        )}
      </div>

      {/* Datos Financieros */}
      <div className="flex justify-between items-end mt-auto pt-2 border-t border-slate-700/50">
        <div className="flex gap-5">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">Stake</span>
            <span className="text-sm font-bold text-slate-200">Bs {bet.stake.toFixed(2)}</span>
          </div>
          {bet.odds > 0 && (
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">Cuota</span>
              <span className="text-sm font-bold text-slate-200">{bet.odds.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        {bet.status !== 'PENDING' ? (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-0.5">Profit</span>
            <div className={cn(
              "flex items-center gap-1 text-base font-black", 
              (bet.profit || 0) > 0 ? "text-emerald-400" : (bet.profit || 0) < 0 ? "text-red-400" : "text-slate-400"
            )}>
              {(bet.profit || 0) > 0 ? <TrendingUp className="w-4 h-4" /> : (bet.profit || 0) < 0 ? <TrendingDown className="w-4 h-4" /> : null}
              {(bet.profit || 0) > 0 ? '+' : ''}{(bet.profit || 0).toFixed(2)}
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => handleStatusUpdate('WON')}
              disabled={isPending}
              className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              title="Marcar como Ganada"
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleStatusUpdate('LOST')}
              disabled={isPending}
              className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/30 transition-colors disabled:opacity-50"
              title="Marcar como Perdida"
            >
              <X className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleStatusUpdate('VOID')}
              disabled={isPending}
              className="w-8 h-8 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center hover:bg-slate-500/30 transition-colors disabled:opacity-50"
              title="Marcar como Nula"
            >
              <CircleSlash className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
