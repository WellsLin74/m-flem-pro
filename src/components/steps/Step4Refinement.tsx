'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Layers, Percent, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step4Refinement() {
  const { plant, refinement, setRefinement, setStep } = useAppStore();
  const db = useFirestore();
  
  const [facCrRatio, setFacCrRatio] = useState(refinement?.facCrRatio ?? 0.33);
  const [toolsCrRatio, setToolsCrRatio] = useState(refinement?.toolsCrRatio ?? 0.9);
  const [floorData, setFloorData] = useState<Record<string, { fac: number; cr: number }>>(
    refinement?.floorData || {}
  );
  // Always start unhydrated to force check Firestore on mount
  const [isHydrated, setIsHydrated] = useState(false);

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

  // Sync Remote Data to Local State
  useEffect(() => {
    // Only hydrate once per component mount and when loading is done
    if (!isHydrated && !loadingRemote && !loadingFloorRatios) {
      if (remoteOccupancy) {
        setFacCrRatio(remoteOccupancy.overallFacilityCleanroomRatio || 0.33);
        setToolsCrRatio(remoteOccupancy.overallToolsCleanroomRatio || 0.9);
      }
      
      const mapped: Record<string, { fac: number; cr: number }> = {};
      // 1. Initialize with defaults or existing local store data
      fabFloors.forEach(f => {
        mapped[f] = floorData[f] || { fac: 0, cr: 0 };
      });

      // 2. Overwrite with remote data if it exists in DB
      if (remoteFloorRatios && remoteFloorRatios.length > 0) {
        remoteFloorRatios.forEach(r => {
          if (mapped[r.floorIdentifier]) {
            mapped[r.floorIdentifier] = {
              fac: r.facilityOccupancyRatio || 0,
              cr: r.cleanroomOccupancyRatio || 0
            };
          }
        });
      }
      
      setFloorData(mapped);
      setIsHydrated(true);
    }
  }, [remoteOccupancy, remoteFloorRatios, loadingRemote, loadingFloorRatios, isHydrated, fabFloors, floorData]);

  const handleUpdate = (floor: string, type: 'fac' | 'cr', value: string) => {
    const num = parseFloat(value) || 0;
    setFloorData(prev => ({
      ...prev,
      [floor]: { ...prev[floor], [type]: num }
    }));
  };

  const handleNext = () => {
    const data = { facCrRatio, toolsCrRatio, floorData };
    setRefinement(data);

    if (plant?.id) {
      const plantId = plant.id;
      const occupancyRef = doc(db, 'fab_cleanroom_occupancy', plantId);
      
      setDocumentNonBlocking(occupancyRef, {
        id: plantId,
        companyName: plant.company,
        plantName: plant.plantName,
        overallFacilityCleanroomRatio: facCrRatio,
        overallToolsCleanroomRatio: toolsCrRatio,
        fabCleanroomFloorRatioIds: Object.keys(floorData),
      }, { merge: true });

      Object.entries(floorData).forEach(([floorId, ratios]) => {
        const floorRef = doc(db, 'fab_cleanroom_occupancy', plantId, 'floor_ratios', floorId);
        setDocumentNonBlocking(floorRef, {
          id: floorId,
          fabCleanroomOccupancyId: plantId,
          floorIdentifier: floorId,
          facilityOccupancyRatio: ratios.fac,
          cleanroomOccupancyRatio: ratios.cr,
          companyName: plant.company,
          plantName: plant.plantName,
        }, { merge: true });
      });
    }

    setStep(5);
  };

  if (!isHydrated) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="font-bold text-primary animate-pulse uppercase tracking-widest">Hydrating Spatial Data...</p>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
      <div className="h-2 bg-accent w-full" />
      <CardHeader>
        <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
          <Layers className="w-6 h-6 text-accent" /> Spatial Value Distribution
        </CardTitle>
        <CardDescription>Refine cleanroom occupancy ratios across the vertical profiles of FAB area only.</CardDescription>
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
              <Layers className="w-4 h-4" /> FAB Vertical Distribution Matrix
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
                  {fabFloors.map(floor => (
                    <TableRow key={floor} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-[10px] font-bold py-2">
                        <Badge variant={floor.includes('BL') ? 'secondary' : 'default'} className="rounded-md text-[9px]">
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
