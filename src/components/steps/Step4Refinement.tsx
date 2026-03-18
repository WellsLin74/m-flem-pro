'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Layers, Percent, ChevronRight, ArrowLeft, Loader2, RefreshCcw, Lock, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step4Refinement() {
  const { plant, setRefinement, setStep, user } = useAppStore();
  const db = useFirestore();
  const isReader = user?.role === 'READER';
  
  const [facCrRatio, setFacCrRatio] = useState(0.33);
  const [toolsCrRatio, setToolsCrRatio] = useState(0.9);
  const [floorData, setFloorData] = useState<Record<string, { fac: number; cr: number }>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const occupancyRef = useMemoFirebase(() => {
    if (!plant?.id) return null;
    return doc(db, 'fab_cleanroom_occupancy', plant.id);
  }, [db, plant?.id]);
  const { data: remoteOccupancy, isLoading: loadingRemote } = useDoc(occupancyRef);

  const floorRatiosRef = useMemoFirebase(() => {
    if (!plant?.id) return null;
    return collection(db, 'fab_cleanroom_occupancy', plant.id, 'floor_ratios');
  }, [db, plant?.id]);
  const { data: remoteFloorRatios, isLoading: loadingFloorRatios } = useCollection(floorRatiosRef);

  const fabFloors = useMemo(() => {
    const list: string[] = [];
    if (!plant) return list;
    for (let i = plant.fabBl; i >= 1; i--) list.push(`FAB-BL${i}0`);
    for (let j = 1; j <= plant.fabAl; j++) list.push(`FAB-L${j}0`);
    return list;
  }, [plant]);

  useEffect(() => {
    if (!isHydrated && !loadingRemote && !loadingFloorRatios) {
      const mappedFloors: Record<string, { fac: number; cr: number }> = {};
      
      if (remoteOccupancy) {
        setFacCrRatio(remoteOccupancy.overallFacilityCleanroomRatio ?? 0.33);
        setToolsCrRatio(remoteOccupancy.overallToolsCleanroomRatio ?? 0.9);
      }

      fabFloors.forEach(f => {
        const remoteData = remoteFloorRatios?.find(r => r.floorIdentifier === f);
        mappedFloors[f] = {
          fac: remoteData?.facilityOccupancyRatio ?? 0.5,
          cr: remoteData?.cleanroomOccupancyRatio ?? 0.5
        };
      });

      setFloorData(mappedFloors);
      setIsHydrated(true);
    }
  }, [loadingRemote, loadingFloorRatios, remoteOccupancy, remoteFloorRatios, fabFloors, isHydrated]);

  const handleUpdate = (floor: string, type: 'fac' | 'cr', value: string) => {
    if (isReader) return;
    let num = parseFloat(value) || 0;
    
    // 限制在 0 ~ 1 之間
    if (num < 0) num = 0;
    if (num > 1) num = 1;
    
    setFloorData(prev => ({
      ...prev,
      [floor]: { ...prev[floor], [type]: num }
    }));
    setError(null);
  };

  /**
   * 嚴格校驗邏輯：單一樓層的 Facility + Cleanroom 必須剛好等於 1.0
   */
  const validateMatrix = () => {
    for (const floor of fabFloors) {
      const data = floorData[floor];
      const sum = (data?.fac || 0) + (data?.cr || 0);
      // 容許極小浮點數誤差
      if (Math.abs(sum - 1) > 0.0001) {
        return `Validation Failed: Floor ${floor} total occupancy must be exactly 1.0 (Current: ${sum.toFixed(4)}). Please balance Facility and Cleanroom ratios.`;
      }
    }
    return null;
  };

  const handleNext = () => {
    const validationError = validateMatrix();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isReader) {
      setStep(5);
      return;
    }

    if (!plant?.id) return;

    setRefinement({ facCrRatio, toolsCrRatio, floorData });

    const mainRef = doc(db, 'fab_cleanroom_occupancy', plant.id);
    setDocumentNonBlocking(mainRef, {
      id: plant.id,
      companyName: plant.company,
      plantName: plant.plantName,
      overallFacilityCleanroomRatio: facCrRatio,
      overallToolsCleanroomRatio: toolsCrRatio,
    }, { merge: true });

    Object.entries(floorData).forEach(([fId, ratios]) => {
      const fRef = doc(db, 'fab_cleanroom_occupancy', plant.id, 'floor_ratios', fId);
      setDocumentNonBlocking(fRef, {
        id: fId,
        floorIdentifier: fId,
        facilityOccupancyRatio: ratios.fac,
        cleanroomOccupancyRatio: ratios.cr,
        companyName: plant.company,
        plantName: plant.plantName,
      }, { merge: true });
    });

    setStep(5);
  };

  if (!isHydrated) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="font-black text-primary uppercase tracking-[0.2em] animate-pulse">
          Synchronizing Spatial Intel...
        </p>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden" suppressHydrationWarning>
      <div className="h-2 bg-accent w-full" />
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
              <Layers className="w-6 h-6 text-accent" /> Spatial Value Distribution
            </CardTitle>
            {isReader && (
              <Badge variant="outline" className="text-muted-foreground gap-1 uppercase font-black text-[9px]">
                <Lock className="w-2 h-2" /> Read Only
              </Badge>
            )}
          </div>
          <CardDescription>Define how space is divided between Facility and Cleanroom on each FAB floor.</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsHydrated(false)}
          className="gap-2 font-bold text-xs"
        >
          <RefreshCcw className="w-3 h-3" /> Force Remote Sync
        </Button>
      </CardHeader>
      <CardContent className="space-y-8 pb-10">
        {error && (
          <Alert variant="destructive" className="bg-destructive/10 text-destructive border-none shadow-lg animate-in shake-1">
            <AlertTriangle className="h-5 w-5" />
            <div className="ml-2">
              <AlertTitle className="font-black text-sm uppercase">Spatial Inconsistency</AlertTitle>
              <AlertDescription className="text-xs font-bold opacity-90">
                {error}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4 p-6 rounded-2xl bg-primary/5 border border-primary/10 h-fit">
            <h3 className="font-headline font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
              <Percent className="w-4 h-4" /> Ratio Constraints
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase">
              Each row in the FAB Matrix must sum to exactly 1.0. This ensures 100% of the floor space is accounted for.
            </p>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Facility Ratio</Label>
                <Input 
                  type="number" step="0.01" 
                  value={facCrRatio} 
                  onChange={(e) => setFacCrRatio(parseFloat(e.target.value) || 0)}
                  disabled={isReader}
                  className="bg-white border-none font-mono font-bold"
                  suppressHydrationWarning
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Tools Ratio</Label>
                <Input 
                  type="number" step="0.01" 
                  value={toolsCrRatio} 
                  onChange={(e) => setToolsCrRatio(parseFloat(e.target.value) || 0)}
                  disabled={isReader}
                  className="bg-white border-none font-mono font-bold"
                  suppressHydrationWarning
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-headline font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4" /> FAB Vertical Distribution Matrix
            </h3>
            <div className="border-2 rounded-2xl bg-white overflow-hidden shadow-2xl h-[450px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-muted/90 sticky top-0 z-10 shadow-sm border-b-2">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase text-primary px-6">Floor Identifier</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-primary text-right px-4">Facility % (0-1)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-primary text-right px-4">Cleanroom % (0-1)</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-primary text-right px-4">Row Sum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fabFloors.map(floor => {
                    const rowSum = (floorData[floor]?.fac ?? 0) + (floorData[floor]?.cr ?? 0);
                    const isInvalid = Math.abs(rowSum - 1) > 0.0001;
                    return (
                      <TableRow key={floor} className={`hover:bg-accent/5 transition-colors ${isInvalid ? 'bg-destructive/5' : ''}`}>
                        <TableCell className="py-3 px-6">
                          <Badge variant={floor.includes('BL') ? 'secondary' : 'default'} className="rounded-md font-mono text-[10px] font-black">
                            {floor}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 px-4">
                          <Input 
                            type="number" step="0.1" 
                            min="0" max="1"
                            value={floorData[floor]?.fac ?? 0}
                            onChange={(e) => handleUpdate(floor, 'fac', e.target.value)}
                            disabled={isReader}
                            className="h-8 border-none bg-muted/30 font-mono text-xs text-right font-black focus-visible:bg-white"
                            suppressHydrationWarning
                          />
                        </TableCell>
                        <TableCell className="py-2 px-4">
                          <Input 
                            type="number" step="0.1" 
                            min="0" max="1"
                            value={floorData[floor]?.cr ?? 0}
                            onChange={(e) => handleUpdate(floor, 'cr', e.target.value)}
                            disabled={isReader}
                            className="h-8 border-none bg-muted/30 font-mono text-xs text-right font-black focus-visible:bg-white"
                            suppressHydrationWarning
                          />
                        </TableCell>
                        <TableCell className={`py-2 px-4 text-right font-mono text-xs font-black ${isInvalid ? 'text-destructive' : 'text-emerald-600'}`}>
                          {rowSum.toFixed(4)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button variant="ghost" onClick={() => setStep(3)} className="font-bold text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" /> Physical Data
          </Button>
          <Button 
            onClick={handleNext}
            className="bg-primary hover:bg-primary/90 text-white font-black px-12 py-6 text-lg gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {isReader ? 'Next: Validation' : 'Audit & Confirm Spatial Matrix'} <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
