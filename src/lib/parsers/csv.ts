import { parseAltenarRows, type ParsedBet } from './altenar';

// Parsea texto pegado desde el clipboard al copiar una tabla HTML en el navegador.
// Los navegadores copian tablas como texto separado por TABS (\t) con saltos de línea (\n).
// Formato esperado (copiado del historial de Altenar):
// Fecha\tID\tPlataforma\tDescripción\tDébito\tCrédito\tSaldo\n
// 23-08-2026 18:46:50\t27632353302\tAltenar\tApuesta #5327259530 ganada...\t-\t5,600.28\t6,099.76\n
export function parsePastedText(raw: string): ParsedBet[] {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detectar separador: Tab (TSV del browser) o coma (CSV)
  const sep = lines[0].includes('\t') ? '\t' : ',';

  // Primera línea = encabezados
  const headers = lines[0].split(sep).map(h => h.trim());

  // Si la primera línea NO parece ser encabezados (empieza con una fecha), ignorar encabezados
  const startsWithDate = /^\d{2}-\d{2}-\d{4}/.test(lines[0]);
  let dataLines = startsWithDate ? lines : lines.slice(1);

  // Construir filas como objetos usando los encabezados
  const rows: Record<string, string>[] = [];

  if (!startsWithDate && headers.length > 1) {
    // Hay encabezados: mapear cada columna
    for (const line of dataLines) {
      const cols = line.split(sep);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (cols[i] ?? '').trim().replace(/^"|"$/g, '');
      });
      rows.push(row);
    }
  } else {
    // Sin encabezados: mapear por posición con nombres esperados de Altenar
    const defaultHeaders = ['Fecha', 'ID', 'Plataforma', 'Descripción', 'Débito', 'Crédito', 'Saldo'];
    for (const line of dataLines) {
      const cols = line.split(sep);
      const row: Record<string, string> = {};
      defaultHeaders.forEach((h, i) => {
        row[h] = (cols[i] ?? '').trim().replace(/^"|"$/g, '');
      });
      rows.push(row);
    }
  }

  return parseAltenarRows(rows);
}


