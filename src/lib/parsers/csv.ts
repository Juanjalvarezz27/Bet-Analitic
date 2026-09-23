import { parseAltenarRows, type ParsedBet } from './altenar';
import { parseCasinoRows } from './casino';

// Parsea texto pegado desde el clipboard al copiar una tabla HTML en el navegador.
// Los navegadores copian tablas como texto separado por TABS (\t) con saltos de línea (\n).
// Formato esperado (copiado del historial de la plataforma):
// Fecha\tID\tPlataforma\tDescripción\tDébito\tCrédito\tSaldo\n
export function parsePastedText(raw: string): ParsedBet[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detectar separador: Tab (TSV del browser) o coma (CSV)
  const sep = lines[0].includes('\t') ? '\t' : ',';

  // Primera línea = encabezados
  const headers = lines[0].split(sep).map(h => h.trim());

  // Si la primera línea NO parece ser encabezados (empieza con una fecha), ignorar encabezados
  const startsWithDate = /^\d{2}-\d{2}-\d{4}/.test(lines[0]);
  const dataLines = startsWithDate ? lines : lines.slice(1);

  const defaultHeaders = ['Fecha', 'ID', 'Plataforma', 'Descripción', 'Débito', 'Crédito', 'Saldo'];

  // Construir filas como objetos usando los encabezados
  const rows: Record<string, string>[] = [];

  if (!startsWithDate && headers.length > 1) {
    for (const line of dataLines) {
      const cols = line.split(sep);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (cols[i] ?? '').trim().replace(/^"|"$/g, '');
      });
      rows.push(row);
    }
  } else {
    for (const line of dataLines) {
      const cols = line.split(sep);
      const row: Record<string, string> = {};
      defaultHeaders.forEach((h, i) => {
        row[h] = (cols[i] ?? '').trim().replace(/^"|"$/g, '');
      });
      rows.push(row);
    }
  }

  // Combinar apuestas deportivas (Altenar) y jugadas de casino
  const altenarBets = parseAltenarRows(rows);
  const casinoBets = parseCasinoRows(rows);
  const all = [...altenarBets, ...casinoBets];

  // Deduplicar por externalId (por si acaso)
  const seen = new Set<string>();
  return all.filter(b => {
    if (!b.externalId || seen.has(b.externalId)) return false;
    seen.add(b.externalId);
    return true;
  });
}
