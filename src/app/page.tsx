'use client';

import { Navigation } from '@/components/Navigation';
import { Wizard } from '@/components/Wizard';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow flex flex-col">
        <Wizard />
      </main>
      <footer className="py-6 border-t bg-white/50 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          © 2024 M-FLEM Industrial • Advanced Flood Loss Estimation Matrix
        </p>
      </footer>
    </div>
  );
}