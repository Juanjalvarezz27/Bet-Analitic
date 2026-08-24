'use client';

import { useState, useTransition } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, Skull, Loader2 } from 'lucide-react';
import { createBankEvent } from '@/lib/actions/bank-actions';
import { cn } from '@/lib/utils';

type EventType = 'DEPOSIT' | 'WITHDRAWAL' | 'BANKRUPT';

interface Props {
  onClose: () => void;
}

const OPTIONS = [
  {
    type: 'DEPOSIT' as EventType,
    label: 'Depósito',
    desc: 'Recarga inicial',
    icon: ArrowDownCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    activeBorder: 'border-emerald-500',
  },
  {
    type: 'WITHDRAWAL' as EventType,
    label: 'Retiro',
    desc: 'A tu banco',
    icon: ArrowUpCircle,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    activeBorder: 'border-orange-500',
  },
  {
    type: 'BANKRUPT' as EventType,
    label: 'Quiebra',
    desc: 'Llegó a 0',
    icon: Skull,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    activeBorder: 'border-red-500',
  },
];

export default function BankEventModal({ onClose }: Props) {
  const [selected, setSelected] = useState<EventType>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const selectedOption = OPTIONS.find(o => o.type === selected)!;
  const needsAmount = selected !== 'BANKRUPT';

  const handleSubmit = () => {
    const parsedAmount = needsAmount ? parseFloat(amount) : 0;
    if (needsAmount && (!parsedAmount || parsedAmount <= 0)) return;

    startTransition(async () => {
      await createBankEvent(selected, parsedAmount, note || undefined);
      setDone(true);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100">Evento de Bankroll</h2>
            <p className="text-xs text-slate-500 mt-0.5">Registra un movimiento de capital</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className={cn("p-4 rounded-full", selectedOption.bg)}>
              <selectedOption.icon className={cn("w-10 h-10", selectedOption.color)} />
            </div>
            <p className="text-slate-200 font-semibold text-center">
              {selected === 'BANKRUPT'
                ? 'Quiebra registrada. El dashboard mostrará el aviso.'
                : `${selectedOption.label} de Bs ${parseFloat(amount).toFixed(2)} registrado.`}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm hover:bg-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            {/* Selector de tipo */}
            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => setSelected(opt.type)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center",
                    opt.bg, opt.border,
                    selected === opt.type
                      ? `${opt.activeBorder} shadow-lg`
                      : "opacity-50 hover:opacity-80"
                  )}
                >
                  <opt.icon className={cn("w-6 h-6", opt.color)} />
                  <span className={cn("text-xs font-bold", opt.color)}>{opt.label}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>

            {/* Monto (solo si no es quiebra) */}
            {needsAmount && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Monto
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Bs</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl pl-7 pr-4 py-3 focus:outline-none focus:border-orange-500 text-sm font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Nota opcional */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Nota (opcional)
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={selected === 'BANKRUPT' ? 'Qué pasó...' : 'Ej: Inicio de mes, cobro de nómina...'}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>

            {/* Confirmar */}
            <button
              onClick={handleSubmit}
              disabled={isPending || (needsAmount && (!amount || parseFloat(amount) <= 0))}
              className={cn(
                "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                selected === 'BANKRUPT'
                  ? "bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-700 disabled:text-slate-500"
                  : "bg-orange-500 hover:bg-orange-600 text-white disabled:bg-slate-700 disabled:text-slate-500"
              )}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <selectedOption.icon className="w-4 h-4" />
                  Confirmar {selectedOption.label}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
