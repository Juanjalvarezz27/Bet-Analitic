'use client';

import { useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, ChevronDown, ClipboardPaste } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ParsedBet } from '@/lib/parsers/altenar';
import { parsePastedText } from '@/lib/parsers/csv';

type ImportStatus = 'idle' | 'processing' | 'preview' | 'importing' | 'done' | 'error';

const SPORTS = [
  'Desconocido', 'Fútbol', 'Tenis', 'Baloncesto',
  'MMA', 'Béisbol', 'Fútbol Americano', 'eSports', 'Otro'
];

export default function NewBetPage() {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [parsedBets, setParsedBets] = useState<ParsedBet[]>([]);
  const [sport, setSport] = useState('Desconocido');
  const [result, setResult] = useState<{ imported: number; skipped: number; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [excludedBetIds, setExcludedBetIds] = useState<Set<string>>(new Set());

  const toggleExclude = (id: string) => {
    setExcludedBetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Procesa texto pegado desde el portapapeles
  const processPasteText = (text: string) => {
    if (!text.trim()) return;
    setStatus('processing');
    try {
      const bets = parsePastedText(text);
      const seen = new Set<string>();
      const unique = bets.filter(b => {
        if (!b.externalId || seen.has(b.externalId)) return false;
        seen.add(b.externalId);
        return true;
      });
      setParsedBets(unique);
      setExcludedBetIds(new Set());
      setStatus('preview');
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudo parsear el texto. Asegúrate de copiar la tabla completa.');
      setStatus('error');
    }
  };

  // Confirmar importación
  const handleImport = async () => {
    const includedBets = parsedBets.filter(b => !excludedBetIds.has(b.externalId));
    if (includedBets.length === 0) return;
    setStatus('importing');

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bets: includedBets, sport }),
      });
      const data = await res.json();
      setResult(data);
      setStatus('done');
    } catch {
      setErrorMsg('Error de red al importar. Intenta de nuevo.');
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setParsedBets([]);
    setExcludedBetIds(new Set());
    setResult(null);
    setErrorMsg('');
    setPasteText('');
  };

  const includedBets = parsedBets.filter(b => !excludedBetIds.has(b.externalId));

  return (
    <main className="flex-1 flex flex-col p-4 w-full h-full pb-20 md:pb-4">
      <div className="w-full flex flex-col h-full">
        <header className="flex items-center gap-4 py-4 mb-6">
          <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-slate-100 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Nueva Apuesta</h1>
            <p className="text-xs text-slate-400">Pegar historial de Altenar</p>
          </div>
        </header>

        {/* ESTADO: IDLE */}
        {status === 'idle' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <ClipboardPaste className="w-8 h-8 text-orange-400" />
                  <div className="text-left flex-1">
                    <p className="font-semibold text-slate-200">Pegar tabla copiada</p>
                    <p className="text-xs text-slate-400">Copia la tabla del navegador y pega aquí</p>
                  </div>
                </div>
                <textarea
                  className="w-full h-40 bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-orange-500 resize-none"
                  placeholder="Pega aquí el historial copiado..."
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    setPasteText(text);
                    setTimeout(() => processPasteText(text), 100);
                  }}
                />
                <button
                  onClick={() => processPasteText(pasteText)}
                  disabled={!pasteText.trim()}
                  className="w-full py-3 mt-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-sm transition-colors"
                >
                  Analizar texto pegado
                </button>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-4 flex flex-col gap-4 border border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-300">Opciones</h3>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-400">Deporte (aplica a todas)</label>
                <div className="relative">
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 appearance-none"
                  >
                    {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ESTADO: PROCESANDO */}
        {status === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            <p className="text-slate-300 font-medium">Procesando archivo...</p>
          </div>
        )}

        {/* ESTADO: PREVIEW */}
        {status === 'preview' && (
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between gap-3 bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
              <span className="text-sm font-bold text-slate-200">
                {includedBets.length} <span className="text-slate-500 font-normal">apuestas a importar</span>
              </span>
              {excludedBetIds.size > 0 && (
                <span className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-800 rounded-md">
                  {excludedBetIds.size} excluidas
                </span>
              )}
            </div>

            {parsedBets.length === 0 ? (
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex flex-col items-center gap-3 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 p-6">
                  <AlertCircle className="w-10 h-10 text-yellow-500" />
                  <p className="text-slate-300 font-medium text-center">
                    No se encontraron apuestas.
                  </p>
                  <button onClick={reset} className="text-sm text-orange-400 hover:text-orange-300 underline">
                    Volver e intentar de nuevo
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  {parsedBets.map((bet, i) => {
                    const isExcluded = excludedBetIds.has(bet.externalId);
                    return (
                    <div 
                      key={i} 
                      onClick={() => toggleExclude(bet.externalId)}
                      className={cn(
                        "rounded-xl p-3 flex justify-between items-center gap-2 border transition-all cursor-pointer",
                        isExcluded 
                          ? "bg-slate-900 border-slate-800 opacity-50" 
                          : "bg-slate-800 border-slate-700/50 hover:border-slate-600"
                      )}
                    >
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className={cn(
                          "w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors",
                          isExcluded ? "border-slate-700 bg-slate-800" : "border-orange-500 bg-orange-500"
                        )}>
                          {!isExcluded && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className={cn("text-xs font-semibold truncate", isExcluded ? "text-slate-500" : "text-slate-300")}>{bet.event}</p>
                          <p className="text-[11px] text-slate-500">{bet.rawDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-slate-400">Stake: <span className={cn(isExcluded ? "text-slate-500" : "text-slate-200")}>Bs {bet.stake.toFixed(2)}</span></span>
                        <span className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-md",
                          bet.status === 'WON' 
                            ? (isExcluded ? 'bg-slate-800 text-slate-600' : 'bg-emerald-500/20 text-emerald-400') 
                            : (isExcluded ? 'bg-slate-800 text-slate-600' : 'bg-red-500/20 text-red-400')
                        )}>
                          {bet.status === 'WON' ? `+Bs ${bet.profit.toFixed(2)}` : `Bs ${bet.profit.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  )})}
                </div>

                <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/50 flex flex-col gap-3 mt-2">
                  <h4 className="text-sm font-bold text-slate-200">Resumen de Importación</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400">Total Stake</span>
                      <span className="font-semibold text-slate-200">Bs {includedBets.reduce((acc, bet) => acc + bet.stake, 0).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400">Profit Esperado</span>
                      <span className={cn("font-bold", includedBets.reduce((acc, bet) => acc + bet.profit, 0) > 0 ? "text-emerald-400" : includedBets.reduce((acc, bet) => acc + bet.profit, 0) < 0 ? "text-red-400" : "text-slate-200")}>
                        {includedBets.reduce((acc, bet) => acc + bet.profit, 0) > 0 ? '+' : ''}{includedBets.reduce((acc, bet) => acc + bet.profit, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400">Ganadas</span>
                      <span className="font-semibold text-emerald-400">{includedBets.filter(b => b.status === 'WON').length}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-400">Perdidas</span>
                      <span className="font-semibold text-red-400">{includedBets.filter(b => b.status === 'LOST').length}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={includedBets.length === 0}
                    className="flex-2 flex-[2] py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none text-white font-bold text-sm transition-colors shadow-lg shadow-orange-500/20"
                  >
                    Importar {includedBets.length} apuestas
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ESTADO: IMPORTANDO */}
        {status === 'importing' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            <p className="text-slate-300 font-medium">Guardando en la base de datos...</p>
          </div>
        )}

        {/* ESTADO: DONE */}
        {status === 'done' && result && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <CheckCircle className="w-16 h-16 text-emerald-500" />
            <div className="text-center">
              <p className="text-xl font-bold text-slate-100">{result.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-emerald-400">{result.imported}</p>
                <p className="text-xs text-emerald-600 font-medium">Importadas</p>
              </div>
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-slate-400">{result.skipped}</p>
                <p className="text-xs text-slate-500 font-medium">Ya existían</p>
              </div>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={reset} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm hover:text-slate-200 transition-colors">
                Importar más
              </button>
              <Link href="/" className="flex-[2] py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm text-center shadow-lg shadow-orange-500/20 transition-colors flex items-center justify-center">
                Ver Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* ESTADO: ERROR */}
        {status === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <AlertCircle className="w-16 h-16 text-red-500" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-100">Algo salió mal</p>
              <p className="text-sm text-slate-400 mt-1">{errorMsg}</p>
            </div>
            <button
              onClick={reset}
              className="px-8 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
