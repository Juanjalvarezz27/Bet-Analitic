import { getStatsData } from '@/lib/actions/bet-actions';
import FAB from '@/components/FAB';
import StatsDashboard from './StatsDashboard';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function StatsPage({ searchParams }: Props) {
  const { period: periodParam } = await searchParams;
  const period = periodParam || 'all';
  const stats = await getStatsData(period);

  return (
    <main className="flex-1 flex flex-col p-4 w-full h-full pb-20 max-w-7xl mx-auto">
      <header className="py-4 mb-4">
        <h1 className="text-2xl font-bold text-slate-100">Análisis</h1>
        <p className="text-sm text-slate-400">Rendimiento de tus apuestas</p>
      </header>

      <StatsDashboard initialStats={stats} initialPeriod={period} />

      <FAB />
    </main>
  );
}
