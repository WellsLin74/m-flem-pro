'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Layers, Percent, ChevronRight, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

export function Step4Refinement() {
  const { plant, refinement, setRefinement, setStep } = useAppStore();
  
  const [facCrRatio, setFacCrRatio] = useState(refinement?.facCrRatio ?? 0.75);
  const [toolsCrRatio, setToolsCrRatio] = useState(refinement?.toolsCrRatio ?? 0.95);
  const [floorData, setFloorData] = useState<Record<string, { fac: number; cr: number }>>(
    refinement?.floorData || {}
  );

  const floors = useMemo(() => {
    const list: string[] = [];
    if (!plant) return list;

    // FAB Floors
    for (let i = plant.fabBl; i >= 1; i--) list.push(`FAB-BL${i}0`);
    for (let j = 1; j <= plant.fabAl; j++) list.push(`FAB-L${j}0`);
    
    // CUP Floors
    for (let i = plant.cupBl; i >= 1; i--) list.push(`CUP-BL${i}0`);
    for (let j = 1; j <= plant.cupAl; j++) list.push(`CUP-L${j}0`);
    
    return list;
  }, [plant]);

  useEffect(() => {
    if (Object.keys(floorData).length === 0 || Object.keys(floorData).length !== floors.length) {
      const initial: Record<string, { fac: number; cr: number }> = { ...floorData };
      floors.forEach(f => {
        if (!initial[f]) {
          const isBasement = f.includes('BL');
          initial[f] = { 
            fac: 1, 
            cr: isBasement ? 0.2 : 1.0 // Lower cleanroom probability in basements
          };
        }
      });
      setFloorData(initial);
    }
  }, [floors]);

  const handleUpdate = (floor: string, type: 'fac' | 'cr', value: string) => {
    const num = parseFloat(value) || 0;
    setFloorData(prev => ({
      ...prev,
      [floor]: { ...prev[floor], [type]: num }
    }));
  };

  const handleNext = () => {
    setRefinement({ facCrRatio, toolsCrRatio, floorData });
    setStep(5);
  };

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
      <div className="h-2 bg-accent w-full" />
      <CardHeader>
        <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
          <Layers className="w-6 h-6 text-accent" /> Spatial Value Distribution
        </CardTitle>
        <CardDescription>Refine cleanroom occupancy ratios across the vertical profiles of FAB and CUP.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4 p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <h3 className="font-headline font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
              <Percent className="w-4 h-4" /> Global Control Ratios
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Facility Cleanroom Ratio</Label>
                <Input 
                  type="number" step="0.01" 
                  value={facCrRatio} 
                  onChange={(e) => setFacCrRatio(parseFloat(e.target.value) || 0)}
                  className="bg-white border-none font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Tools Cleanroom Ratio</Label>
                <Input 
                  type="number" step="0.01" 
                  value={toolsCrRatio} 
                  onChange={(e) => setToolsCrRatio(parseFloat(e.target.value) || 0)}
                  className="bg-white border-none font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-headline font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4" /> Vertical Distribution Matrix
            </h3>
            <div className="border rounded-xl bg-white overflow-hidden shadow-sm h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Building-Floor</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Facility Part</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">CR Part</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {floors.map(floor => (
                    <TableRow key={floor} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-[10px] font-bold py-2">
                        <Badge variant={floor.includes('BL') ? 'secondary' : (floor.startsWith('FAB') ? 'default' : 'outline')} className="rounded-md text-[9px]">
                          {floor}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <Input 
                          type="number" step="0.1" 
                          value={floorData[floor]?.fac || 0}
                          onChange={(e) => handleUpdate(floor, 'fac', e.target.value)}
                          className="h-8 border-none bg-muted/30 font-mono text-xs"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input 
                          type="number" step="0.1" 
                          value={floorData[floor]?.cr || 0}
                          onChange={(e) => handleUpdate(floor, 'cr', e.target.value)}
                          className="h-8 border-none bg-muted/30 font-mono text-xs"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="ghost" onClick={() => setStep(3)} className="font-bold text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" /> Data Init
          </Button>
          <Button 
            onClick={handleNext}
            className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 text-lg gap-2 shadow-lg shadow-primary/20"
          >
            Calculate Ratios <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
