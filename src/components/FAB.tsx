'use client';

import Link from 'next/link';
import { Plus, X, ClipboardPaste, Wallet } from 'lucide-react';
import { useState } from 'react';
import BankEventModal from './BankEventModal';

export default function FAB() {
  const [open, setOpen] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);

  const toggle = () => setOpen(prev => !prev);

  return (
    <>
      {/* Overlay para cerrar el mini menú */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <div className="fixed bottom-20 right-4 md:bottom-8 md:right-8 flex flex-col items-end gap-3 z-50">
        {/* Mini menú */}
        {open && (
          <div className="flex flex-col items-end gap-2">
            {/* Opción: Evento de bankroll */}
            <button
              onClick={() => { setOpen(false); setShowBankModal(true); }}
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl px-4 py-3 shadow-xl hover:bg-slate-700 transition-all text-sm font-semibold animate-in slide-in-from-bottom-2"
            >
              <Wallet className="w-4 h-4 text-orange-400" />
              Evento de Bankroll
            </button>

            {/* Opción: Nueva apuesta */}
            <Link
              href="/new"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl px-4 py-3 shadow-xl hover:bg-slate-700 transition-all text-sm font-semibold animate-in slide-in-from-bottom-2"
            >
              <ClipboardPaste className="w-4 h-4 text-orange-400" />
              Importar Apuestas
            </Link>
          </div>
        )}

        {/* Botón principal */}
        <button
          onClick={toggle}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-white transition-all ${
            open
              ? 'bg-slate-700 rotate-45 shadow-none'
              : 'bg-orange-500 shadow-orange-500/30 hover:bg-orange-600'
          }`}
          aria-label="Acciones"
        >
          {open ? <X className="w-7 h-7" /> : <Plus className="w-8 h-8" />}
        </button>
      </div>

      {/* Modal de eventos de bankroll */}
      {showBankModal && <BankEventModal onClose={() => setShowBankModal(false)} />}
    </>
  );
}
