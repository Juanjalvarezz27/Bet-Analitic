'use client';

import { useState, useTransition } from 'react';
import { deleteBankEvent } from '@/lib/actions/bank-actions';
import { BankEvent } from '@prisma/client';
import { ArrowDownCircle, ArrowUpCircle, Skull, Trash2, Loader2, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  initialEvents: BankEvent[];
}

export default function BankEventList({ initialEvents }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar este evento?')) return;
    startTransition(async () => {
      await deleteBankEvent(id);
    });
  };

  const getConfig = (type: string) => {
    switch (type) {
      case 'DEPOSIT':    return { icon: ArrowDownCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Depósito', prefix: '+' };
      case 'WITHDRAWAL': return { icon: ArrowUpCircle,   color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20',  label: 'Retiro',   prefix: '-' };
      case 'BANKRUPT':   return { icon: Skull,           color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         label: 'Quiebra',  prefix: ''  };
      default:           return { icon: Wallet,          color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       label: 'Ajuste',   prefix: '=' };
    }
  };

  if (initialEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
        <Wallet className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-slate-400 text-sm font-medium">Sin movimientos</p>
        <p className="text-slate-500 text-xs mt-1">Usa el botón naranja para registrar uno.</p>
      </div>
    );
  }

  const [filter, setFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT'>('ALL');

  const filteredEvents = filter === 'ALL' 
    ? initialEvents 
    : initialEvents.filter(e => e.type === filter || (filter === 'ADJUSTMENT' && e.type === 'BANKRUPT'));

  // Agrupar eventos filtrados por día
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const dateKey = format(new Date(event.date), 'yyyy-MM-dd');
    const existing = acc.find(g => g.dateKey === dateKey);
    if (existing) {
      existing.events.push(event);
    } else {
      acc.push({ dateKey, events: [event] });
    }
    return acc;
  }, [] as { dateKey: string, events: typeof initialEvents[0][] }[]);

  const formatMoney = (val: number) => {
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all",
              filter === f
                ? "bg-slate-700 text-slate-200 shadow-md"
                : "bg-slate-800/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
            )}
          >
            {f === 'ALL' ? 'Todos' : f === 'DEPOSIT' ? 'Depósitos' : f === 'WITHDRAWAL' ? 'Retiros' : 'Ajustes'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {groupedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
            <p className="text-slate-400 text-sm font-medium">No hay registros de este tipo</p>
          </div>
        ) : (
          groupedEvents.map((group) => (
            <div key={group.dateKey} className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2 border-l-2 border-slate-700">
                {format(new Date(`${group.dateKey}T12:00:00`), "EEEE, d 'de' MMMM", { locale: es })}
              </h3>
              <div className="flex flex-col gap-2">
                {group.events.map((event) => {
                  const cfg = getConfig(event.type);
                  return (
                    <div
                      key={event.id}
                      className="bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/40 overflow-hidden hover:border-slate-600/60 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 p-4">
                        {/* Icono */}
                        <div className={cn("p-2.5 rounded-xl border shrink-0", cfg.bg)}>
                          <cfg.icon className={cn("w-5 h-5", cfg.color)} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-100">{cfg.label}</p>
                          <p suppressHydrationWarning className="text-[11px] text-slate-500 mt-0.5">
                            Fecha y Hora: {format(new Date(event.date), "dd/MM/yyyy · HH:mm", { locale: es })}
                          </p>
                          {event.note && (
                            <p className="text-xs text-slate-400 mt-1 italic truncate">"{event.note}"</p>
                          )}
                        </div>

                        {/* Monto */}
                        {event.type !== 'BANKRUPT' && (
                          <span className={cn("text-base font-black shrink-0", cfg.color)}>
                            {cfg.prefix}Bs {formatMoney(event.amount)}
                          </span>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(event.id)}
                          disabled={isPending}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0"
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

