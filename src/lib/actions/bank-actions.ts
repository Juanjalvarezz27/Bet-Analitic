'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { BankEventType } from '@prisma/client';

export async function createBankEvent(type: BankEventType, amount: number, note?: string) {
  await prisma.bankEvent.create({
    data: { type, amount, note },
  });
  revalidatePath('/');
}

// Calcula el estado actual del bankroll
export async function getBankrollState() {
  const events = await prisma.bankEvent.findMany({ orderBy: { date: 'desc' } });

  const totalDeposited = events
    .filter(e => e.type === 'DEPOSIT')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalWithdrawn = events
    .filter(e => e.type === 'WITHDRAWAL')
    .reduce((sum, e) => sum + e.amount, 0);

  const lastBankrupt = events.find(e => e.type === 'BANKRUPT');

  // Quiebra activa si no hay depósito posterior a la última quiebra
  let isBankrupt = false;
  if (lastBankrupt) {
    const depositAfterBankrupt = events.find(
      e => e.type === 'DEPOSIT' && e.date > lastBankrupt.date
    );
    isBankrupt = !depositAfterBankrupt;
  }

  return {
    totalDeposited,
    totalWithdrawn,
    isBankrupt,
    lastBankruptDate: lastBankrupt?.date ?? null,
    recentEvents: events.slice(0, 10),
  };
}

export async function getBankEvents() {
  return await prisma.bankEvent.findMany({
    orderBy: { date: 'desc' },
  });
}

export async function deleteBankEvent(id: string) {
  await prisma.bankEvent.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/bank');
}

export async function updateBankEvent(id: string, data: { amount?: number; note?: string; date?: Date }) {
  await prisma.bankEvent.update({
    where: { id },
    data,
  });
  revalidatePath('/');
  revalidatePath('/bank');
}
