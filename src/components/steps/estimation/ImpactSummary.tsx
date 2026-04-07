'use client';

import Factory from 'lucide-react/dist/esm/icons/factory';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';

interface ImpactSummaryProps {
  fabLoss: number | null;
  cupLoss: number | null;
  totalLoss: number | null;
  formatNum: (val: number) => string;
}

export function ImpactSummary({ 
  fabLoss, 
  cupLoss, 
  totalLoss, 
  formatNum 
}: ImpactSummaryProps) {
  if (totalLoss === null) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex items-center justify-between border border-white/10 group hover:scale-[1.02] transition-transform">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">Cumulative FAB Financial Impact</p>
            <p className="text-3xl font-headline font-black tracking-tighter tabular-nums">NTD {formatNum(fabLoss || 0)}M</p>
          </div>
          <Factory className="w-10 h-10 text-accent/20 group-hover:text-accent/40 transition-colors" />
        </div>
        <div className="p-6 rounded-3xl bg-blue-900 text-white shadow-xl flex items-center justify-between border border-white/10 group hover:scale-[1.02] transition-transform">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">Cumulative CUP Financial Impact</p>
            <p className="text-3xl font-headline font-black tracking-tighter tabular-nums">NTD {formatNum(cupLoss || 0)}M</p>
          </div>
          <Building2 className="w-10 h-10 text-accent/20 group-hover:text-accent/40 transition-colors" />
        </div>
      </div>

      <div className="p-10 rounded-[2.5rem] bg-primary text-primary-foreground flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden transition-all">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <TrendingDown className="w-64 h-64" />
        </div>
        <div className="space-y-2 relative z-10 text-center md:text-left">
          <p className="text-sm font-black uppercase tracking-[0.4em] text-accent">Cumulative Site Financial Impact</p>
          <h3 className="text-6xl font-headline font-black tracking-tighter tabular-nums">NTD {formatNum(totalLoss)}M</h3>
        </div>
      </div>
    </div>
  );
}
