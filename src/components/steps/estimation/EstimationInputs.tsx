'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EstimationInputsProps {
  fabL10Height: number;
  setFabL10Height: (val: number) => void;
  cupL10Height: number;
  setCupL10Height: (val: number) => void;
  floodHeight: number;
  setFloodHeight: (val: number) => void;
  onCalculate: () => void;
}

export function EstimationInputs({
  fabL10Height,
  setFabL10Height,
  cupL10Height,
  setCupL10Height,
  floodHeight,
  setFloodHeight,
  onCalculate
}: EstimationInputsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
      <div className="space-y-3 text-center">
        <Label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">FAB L10 Height (m)</Label>
        <Input 
          type="number" step="0.1" 
          value={fabL10Height || ''} 
          onChange={(e) => setFabL10Height(parseFloat(e.target.value) || 0)}
          className="bg-white border-2 border-primary/10 font-mono text-xl font-black text-center h-14 rounded-xl"
        />
      </div>
      <div className="space-y-3 text-center">
        <Label className="text-[10px] font-black text-primary-foreground bg-primary px-2 py-0.5 rounded uppercase tracking-[0.2em]">CUP L10 Height (m)</Label>
        <Input 
          type="number" step="0.1" 
          value={cupL10Height || ''} 
          onChange={(e) => setCupL10Height(parseFloat(e.target.value) || 0)}
          className="bg-white border-2 border-primary/20 font-mono text-xl font-black text-center h-14 rounded-xl"
        />
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
