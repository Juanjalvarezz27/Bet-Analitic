'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Plus, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Database, Trophy,
  X, Lock, ChevronRight, BarChart3,
} from 'lucide-react';
import { parseMatchData, ParsedMatchData, BettingCategory } from '@/lib/interpreter-parser';

interface MatchEntry {
  id: string;
  name: string;
  rawData: string;
  result: ParsedMatchData | null;
  inputOpen: boolean;
  analyzing: boolean;
}

const STORAGE_KEY = 'interpreter_matches_v3';

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

// ────────────────────────────────────────────────
// Primitivos de UI
// ────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high:   { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', label: 'Alta' },
    medium: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25',       label: 'Media' },
    low:    { cls: 'bg-red-500/15 text-red-400 border-red-500/25',             label: 'Baja' },
  };
  const { cls, label } = map[level];
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md border uppercase tracking-wide shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function AnimatedBar({ score, delay = 0, height = 'h-1.5' }: { score: number; delay?: number; height?: string }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 120 + delay);
    return () => clearTimeout(t);
  }, [score, delay]);
  const color = score >= 65 ? 'from-emerald-500 to-emerald-400' : score >= 45 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-red-400';
  return (
    <div className={`relative ${height} bg-slate-800 rounded-full overflow-hidden w-full`}>
      <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full transition-all duration-700 ease-out`} style={{ width: `${width}%` }} />
    </div>
  );
}

function ScoreChip({ score }: { score: number }) {
  const color = score >= 65 ? 'text-emerald-400' : score >= 45 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-sm font-black tabular-nums shrink-0 ${color}`}>{score}%</span>;
}

// ────────────────────────────────────────────────
// Tarjeta de Categoría
// ────────────────────────────────────────────────

function CategoryCard({ category, delay }: { category: BettingCategory; delay: number }) {
  const [open, setOpen] = useState<string | null>(null);

  if (!category.hasData) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/40 border border-slate-800/60 rounded-2xl opacity-50">
        <span className="text-lg">{category.icon}</span>
        <span className="text-sm text-slate-500 font-medium">{category.label}</span>
        <Lock className="w-3.5 h-3.5 text-slate-600 ml-auto shrink-0" />
      </div>
    );
  }

  const top = category.bets[0];
  const topColor = top.score >= 65 ? 'text-emerald-400' : top.score >= 45 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden flex flex-col">
      {/* Header categoría */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 bg-slate-800/20">
        <span className="text-lg shrink-0">{category.icon}</span>
        <span className="text-sm font-bold text-slate-200 flex-1 leading-tight">{category.label}</span>
        <span className={`text-base font-black shrink-0 ${topColor}`}>{top.score}%</span>
      </div>

      {/* Lista de apuestas */}
      <div className="p-3 space-y-2 flex-1">
        {category.bets.map((bet, idx) => (
          <div key={bet.id} className="space-y-1">
            {/* Fila principal */}
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black w-5 text-center shrink-0 ${idx === 0 ? 'text-orange-400' : 'text-slate-600'}`}>
                {idx + 1}
              </span>
              <span className="text-xs font-medium text-slate-300 flex-1 min-w-0 leading-tight">{bet.label}</span>
              <ConfidenceBadge level={bet.confidence} />
              <ScoreChip score={bet.score} />
            </div>

            {/* Barra */}
            <div className="pl-5">
              <AnimatedBar score={bet.score} delay={delay + idx * 70} />
            </div>

            {/* Fuentes */}
            {bet.sources.length > 0 && (
              <div className="pl-5">
                <button
                  onClick={() => setOpen(open === bet.id ? null : bet.id)}
                  className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <ChevronRight className={`w-2.5 h-2.5 transition-transform ${open === bet.id ? 'rotate-90' : ''}`} />
                  {bet.sources.length} fuente{bet.sources.length !== 1 ? 's' : ''}
                </button>
                {open === bet.id && (
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {bet.sources.map((s, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Panel de resultados
// ────────────────────────────────────────────────

function ResultsPanel({ result }: { result: ParsedMatchData }) {
  const [dqWidth, setDqWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setDqWidth(result.dataQuality), 300); return () => clearTimeout(t); }, [result.dataQuality]);

  const withData    = result.categories.filter(c => c.hasData);
  const withoutData = result.categories.filter(c => !c.hasData);

  return (
    <div className="space-y-6">
      {/* Calidad de datos */}
      <div className="flex items-center gap-4 px-5 py-4 bg-slate-800/30 border border-slate-700/30 rounded-2xl">
        <Database className="w-4 h-4 text-orange-400 shrink-0" />
        <span className="text-sm font-semibold text-slate-300 shrink-0">Calidad de datos</span>
        <div className="flex-1 relative h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${dqWidth}%` }}
          />
        </div>
        <span className="text-sm font-black text-slate-100 tabular-nums shrink-0 w-10 text-right">{result.dataQuality}%</span>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="flex gap-3 px-5 py-4 bg-amber-500/8 border border-amber-500/20 rounded-2xl">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-sm text-amber-300/90 leading-relaxed">{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Categorías con datos */}
      {withData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Trophy className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {withData.length} categoría{withData.length !== 1 ? 's' : ''} analizadas
            </span>
          </div>

          {/* Grid responsivo de 3 columnas */}
          <div className="grid grid-cols-3 gap-4">
            {withData.map((cat, i) => (
              <CategoryCard key={cat.id} category={cat} delay={i * 50} />
            ))}
          </div>
        </div>
      )}

      {/* Categorías sin datos */}
      {withoutData.length > 0 && (
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest px-1 block">
            Sin datos suficientes
          </span>
          <div className="flex flex-wrap gap-2">
            {withoutData.map(cat => (
              <div key={cat.id} className="flex items-center gap-2 px-3 py-2 bg-slate-900/30 border border-slate-800/40 rounded-xl opacity-60">
                <span className="text-sm">{cat.icon}</span>
                <span className="text-xs text-slate-500 font-medium">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────
// Tarjeta de partido
// ────────────────────────────────────────────────

function MatchCard({
  match, index, onUpdate, onRemove, onAnalyze,
}: {
  match: MatchEntry;
  index: number;
  onUpdate: (id: string, field: keyof MatchEntry, val: string | boolean) => void;
  onRemove: (id: string) => void;
  onAnalyze: (id: string) => void;
}) {
  const hasResult = !!match.result;

  return (
    <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-700/60 rounded-3xl overflow-hidden shadow-2xl shadow-black/30">

      {/* ── Barra de título ── */}
      <div className="flex items-center gap-4 px-6 py-4 bg-gradient-to-r from-slate-800/40 to-transparent border-b border-slate-800/60">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400 font-black text-sm shrink-0">
          {index + 1}
        </div>
        <input
          type="text"
          value={match.name}
          onChange={e => onUpdate(match.id, 'name', e.target.value)}
          placeholder="Nombre del partido (Ej: Real Madrid vs Barcelona)"
          className="flex-1 bg-transparent text-white font-bold text-base placeholder:text-slate-600 outline-none"
        />
        <div className="flex items-center gap-1 shrink-0">
          {hasResult && (
            <button
              onClick={() => onUpdate(match.id, 'inputOpen', !match.inputOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700/50"
            >
              {match.inputOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <BarChart3 className="w-3.5 h-3.5" />}
              {match.inputOpen ? 'Ver resultados' : 'Editar datos'}
            </button>
          )}
          <button
            onClick={() => onRemove(match.id)}
            className="p-2 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Cuerpo: Input o Resultados ── */}
      <div className="p-6">
        {/* Vista: Entrada de datos */}
        {(!hasResult || match.inputOpen) && (
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            {!hasResult && (
              <p className="text-sm text-slate-500 leading-relaxed">
                Pega el texto completo de las estadísticas del partido (H2H, goles, predicciones, odds) desde{' '}
                <span className="text-orange-400 font-medium">footystats.org</span> u otra fuente.
              </p>
            )}
            <div className="flex gap-4 items-start">
              <textarea
                value={match.rawData}
                onChange={e => onUpdate(match.id, 'rawData', e.target.value)}
                placeholder="Pega aquí los datos estadísticos del partido..."
                rows={hasResult ? 8 : 10}
                className="flex-1 bg-slate-950/60 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-orange-500/40 focus:bg-slate-950/80 transition-all resize-none font-mono leading-relaxed shadow-inner"
              />
              <button
                onClick={() => onAnalyze(match.id)}
                disabled={!match.rawData.trim() || match.analyzing}
                className="flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold px-5 py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-orange-500/20 disabled:shadow-none active:scale-[0.98] min-w-[120px] h-full"
              >
                {match.analyzing ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-xs text-center leading-tight">Procesando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    <span className="text-xs text-center leading-tight">{hasResult ? 'Re-analizar' : 'Analizar Partido'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Vista: Resultados */}
        {hasResult && !match.inputOpen && (
          <ResultsPanel result={match.result!} />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────
// Página principal
// ────────────────────────────────────────────────

export default function InterpreterPage() {
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as MatchEntry[];
        setMatches(parsed.map(m => ({ ...m, analyzing: false })));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(matches)); } catch { /* ignore */ }
  }, [matches]);

  function addMatch() {
    setMatches(prev => [
      ...prev,
      { id: generateId(), name: '', rawData: '', result: null, inputOpen: true, analyzing: false },
    ]);
  }

  function updateMatch(id: string, field: keyof MatchEntry, val: string | boolean) {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m));
  }

  function removeMatch(id: string) {
    setMatches(prev => prev.filter(m => m.id !== id));
  }

  function analyzeMatch(id: string) {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, analyzing: true } : m));
    setTimeout(() => {
      setMatches(prev => prev.map(m => {
        if (m.id !== id) return m;
        const result = parseMatchData(m.rawData);
        
        // Autocompletar el nombre del partido si está vacío y encontramos los equipos
        let finalName = m.name;
        if (!finalName.trim() && result.homeTeam !== 'Local' && result.awayTeam !== 'Visitante') {
          finalName = `${result.homeTeam} vs ${result.awayTeam}`;
        }
        
        return { ...m, analyzing: false, result, inputOpen: false, name: finalName };
      }));
    }, 700);
  }

  return (
    <main className="w-full max-w-[1400px] mx-auto flex flex-col gap-8 px-8 py-6 pb-16">

      {/* Header */}
      <header className="flex items-center gap-5">
        <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-3 rounded-2xl shadow-xl shadow-orange-500/30 border border-orange-400/20 shrink-0">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white leading-none">Intérprete</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Motor de análisis estadístico — sin suposiciones, solo tus datos</p>
        </div>
      </header>

      {/* Estado vacío */}
      {matches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-b from-orange-500/20 to-transparent border border-orange-500/20 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-orange-400" />
            </div>
            <div className="absolute -inset-4 rounded-[2rem] bg-orange-500/5 -z-10 blur-xl" />
          </div>
          <div className="text-center space-y-3 max-w-lg">
            <h2 className="text-2xl font-black text-slate-100">Analiza tus partidos al instante</h2>
            <p className="text-slate-400 leading-relaxed">
              Agrega un partido, pega las estadísticas de <span className="text-orange-400 font-semibold">footystats.org</span> y obtén el
              Top&nbsp;5 de apuestas por categoría basado en los datos reales.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {['⚽ Over/Under Goles', '🤝 Ambos Marcan', '🚩 Corners', '🟨 Tarjetas', '⚖️ Hándicap', '🏠 Doble Oportunidad', '🏆 Ganador'].map(t => (
              <span key={t} className="text-sm font-medium bg-slate-900/60 border border-slate-700/50 px-3 py-1.5 rounded-full text-slate-400">
                {t}
              </span>
            ))}
          </div>
          <button
            onClick={addMatch}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold px-8 py-3.5 rounded-2xl transition-all shadow-xl shadow-orange-500/25 active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Agregar primer partido
          </button>
        </div>
      )}

      {/* Lista de partidos */}
      {matches.length > 0 && (
        <div className="space-y-6">
          {matches.map((match, idx) => (
            <MatchCard
              key={match.id}
              match={match}
              index={idx}
              onUpdate={updateMatch}
              onRemove={removeMatch}
              onAnalyze={analyzeMatch}
            />
          ))}

          {/* Botón añadir partido */}
          <button
            onClick={addMatch}
            className="flex items-center justify-center gap-3 w-full border-2 border-dashed border-slate-800 hover:border-orange-500/40 hover:bg-orange-500/4 text-slate-500 hover:text-orange-400 rounded-3xl py-5 transition-all duration-300 font-semibold text-sm group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Añadir otro partido
          </button>
        </div>
      )}
    </main>
  );
}
