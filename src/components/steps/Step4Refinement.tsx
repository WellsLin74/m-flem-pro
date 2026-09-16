'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Layers from 'lucide-react/dist/esm/icons/layers';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import RefreshCcw from 'lucide-react/dist/esm/icons/refresh-ccw';
import Lock from 'lucide-react/dist/esm/icons/lock';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Save from 'lucide-react/dist/esm/icons/save';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { doc, collection, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function Step4Refinement() {
  const { plant, refinement, setRefinement, setStep, user } = useAppStore();
  const db = useFirestore();
  const { toast } = useToast();
  const isReader = user?.role === 'READER';
  
  const [facCrRatio, setFacCrRatio] = useState(refinement?.facCrRatio ?? 0.33);
  const [toolsCrRatio, setToolsCrRatio] = useState(refinement?.toolsCrRatio ?? 0.9);
  const [floorData, setFloorData] = useState<Record<string, { fac: number; cr: number }>>(() => {
    return refinement?.floorData ? { ...refinement.floorData } : {};
  });
  const [isHydrated, setIsHydrated] = useState(() => {
    return Boolean(refinement?.floorData && Object.keys(refinement.floorData).length > 0);
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoBalance, setAutoBalance] = useState(true);

  const isBasementFloor = (floor: string) => floor.includes('BL');

  const fabFloorArea = useMemo(() => {
    return (plant?.fabLength || 0) * (plant?.fabWidth || 0);
  }, [plant?.fabLength, plant?.fabWidth]);

  const fabFloors = useMemo(() => {
    const list: string[] = [];
    if (!plant) return list;
    for (let i = plant.fabBl; i >= 1; i--) list.push(`FAB-BL${i}0`);
    for (let j = 1; j <= plant.fabAl; j++) list.push(`FAB-L${j}0`);
    return list;
  }, [plant]);

  const totalCalculatedFabArea = useMemo(() => {
    return fabFloors.reduce((total, floor) => {
      const rowSum = (floorData[floor]?.fac ?? 0) + (floorData[floor]?.cr ?? 0);
      return total + (rowSum * fabFloorArea);
    }, 0);
  }, [fabFloors, floorData, fabFloorArea]);

  const loadSpatialData = useCallback(async (forceRemote = false) => {
    if (!plant?.id) return;

    if (!forceRemote && refinement && Object.keys(refinement.floorData || {}).length > 0) {
      setFacCrRatio(refinement.facCrRatio ?? 0.33);
      setToolsCrRatio(refinement.toolsCrRatio ?? 0.9);
      setFloorData({ ...refinement.floorData });
      setIsHydrated(true);
      return;
    }

    setIsHydrated(false);
    try {
      // 1. Fetch main document from fab_cleanroom_occupancy
      const mainDocRef = doc(db, 'fab_cleanroom_occupancy', plant.id);
      const mainSnap = await getDoc(mainDocRef);

      let loadedFacCr = 0.33;
      let loadedToolsCr = 0.9;
      let loadedFloors: Record<string, { fac: number; cr: number }> = {};
      let hasFloorDataInMain = false;

      if (mainSnap.exists()) {
        const mainData = mainSnap.data();
        if (mainData.overallFacilityCleanroomRatio !== undefined) {
          loadedFacCr = mainData.overallFacilityCleanroomRatio;
        }
        if (mainData.overallToolsCleanroomRatio !== undefined) {
          loadedToolsCr = mainData.overallToolsCleanroomRatio;
        }
        if (mainData.floorData && typeof mainData.floorData === 'object' && Object.keys(mainData.floorData).length > 0) {
          loadedFloors = { ...mainData.floorData };
          hasFloorDataInMain = true;
        }
      }

      // 2. If floorData was not in main document, read subcollection floor_ratios
      if (!hasFloorDataInMain) {
        try {
          const subColRef = collection(db, 'fab_cleanroom_occupancy', plant.id, 'floor_ratios');
          const subSnap = await getDocs(subColRef);
          if (!subSnap.empty) {
            subSnap.forEach(d => {
              const data = d.data();
              const fId = data.floorIdentifier || d.id;
              if (fId) {
                loadedFloors[fId] = {
                  fac: data.facilityOccupancyRatio ?? 0.5,
                  cr: data.cleanroomOccupancyRatio ?? 0.5
                };
              }
            });
          }
        } catch (subErr) {
          console.warn('Could not read floor_ratios subcollection:', subErr);
        }
      }

      // 3. For any floors defined in plant that don't have saved data, fill with standard defaults
      fabFloors.forEach(f => {
        if (!loadedFloors[f]) {
          const isBasement = isBasementFloor(f);
          loadedFloors[f] = {
            fac: isBasement ? 1.0 : 0.5,
            cr: isBasement ? 0.0 : 0.5
          };
        }
      });

      setFacCrRatio(loadedFacCr);
      setToolsCrRatio(loadedToolsCr);
      setFloorData(loadedFloors);
      setRefinement({
        facCrRatio: loadedFacCr,
        toolsCrRatio: loadedToolsCr,
        floorData: loadedFloors
      });
      setIsHydrated(true);
    } catch (err) {
      console.error('Failed to load spatial data from database:', err);
      const defaultFloors: Record<string, { fac: number; cr: number }> = {};
      fabFloors.forEach(f => {
        const isBasement = isBasementFloor(f);
        defaultFloors[f] = {
          fac: isBasement ? 1.0 : 0.5,
          cr: isBasement ? 0.0 : 0.5
        };
      });
      setFloorData(defaultFloors);
      setIsHydrated(true);
    }
  }, [plant?.id, fabFloors, refinement, setRefinement, db]);

  useEffect(() => {
    loadSpatialData(false);
  }, [plant?.id]);

  const saveToFirestore = async (
    targetFloorData = floorData,
    targetFacCr = facCrRatio,
    targetToolsCr = toolsCrRatio
  ) => {
    if (!plant?.id || isReader) return false;
    setIsSaving(true);
    try {
      // 1. Sync store immediately
      setRefinement({
        facCrRatio: targetFacCr,
        toolsCrRatio: targetToolsCr,
        floorData: targetFloorData
      });

      // 2. Save main document with full floorData dictionary (atomic write)
      const mainRef = doc(db, 'fab_cleanroom_occupancy', plant.id);
      await setDoc(mainRef, {
        id: plant.id,
        companyName: plant.company,
        plantName: plant.plantName,
        overallFacilityCleanroomRatio: targetFacCr,
        overallToolsCleanroomRatio: targetToolsCr,
        floorData: targetFloorData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 3. Save subcollection for complete backwards compatibility
      const subPromises = Object.entries(targetFloorData).map(([fId, ratios]) => {
        const fRef = doc(db, 'fab_cleanroom_occupancy', plant.id, 'floor_ratios', fId);
        return setDoc(fRef, {
          id: fId,
          floorIdentifier: fId,
          facilityOccupancyRatio: ratios.fac,
          cleanroomOccupancyRatio: ratios.cr,
          companyName: plant.company,
          plantName: plant.plantName,
        }, { merge: true });
      });
      await Promise.all(subPromises);

      return true;
    } catch (err: any) {
      console.error('Error saving spatial refinement:', err);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: err.message || "Failed to persist data to database."
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = (floor: string, type: 'fac' | 'cr', value: string) => {
    if (isReader) return;
    let num = parseFloat(value) || 0;
    
    if (num < 0) num = 0;
    if (num > 1) num = 1;
    
    const isBasement = isBasementFloor(floor);
    const siblingType = type === 'fac' ? 'cr' : 'fac';
    const siblingVal = (autoBalance && !isBasement) 
      ? Number((1 - num).toFixed(4)) 
      : (floorData[floor]?.[siblingType] ?? (isBasement ? (siblingType === 'fac' ? 1.0 : 0.0) : 0.5));

    const updated = {
      ...floorData,
      [floor]: { 
        ...floorData[floor], 
        [type]: num,
        [siblingType]: siblingVal
      }
    };

    setFloorData(updated);
    setRefinement({ facCrRatio, toolsCrRatio, floorData: updated });
    setError(null);
  };

  const handleFacCrChange = (val: number) => {
    setFacCrRatio(val);
    setRefinement({ facCrRatio: val, toolsCrRatio, floorData });
  };

  const handleToolsCrChange = (val: number) => {
    setToolsCrRatio(val);
    setRefinement({ facCrRatio, toolsCrRatio: val, floorData });
  };

  const validateMatrix = () => {
    for (const floor of fabFloors) {
      if (isBasementFloor(floor)) continue;
      const data = floorData[floor];
      const sum = (data?.fac || 0) + (data?.cr || 0);
      if (Math.abs(sum - 1) > 0.0001) {
        return `Validation Failed: Floor ${floor} total occupancy must be exactly 1.0 (Current: ${sum.toFixed(4)}). Please balance Facility and Cleanroom ratios.`;
      }
    }
    return null;
  };

  const handleNext = async () => {
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

    const saved = await saveToFirestore();
    if (saved) {
      toast({
        title: "Spatial Intel Saved",
        description: `Refinement parameters verified and saved for ${plant.plantName}.`
      });
    }
    setStep(5);
  };

  const handleBack = () => {
    // Retain user edits in Zustand store
    setRefinement({ facCrRatio, toolsCrRatio, floorData });
    if (!isReader && plant?.id) {
      saveToFirestore(floorData, facCrRatio, toolsCrRatio);
    }
    setStep(3);
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
          <CardDescription>Define how space is divided between Facility and Cleanroom on each FAB floor for {plant?.plantName}.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {!isReader && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={async () => {
                const ok = await saveToFirestore();
                if (ok) {
                  toast({
                    title: "Spatial Data Saved",
                    description: "Current floor ratios successfully saved to database."
                  });
                }
              }}
              disabled={isSaving}
              className="gap-2 font-bold text-xs border-accent/40 text-accent hover:bg-accent/10"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save Changes
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => loadSpatialData(true)}
            disabled={isSaving}
            className="gap-2 font-bold text-xs"
          >
            <RefreshCcw className="w-3 h-3" /> Force Remote Sync
          </Button>
        </div>
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
              Ratio Constraints
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed uppercase">
              Each above-ground row in the FAB Matrix must sum to exactly 1.0. Basement floors (BL10, BL20...) are exempt.
            </p>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Fac-CR Ratio (0-1)</Label>
                <Input 
                  type="number" step="0.01" 
                  value={facCrRatio} 
                  onChange={(e) => handleFacCrChange(parseFloat(e.target.value) || 0)}
                  disabled={isReader}
                  className="bg-white border-none font-mono font-bold"
                  suppressHydrationWarning
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Tools Ratio (0-1)</Label>
                <Input 
                  type="number" step="0.01" 
                  value={toolsCrRatio} 
                  onChange={(e) => handleToolsCrChange(parseFloat(e.target.value) || 0)}
                  disabled={isReader}
                  className="bg-white border-none font-mono font-bold"
                  suppressHydrationWarning
                />
              </div>
              <div className="flex items-center space-x-2 pt-4 border-t border-primary/10">
                <input 
                  type="checkbox" 
                  id="autoBalance"
                  checked={autoBalance}
                  onChange={(e) => setAutoBalance(e.target.checked)}
                  disabled={isReader}
                  className="h-4 w-4 rounded border-primary/20 text-accent focus:ring-accent accent-accent cursor-pointer"
                />
                <Label htmlFor="autoBalance" className="text-xs font-black text-primary cursor-pointer select-none">
                  AUTO-BALANCE (CR = 1 - FAC, ABOVE GROUND)
                </Label>
              </div>
              <div className="pt-3 border-t border-primary/10 space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground font-bold">Standard Single Floor:</span>
                  <span className="font-mono font-bold text-primary">{Math.round(fabFloorArea).toLocaleString()} m²</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground font-bold">Total FAB Area (Calculated):</span>
                  <span className="font-mono font-black text-accent">{Math.round(totalCalculatedFabArea).toLocaleString()} m²</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-headline font-bold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4" /> FAB Vertical Distribution Matrix
            </h3>
            <div className="border-2 rounded-2xl bg-white overflow-hidden shadow-2xl h-[450px] flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <Table>
                  <TableHeader className="bg-muted/90 sticky top-0 z-10 shadow-sm border-b-2">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase text-primary px-4">Floor</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-primary text-right px-2">Facility RATIO</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-primary text-right px-2">Cleanroom RATIO</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-primary text-right px-2">Row Sum</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-primary text-right px-4">Est. Area (m²)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fabFloors.map(floor => {
                      const isBasement = isBasementFloor(floor);
                      const rowSum = (floorData[floor]?.fac ?? 0) + (floorData[floor]?.cr ?? 0);
                      const isInvalid = !isBasement && Math.abs(rowSum - 1) > 0.0001;
                      return (
                        <TableRow key={floor} className={`hover:bg-accent/5 transition-colors ${isInvalid ? 'bg-destructive/5' : ''}`}>
                          <TableCell className="py-3 px-4">
                            <Badge variant={isBasement ? 'secondary' : 'default'} className="rounded-md font-mono text-[10px] font-black">
                              {floor}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 px-2">
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
                          <TableCell className="py-2 px-2">
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
                          <TableCell className={`py-2 px-2 text-right font-mono text-xs font-black ${
                            isBasement ? 'text-muted-foreground' : isInvalid ? 'text-destructive' : 'text-emerald-600'
                          }`}>
                            {rowSum.toFixed(4)}
                            {isBasement && <span className="text-[9px] ml-1 font-bold text-muted-foreground/70">(BS)</span>}
                          </TableCell>
                          <TableCell className="py-2 px-4 text-right font-mono text-xs font-black text-primary">
                            {Math.round(rowSum * fabFloorArea).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center px-6 py-3 bg-muted/40 border-t-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-primary">
                  Total Calculated FAB Area (Step 4 Sum)
                </span>
                <span className="font-mono font-black text-sm text-accent">
                  {Math.round(totalCalculatedFabArea).toLocaleString()} m²
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 pt-6 border-t">
          <Button variant="ghost" onClick={handleBack} className="w-full sm:w-auto font-bold text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" /> Physical Data
          </Button>
          <Button 
            onClick={handleNext}
            disabled={isSaving}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-black h-auto whitespace-normal py-4 sm:px-12 sm:py-6 text-sm sm:text-lg gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Saving & Validating...
              </>
            ) : (
              <>
                {isReader ? 'Next: Validation' : 'Audit & Confirm Spatial Matrix'} <ChevronRight className="w-5 h-5 flex-shrink-0" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
