'use server';

import prisma from '@/lib/prisma';
import { toCaracasDateStr, getCaracasDayRange, getCaracasPeriodRange } from '@/lib/utils';
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
      date: new Date(),
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
  const { startOfDay, endOfDay } = getCaracasDayRange();

  const bets = await prisma.bet.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
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

  // Profit solo del día de hoy (según zona horaria de Caracas)
  const todayProfit = await prisma.bet.aggregate({
    _sum: { profit: true },
    where: { 
      status: { in: ['WON', 'LOST', 'VOID'] },
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  // Racha actual: apuestas resueltas más recientes en orden descendente
  const resolvedBets = await prisma.bet.findMany({
    where: { status: { in: ['WON', 'LOST'] } },
    orderBy: { date: 'desc' },
    take: 50,
    select: { status: true },
  });

  let streak = 0;
  let streakType: 'WON' | 'LOST' | null = null;
  if (resolvedBets.length > 0) {
    streakType = resolvedBets[0].status as 'WON' | 'LOST';
    for (const b of resolvedBets) {
      if (b.status === streakType) streak++;
      else break;
    }
  }

  // Días ganados vs perdidos
  const allResolvedBetsForDays = await prisma.bet.findMany({
    where: { status: { in: ['WON', 'LOST', 'VOID'] } },
    select: { date: true, profit: true },
  });

  const dailyProfitMap: Record<string, number> = {};
  for (const bet of allResolvedBetsForDays) {
    const dateStr = toCaracasDateStr(bet.date);
    if (!dailyProfitMap[dateStr]) dailyProfitMap[dateStr] = 0;
    dailyProfitMap[dateStr] += (bet.profit || 0);
  }

  let greenDays = 0;
  let redDays = 0;
  for (const profit of Object.values(dailyProfitMap)) {
    if (profit > 0) greenDays++;
    else if (profit < 0) redDays++;
  }

  return {
    recentBets: bets,
    globalProfit: totalProfit._sum.profit || 0,
    todayProfit: todayProfit._sum.profit || 0,
    streak,
    streakType,
    greenDays,
    redDays,
  };
}

export async function getStatsData(period: string = 'all') {
  const { startDate, endDate } = getCaracasPeriodRange(period);

  const dateFilter: { gte: Date; lte?: Date } = { gte: startDate };
  if (endDate) {
    dateFilter.lte = endDate;
  }

  const allResolvedBets = await prisma.bet.findMany({
    where: { 
      status: { in: ['WON', 'LOST'] },
      date: dateFilter
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
  
  let highestWin = 0;
  let worstLoss = 0;
  let totalOdds = 0;

  for (const bet of allResolvedBets) {
    // Deportes
    if (!sportStats[bet.sport]) {
      sportStats[bet.sport] = { profit: 0, count: 0 };
    }
    sportStats[bet.sport].profit += bet.profit || 0;
    sportStats[bet.sport].count += 1;

    // Daily Profit
    const dateStr = toCaracasDateStr(bet.date);
    if (!dailyProfitMap[dateStr]) {
      dailyProfitMap[dateStr] = 0;
    }
    dailyProfitMap[dateStr] += (bet.profit || 0);

    // Nuevos KPIs
    totalOdds += bet.odds;
    const profit = bet.profit || 0;
    if (profit > highestWin) highestWin = profit;
    if (profit < worstLoss) worstLoss = profit;
  }

  const avgStake = totalBets > 0 ? totalStake / totalBets : 0;
  const avgOdds = totalBets > 0 ? totalOdds / totalBets : 0;

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
    avgStake,
    avgOdds,
    highestWin,
    worstLoss,
  };
}

export async function getPaginatedBets(page: number = 1, period: string = 'all', filterStatus: string = 'ALL') {
  const limit = 20;
  const skip = (page - 1) * limit;

  const { startDate, endDate } = getCaracasPeriodRange(period);

  const dateFilter: { gte: Date; lte?: Date } = { gte: startDate };
  if (endDate) {
    dateFilter.lte = endDate;
  }

  const whereClause: any = {
    date: dateFilter
  };

  if (filterStatus !== 'ALL') {
    whereClause.status = filterStatus;
  }

  const bets = await prisma.bet.findMany({
    where: whereClause,
    orderBy: { date: 'desc' },
    take: limit,
    skip: skip
  });

  const total = await prisma.bet.count({ where: whereClause });

  return {
    bets,
    total,
    hasMore: skip + bets.length < total
  };
}
