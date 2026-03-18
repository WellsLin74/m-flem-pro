'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Layers, Percent, ChevronRight, ArrowLeft, Loader2, RefreshCcw } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step4Refinement() {
  const { plant, refinement, setRefinement, setStep } = useAppStore();
  const db = useFirestore();
  
  const [facCrRatio, setFacCrRatio] = useState(0.33);
  const [toolsCrRatio, setToolsCrRatio] = useState(0.9);
  const [floorData, setFloorData] = useState<Record<string, { fac: number; cr: number }>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  // Firestore 實時監聽：主文件
  const occupancyRef = useMemoFirebase(() => {
    if (!plant?.id) return null;
    return doc(db, 'fab_cleanroom_occupancy', plant.id);
  }, [db, plant?.id]);
  const { data: remoteOccupancy, isLoading: loadingRemote } = useDoc(occupancyRef);

  // Firestore 實時監聽：子集合（樓層比例）
  const floorRatiosRef = useMemoFirebase(() => {
    if (!plant?.id) return null;
    return collection(db, 'fab_cleanroom_occupancy', plant.id, 'floor_ratios');
  }, [db, plant?.id]);
  const { data: remoteFloorRatios, isLoading: loadingFloorRatios } = useCollection(floorRatiosRef);

  // 根據 P3 輸入動態生成 FAB 樓層列表
  const fabFloors = useMemo(() => {
    const list: string[] = [];
    if (!plant) return list;
    for (let i = plant.fabBl; i >= 1; i--) list.push(`FAB-BL${i}0`);
    for (let j = 1; j <= plant.fabAl; j++) list.push(`FAB-L${j}0`);
    return list;
  }, [plant]);

  // 核心數據水合邏輯 (Hydration)
  useEffect(() => {
    // 只有在資料庫讀取完成，且尚未進行本地初始化的情況下執行
    if (!isHydrated && !loadingRemote && !loadingFloorRatios) {
      console.log('P4 Hydrating from Firestore...');
      
      const mappedFloors: Record<string, { fac: number; cr: number }> = {};
      
      // 1. 先從 Firestore 恢復主比例
      if (remoteOccupancy) {
        setFacCrRatio(remoteOccupancy.overallFacilityCleanroomRatio ?? 0.33);
        setToolsCrRatio(remoteOccupancy.overallToolsCleanroomRatio ?? 0.9);
      }

      // 2. 恢復各樓層詳細比例
      fabFloors.forEach(f => {
        // 尋找資料庫中是否有對應樓層
        const remoteData = remoteFloorRatios?.find(r => r.floorIdentifier === f);
        mappedFloors[f] = {
          fac: remoteData?.facilityOccupancyRatio ?? 0,
          cr: remoteData?.cleanroomOccupancyRatio ?? 0
        };
      });

      setFloorData(mappedFloors);
      setIsHydrated(true);
    }
  }, [loadingRemote, loadingFloorRatios, remoteOccupancy, remoteFloorRatios, fabFloors, isHydrated]);

  const handleUpdate = (floor: string, type: 'fac' | 'cr', value: string) => {
    const num = parseFloat(value) || 0;
    setFloorData(prev => ({
      ...prev,
      [floor]: { ...prev[floor], [type]: num }
    }));
  };

  const handleNext = () => {
    if (!plant?.id) return;

    const data = { facCrRatio, toolsCrRatio, floorData };
    setRefinement(data);

    // 數據持久化到 Firestore
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

  // 數據尚未載入完成時顯示 Loading 畫面
  if (!isHydrated || loadingRemote || loadingFloorRatios) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="font-black text-primary uppercase tracking-[0.2em] animate-pulse">
          Hydrating Spatial Intelligence...
        </p>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="h-2 bg-accent w-full" />
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
            <Layers className="w-6 h-6 text-accent" /> Spatial Value Distribution
          </CardTitle>
          <CardDescription>Refine cleanroom occupancy ratios across the vertical FAB profile.</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsHydrated(false)} // 強制重新載入
          className="gap-2 font-bold text-xs"
        >
          <RefreshCcw className="w-3 h-3" /> Sync Remote
        </Button>
      </CardHeader>
      <CardContent className="space-y-8 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Global Ratios Section */}
          <div className="space-y-4 p-6 rounded-2xl bg-primary/5 border border-primary/10 h-fit">
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
                  className="bg-white border-none font-mono font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Tools Cleanroom Ratio</Label>
                <Input 
                  type="number" step="0.01" 
                  value={toolsCrRatio} 
                  onChange={(e) => setToolsCrRatio(parseFloat(e.target.value) || 0)}
                  className="bg-white border-none font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Vertical Matrix Section */}
          <div className="space-y-4">
            <h3 className="font-headline font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4" /> FAB Vertical Distribution Matrix
            </h3>
            <div className="border rounded-2xl bg-white overflow-hidden shadow-sm h-[450px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Floor ID</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Facility %</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Cleanroom %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fabFloors.map(floor => (
                    <TableRow key={floor} className="hover:bg-accent/5">
                      <TableCell className="py-2">
                        <Badge variant={floor.includes('BL') ? 'secondary' : 'default'} className="rounded-md font-mono text-[10px]">
                          {floor}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <Input 
                          type="number" step="0.1" 
                          value={floorData[floor]?.fac ?? 0}
                          onChange={(e) => handleUpdate(floor, 'fac', e.target.value)}
                          className="h-8 border-none bg-muted/30 font-mono text-xs text-center font-bold"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input 
                          type="number" step="0.1" 
                          value={floorData[floor]?.cr ?? 0}
                          onChange={(e) => handleUpdate(floor, 'cr', e.target.value)}
                          className="h-8 border-none bg-muted/30 font-mono text-xs text-center font-bold"
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
            Confirm Spatial Refinement <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}