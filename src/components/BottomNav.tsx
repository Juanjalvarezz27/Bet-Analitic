'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LineChart, Wallet, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();

  const links = [
    { href: '/', icon: Home, label: 'Inicio' },
    { href: '/stats', icon: LineChart, label: 'Estadísticas' },
    { href: '/bank', icon: Wallet, label: 'Cartera' },
  ];

  return (
    <>
      {/* Desktop Header - Floating Glassmorphism */}
      <div className="hidden md:flex fixed top-4 left-0 right-0 z-50 justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center justify-between px-6 h-16 w-full max-w-4xl bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-full shadow-2xl shadow-black/50">
          
          {/* Logo */}
          <div className="flex items-center gap-2 text-slate-100 font-black text-xl tracking-tight">
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-1.5 rounded-xl shadow-lg shadow-orange-500/30">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Bet<span className="text-orange-500">Analytics</span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {links.map(link => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                    isActive 
                      ? "text-orange-400 bg-orange-500/10" 
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive && "drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]")} />
                  {link.label}
                  {isActive && (
                    <span className="absolute inset-x-4 -bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Bottom Nav - Sleek & Modern */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/95 to-transparent pointer-events-none h-24 -top-8" />
        <div className="relative bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50 pb-safe">
          <div className="flex items-center justify-around h-16 px-2">
            {links.map(link => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative flex flex-col items-center justify-center w-full h-full group"
                >
                  {isActive && (
                    <div className="absolute top-0 w-12 h-1 bg-orange-500 rounded-b-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                  )}
                  <Icon className={cn(
                    "w-6 h-6 mb-1 transition-all duration-300",
                    isActive 
                      ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] -translate-y-0.5" 
                      : "text-slate-500 group-hover:text-slate-300"
                  )} />
                  <span className={cn(
                    "text-[10px] font-semibold transition-all duration-300",
                    isActive ? "text-orange-500" : "text-slate-500 group-hover:text-slate-300"
                  )}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
