'use client';

import { Navigation } from '@/components/Navigation';
import { Wizard } from '@/components/Wizard';
import { SplashScreen } from '@/components/SplashScreen';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <SplashScreen />
      <Navigation />
      <main className="flex-1">
        <Wizard />
      </main>
      <footer className="py-6 border-t bg-white/50 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          © 2026 Marsh Flood Loss Estimation Model
        </p>
      </footer>
    </div>
  );
}