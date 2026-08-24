'use client';

import { useState, useTransition } from 'react';
import { deleteBankEvent } from '@/lib/actions/bank-actions';
import { BankEvent } from '@prisma/client';
import { ArrowDownCircle, ArrowUpCircle, Skull, Trash2, Loader2, Calendar, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  initialEvents: BankEvent[];
}

export default function BankEventList({ initialEvents }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar este evento? Esto afectará los cálculos de bankroll.')) return;
    
    startTransition(async () => {
      await deleteBankEvent(id);
    });
  };

  const getEventConfig = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return { icon: ArrowDownCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'WITHDRAWAL': return { icon: ArrowUpCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' };
      case 'BANKRUPT': return { icon: Skull, color: 'text-red-400', bg: 'bg-red-500/10' };
      case 'BALANCE_UPDATE': return { icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/10' };
      default: return { icon: ArrowDownCircle, color: 'text-slate-400', bg: 'bg-slate-500/10' };
    }
  };

  if (initialEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
        <p className="text-slate-400 text-sm">No hay eventos registrados.</p>
        <p className="text-slate-500 text-xs mt-1">Usa el botón naranja para depositar.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {initialEvents.map((event) => {
        const config = getEventConfig(event.type);
        
        return (
          <div key={event.id} className="bg-slate-800/40 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-slate-700/50 shadow-lg shadow-black/10 hover:border-slate-500/50 hover:bg-slate-800/60 transition-all duration-300 group">
            <div className="flex items-center gap-4">
              <div className={cn("p-2 rounded-xl", config.bg)}>
                <config.icon className={cn("w-6 h-6", config.color)} />
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-200">
                  {event.type === 'DEPOSIT' ? 'Depósito' : event.type === 'WITHDRAWAL' ? 'Retiro' : event.type === 'BALANCE_UPDATE' ? 'Saldo Actual (Ajuste)' : 'Quiebra'}
                </span>
                <span suppressHydrationWarning className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  {new Date(event.date).toLocaleDateString('es-ES')} {new Date(event.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {event.note && (
                  <span className="text-xs text-slate-400 mt-1 italic">"{event.note}"</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {event.type !== 'BANKRUPT' && (
                <span className={cn("font-black text-lg", config.color)}>
                  {event.type === 'DEPOSIT' ? '+' : event.type === 'WITHDRAWAL' ? '-' : '='}Bs {event.amount.toFixed(2)}
                </span>
              )}
              
              <button 
                onClick={() => handleDelete(event.id)}
                disabled={isPending}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                title="Eliminar evento"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
