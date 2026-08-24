import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { type ParsedBet } from '@/lib/parsers/altenar';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { bets: ParsedBet[]; sport: string };
    const { bets, sport } = body;

    if (!bets || bets.length === 0) {
      return NextResponse.json({ error: 'No bets provided' }, { status: 400 });
    }

    // Extraer todos los externalIds a importar
    const externalIds = bets
      .map(b => b.externalId)
      .filter((id): id is string => Boolean(id));

    // Buscar cuáles ya existen en la DB (deduplicación)
    const existing = await prisma.bet.findMany({
      where: { externalId: { in: externalIds } },
      select: { externalId: true },
    });
    const existingIds = new Set(existing.map(e => e.externalId));

    // Filtrar solo los nuevos
    const newBets = bets.filter(b => !existingIds.has(b.externalId));

    if (newBets.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: bets.length,
        message: 'Todas las apuestas ya existen en la base de datos.',
      });
    }

    // Insertar en bulk
    await prisma.bet.createMany({
      data: newBets.map(b => ({
        date: b.date,
        sport: sport || 'Desconocido',
        event: b.event,
        market: b.market,
        stake: b.stake,
        odds: b.credit > 0 && b.stake > 0 ? parseFloat((b.credit / b.stake).toFixed(2)) : 1.0,
        status: b.status,
        profit: b.profit,
        externalId: b.externalId || null,
        betNumber: b.betNumber || null,
        reference: b.reference || null,
        rawDate: b.rawDate || null,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      imported: newBets.length,
      skipped: bets.length - newBets.length,
      message: `Se importaron ${newBets.length} apuestas. ${bets.length - newBets.length} ya existían (ignoradas).`,
    });
  } catch (err) {
    console.error('[import]', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
