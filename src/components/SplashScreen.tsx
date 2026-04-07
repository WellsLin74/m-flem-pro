'use client';

import { useState, useEffect } from 'react';
import Shield from 'lucide-react/dist/esm/icons/shield';

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    // Stage 1: Visible with animation for 2 seconds
    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 2000);

    // Stage 2: Remove from DOM after fade-out transition (500ms)
    const removeTimeout = setTimeout(() => {
      setShouldRender(false);
    }, 2500);

    return () => {
      clearTimeout(hideTimeout);
      clearTimeout(removeTimeout);
    };
  }, []);

  if (!shouldRender) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-primary to-[#051125] transition-opacity duration-500 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Glow Backdrop */}
        <div className="absolute inset-0 bg-accent/20 blur-[60px] rounded-full scale-150 animate-pulse" />
        
        {/* Logo Icon */}
        <div className="relative mb-8 animate-splash-logo">
          <Shield className="w-24 h-24 text-accent fill-accent/10" strokeWidth={1.5} />
        </div>

        {/* Brand Text */}
        <div className="flex flex-col items-center space-y-2 text-center z-10">
          <h1 className="text-4xl font-black text-white tracking-[0.3em] uppercase animate-splash-text">
            M-FLEM PRO
          </h1>
          <p className="text-[10px] font-bold text-accent/60 tracking-[0.6em] uppercase translate-y-4 opacity-0 animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-700 fill-mode-forwards">
            Precision Modeling
          </p>
        </div>
      </div>

      {/* Modern Loading Indicator (Subtle) */}
      <div className="absolute bottom-16 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-accent w-1/3 rounded-full animate-[loading-progress_2s_ease-in-out_infinite]" />
      </div>

      <style jsx>{`
        @keyframes loading-progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
