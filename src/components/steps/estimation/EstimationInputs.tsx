'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EstimationInputsProps {
  fabL10Height: number;
  cupL10Height: number;
  floodHeight: number;
  setFloodHeight: (val: number) => void;
  onCalculate: () => void;
}

export function EstimationInputs({
  fabL10Height,
  cupL10Height,
  floodHeight,
  setFloodHeight,
  onCalculate
}: EstimationInputsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
      <div className="flex flex-col items-center justify-center p-4 bg-white/60 rounded-2xl border border-primary/5 shadow-sm text-center space-y-2">
        <Label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">FAB L10 Height Benchmark</Label>
        <span className="font-mono text-2xl font-black text-primary">{fabL10Height} m</span>
      </div>
      <div className="flex flex-col items-center justify-center p-4 bg-white/60 rounded-2xl border border-primary/5 shadow-sm text-center space-y-2">
        <Label className="text-[10px] font-black text-primary-foreground bg-primary px-2 py-0.5 rounded uppercase tracking-[0.2em] w-fit">CUP L10 Height Benchmark</Label>
        <span className="font-mono text-2xl font-black text-primary">{cupL10Height} m</span>
      </div>
      <div className="space-y-3 text-center">
        <Label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Flood Height AGL (m)</Label>
        <Input 
          type="number" step="0.1" 
          value={floodHeight || ''} 
          onChange={(e) => setFloodHeight(parseFloat(e.target.value) || 0)}
          className="bg-white border-2 border-accent/30 font-mono text-xl font-black text-accent text-center h-14 rounded-xl"
        />
      </div>
      <Button 
        onClick={onCalculate} 
        className="md:col-span-3 bg-primary hover:bg-primary/90 text-white font-black py-8 text-xl rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
      >
        Execute Analysis Engine
      </Button>
    </div>
  );
}
