'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { BetStatus } from '@prisma/client';

export async function createBet(formData: FormData) {
  const sport = formData.get('sport') as string;
  const event = formData.get('event') as string;
  const market = formData.get('market') as string;
  const stake = parseFloat(formData.get('stake') as string);
  const odds = parseFloat(formData.get('odds') as string);

  await prisma.bet.create({
    data: {
      sport,
      event,
      market,
      stake,
      odds,
      status: 'PENDING',
    },
  });

  revalidatePath('/');
  revalidatePath('/stats');
}

export async function updateBetStatus(id: string, status: BetStatus) {
  const bet = await prisma.bet.findUnique({ where: { id } });
  
  if (!bet) return { error: 'Bet not found' };

  let profit: number | null = null;

  if (status === 'WON') {
    profit = (bet.stake * bet.odds) - bet.stake;
  } else if (status === 'LOST') {
    profit = -bet.stake;
  } else if (status === 'VOID') {
    profit = 0;
  }

  await prisma.bet.update({
    where: { id },
    data: {
      status,
      profit,
    },
  });

  revalidatePath('/');
  revalidatePath('/stats');
}

export async function getDashboardData() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const bets = await prisma.bet.findMany({
    where: {
      date: {
        gte: startOfDay,
      }
    },
    orderBy: { date: 'desc' },
    take: 50,
  });

  // Profit global
  const totalProfit = await prisma.bet.aggregate({
    _sum: { profit: true },
    where: { status: { in: ['WON', 'LOST', 'VOID'] } },
  });

  return {
    recentBets: bets,
    globalProfit: totalProfit._sum.profit || 0,
  };
}

export async function getStatsData(period: string = 'all') {
  const now = new Date();
  let startDate = new Date(0);

  if (period === 'today') {
    startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    startDate = new Date(now);
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === 'year') {
    startDate = new Date(now);
    startDate.setFullYear(now.getFullYear() - 1);
  }

  const allResolvedBets = await prisma.bet.findMany({
    where: { 
      status: { in: ['WON', 'LOST'] },
      date: { gte: startDate }
    },
    orderBy: { date: 'asc' }
  });

  const totalBets = allResolvedBets.length;
  const wonBets = allResolvedBets.filter(b => b.status === 'WON').length;
  const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

  const totalStake = allResolvedBets.reduce((sum, bet) => sum + bet.stake, 0);
  const totalProfit = allResolvedBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
  const roi = totalStake > 0 ? (totalProfit / totalStake) * 100 : 0;

  // Profit by sport
  const sportStats: Record<string, { profit: number, count: number }> = {};
  const dailyProfitMap: Record<string, number> = {};

  for (const bet of allResolvedBets) {
    // Deportes
    if (!sportStats[bet.sport]) {
      sportStats[bet.sport] = { profit: 0, count: 0 };
    }
    sportStats[bet.sport].profit += bet.profit || 0;
    sportStats[bet.sport].count += 1;

    // Daily Profit
    const dateStr = bet.date.toISOString().split('T')[0];
    if (!dailyProfitMap[dateStr]) {
      dailyProfitMap[dateStr] = 0;
    }
    dailyProfitMap[dateStr] += (bet.profit || 0);
  }

  // Preparar dailyProfit para Recharts (acumulativo)
  const dailyProfitData = Object.entries(dailyProfitMap)
    .map(([date, profit]) => ({ date, profit }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let cumulative = 0;
  const dailyProfit = dailyProfitData.map(item => {
    cumulative += item.profit;
    return {
      date: item.date,
      profit: item.profit,
      cumulative: cumulative,
    };
  });

  return {
    winRate,
    roi,
    totalProfit,
    totalBets,
    sportStats,
    dailyProfit,
  };
}
