// Tipos para las apuestas parseadas antes de guardar
export interface ParsedBet {
  externalId: string;
  rawDate: string;
  date: Date;
  betNumber: string;
  reference: string;
  stake: number;
  credit: number;
  status: 'WON' | 'LOST' | 'VOID';
  profit: number;
  event: string;
  market: string;
}

// Parsea fecha en formato "23-08-2026 17:32:38" o "23-08-2026" a Date
export function parseAltenarDate(rawDate: string): Date {
  // Intenta DD-MM-YYYY HH:mm:ss
  const match = rawDate.match(/(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?/);
  if (!match) return new Date();
  const [, day, month, year, time] = match;
  const iso = `${year}-${month}-${day}${time ? 'T' + time : 'T00:00:00'}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Limpia string numérico: "8,425.70" → 8425.70
function parseAmount(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Parsea filas CSV ya estructuradas del historial de Altenar
// Columnas esperadas: Fecha, ID, Plataforma, Descripción, Débito, Crédito, Saldo
export function parseAltenarRows(rows: Record<string, string>[]): ParsedBet[] {
  const betsByNumber: Record<string, ParsedBet> = {};
  const processedLedgerIds = new Set<string>();

  for (const row of rows) {
    // Normalizar claves (tolerar mayúsculas/minúsculas y acentos)
    const normalizedRow: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      normalizedRow[key.toLowerCase().normalize('NFD').replace(/\p{Mn}/gu, '')] = String(val);
    }

    // Evitar procesar exactamente la misma fila del ledger dos veces
    const ledgerId = (normalizedRow['id'] || '').trim();
    if (ledgerId && processedLedgerIds.has(ledgerId)) continue;
    if (ledgerId) processedLedgerIds.add(ledgerId);

    const platform = (normalizedRow['plataforma'] || '').trim();
    if (platform.toLowerCase() !== 'altenar') continue;

    const desc = normalizedRow['descripcion'] || normalizedRow['descripción'] || '';
    
    // Ignorar explícitamente transacciones de depósito o retiro
    if (/(dep[oó]sito|retiro)/i.test(desc)) continue;

    const betMatch = desc.match(/[Aa]puesta\s+#(\d+)/);
    
    if (!betMatch) continue;

    const betNumber = betMatch[1];
    const refMatch = desc.match(/[Rr]eferencia\s+#(\d+)/);
    const won = /ganada/i.test(desc);
    const reference = refMatch?.[1] ?? '';
    const rawDate = normalizedRow['fecha'] || '';

    // Débito = stake, Crédito = ganancia recibida
    const debit = parseAmount(normalizedRow['debito'] || normalizedRow['débito'] || '0');
    const credit = parseAmount(normalizedRow['credito'] || normalizedRow['crédito'] || '0');

    if (!betsByNumber[betNumber]) {
      betsByNumber[betNumber] = {
        externalId: betNumber, // Usar el número de apuesta como ID único real
        rawDate,
        date: parseAltenarDate(rawDate),
        betNumber,
        reference,
        stake: 0,
        credit: 0,
        status: 'LOST',
        profit: 0,
        event: `Apuesta #${betNumber}`,
        market: reference ? `Ref: #${reference}` : '',
      };
    }

    const bet = betsByNumber[betNumber];

    // Si es un débito (stake de la apuesta), actualizamos
    if (debit > 0) {
      bet.stake += debit;
      // Preferimos la fecha en la que se colocó el stake
      bet.rawDate = rawDate;
      bet.date = parseAltenarDate(rawDate);
    }

    // Si es un crédito (ganancia), actualizamos
    if (credit > 0) {
      bet.credit += credit;
    }

    const lost = /perdida/i.test(desc);

    // Marcamos estado según la evidencia
    if (/ganada/i.test(desc) || bet.credit > 0) {
      bet.status = 'WON';
    } else if (lost) {
      bet.status = 'LOST';
    }

    // Guardamos la referencia si no la teníamos
    if (reference && !bet.reference) {
      bet.reference = reference;
      bet.market = `Ref: #${reference}`;
    }

    // Recalculamos el profit final (Ganancia neta = Crédito total - Stake)
    bet.profit = bet.status === 'WON' ? bet.credit - bet.stake : -bet.stake;
  }

  return Object.values(betsByNumber);
}
