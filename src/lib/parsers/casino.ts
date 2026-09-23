import { parseAltenarDate, type ParsedBet } from './altenar';

// Plataformas de casino reconocidas
const CASINO_PLATFORMS = ['upgaming', 'pragmaticplay live casino'];

function isCasinoPlatform(platform: string): boolean {
  return CASINO_PLATFORMS.includes(platform.toLowerCase().trim());
}

function parseAmount(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Extrae el roundId y el nombre del juego según el proveedor
function extractCasinoInfo(platform: string, desc: string): { roundId: string; gameName: string } | null {
  const plat = platform.toLowerCase().trim();

  if (plat === 'upgaming') {
    // "Apuesta #upg1264347351 en el juego Blackjack"
    // "Apuesta #upg1264346486 en el juego Blackjack ganada"
    const m = desc.match(/[Aa]puesta\s+#(upg\d+)\s+en\s+el\s+juego\s+([^\s](?:[^(ganada|perdida)])*)/i);
    if (!m) return null;
    const roundId = `casino_upg_${m[1]}`;
    // Limpiar "ganada" o "perdida" del nombre del juego
    const gameName = m[2].trim().replace(/\s*(ganada|perdida)$/i, '').trim();
    return { roundId, gameName };
  }

  if (plat === 'pragmaticplay live casino') {
    // "Apuesta en la ronda #295506973724008 en el juego ONE Blackjack Latino"
    // "Apuesta en la ronda #295506973724008 ganada en el juego ONE Blackjack Latino"
    const m = desc.match(/[Aa]puesta\s+en\s+la\s+ronda\s+#(\d+).*en\s+el\s+juego\s+(.+)/i);
    if (!m) return null;
    const roundId = `casino_pp_${m[1]}`;
    const gameName = m[2].trim();
    return { roundId, gameName };
  }

  return null;
}

function isWon(desc: string): boolean {
  return /ganada/i.test(desc);
}

// Parsea las filas del historial y extrae jugadas de casino agrupadas por ronda
export function parseCasinoRows(rows: Record<string, string>[]): ParsedBet[] {
  const roundsMap: Record<string, ParsedBet> = {};
  const processedLedgerIds = new Set<string>();

  for (const row of rows) {
    // Normalizar claves
    const normalized: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      normalized[key.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')] = String(val);
    }

    // Evitar duplicados de fila
    const ledgerId = (normalized['id'] || '').trim();
    if (ledgerId && processedLedgerIds.has(ledgerId)) continue;
    if (ledgerId) processedLedgerIds.add(ledgerId);

    const platform = (normalized['plataforma'] || '').trim();
    if (!isCasinoPlatform(platform)) continue;

    const desc = normalized['descripcion'] || normalized['descripción'] || '';

    // Ignorar transacciones que no son jugadas
    if (/(dep[oó]sito|retiro|bono|withdrawal|locked|desbloqueado)/i.test(desc)) continue;

    const info = extractCasinoInfo(platform, desc);
    if (!info) continue;

    const { roundId, gameName } = info;
    const rawDate = normalized['fecha'] || '';
    const debit = parseAmount(normalized['debito'] || normalized['débito'] || '0');
    const credit = parseAmount(normalized['credito'] || normalized['crédito'] || '0');

    if (!roundsMap[roundId]) {
      roundsMap[roundId] = {
        externalId: roundId,
        rawDate,
        date: parseAltenarDate(rawDate),
        betNumber: roundId,
        reference: '',
        stake: 0,
        credit: 0,
        status: 'LOST',
        profit: 0,
        event: gameName,
        market: platform,
      };
    }

    const round = roundsMap[roundId];

    if (debit > 0) {
      round.stake += debit;
      // Preferimos la fecha del stake
      round.rawDate = rawDate;
      round.date = parseAltenarDate(rawDate);
    }

    if (credit > 0) {
      round.credit += credit;
    }

    if (isWon(desc) || round.credit > 0) {
      round.status = 'WON';
    }

    // Profit neto: ganancia recibida menos lo apostado
    round.profit = round.status === 'WON' ? round.credit - round.stake : -round.stake;
  }

  return Object.values(roundsMap);
}
