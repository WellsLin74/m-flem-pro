'use client';

import { useAppStore, FinalRatio } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertTriangle, ChevronRight, ArrowLeft, ShieldCheck, RefreshCw, Loader2, Info } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step5Validation() {
  const { plant, refinement, setFinalRatios, setIsValidated, isValidated, setStep } = useAppStore();
  const [localRatios, setLocalRatios] = useState<Record<string, FinalRatio>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const db = useFirestore();

  // Firestore Listeners
  const ratioDocRef = useMemoFirebase(() => {
    if (!plant?.id) return null;
    return doc(db, 'building_value_ratios', plant.id);
  }, [db, plant?.id]);
  const { data: remoteStatus, isLoading: loadingStatus } = useDoc(ratioDocRef);

  const floorRatiosColRef = useMemoFirebase(() => {
    if (!plant?.id) return null;
    return collection(db, 'building_value_ratios', plant.id, 'floor_ratios');
  }, [db, plant?.id]);
  const { data: remoteFloorRatios, isLoading: loadingCol } = useCollection(floorRatiosColRef);

  const allFloors = useMemo(() => {
    const list: string[] = [];
    if (!plant) return list;
    for (let i = plant.fabBl; i >= 1; i--) list.push(`FAB-BL${i}0`);
    for (let j = 1; j <= plant.fabAl; j++) list.push(`FAB-L${j}0`);
    for (let i = plant.cupBl; i >= 1; i--) list.push(`CUP-BL${i}0`);
    for (let j = 1; j <= plant.cupAl; j++) list.push(`CUP-L${j}0`);
    return list;
  }, [plant]);

  const generateSuggestions = useCallback(() => {
    if (!plant || !refinement) return {};
    
    const fabFloorArea = plant.fabLength * plant.fabWidth;
    const cupFloorArea = plant.cupLength * plant.cupWidth;
    const siteTotalArea = (fabFloorArea * (plant.fabAl + plant.fabBl)) + (cupFloorArea * (plant.cupAl + plant.cupBl));

    const suggestions: Record<string, FinalRatio> = {};
    const fabFloorsList = allFloors.filter(f => f.startsWith('FAB'));

    allFloors.forEach(f => {
      const isFab = f.startsWith('FAB');
      const floorArea = isFab ? fabFloorArea : cupFloorArea;
      
      suggestions[f] = {
        bldg: siteTotalArea > 0 ? floorArea / siteTotalArea : 0,
        fac: siteTotalArea > 0 ? floorArea / siteTotalArea : 0,
        tool: isFab ? (1.0 / fabFloorsList.length) : 0,
        fix: isFab ? (1.0 / fabFloorsList.length) : 0,
        stock: f === 'FAB-L10' ? 1.0 : 0.0
      };
    });

    return suggestions;
  }, [plant, refinement, allFloors]);

  // Unified Hydration Phase
  useEffect(() => {
    if (!isHydrated && !loadingStatus && !loadingCol) {
      if (remoteFloorRatios && remoteFloorRatios.length > 0) {
        const mapped: Record<string, FinalRatio> = {};
        allFloors.forEach(f => {
          const remoteData = remoteFloorRatios.find(r => r.floorIdentifier === f);
          mapped[f] = {
            bldg: remoteData?.buildingRatio ?? 0,
            fac: remoteData?.facilityRatio ?? 0,
            tool: remoteData?.toolsRatio ?? 0,
            fix: remoteData?.fixtureRatio ?? 0,
            stock: remoteData?.stockRatio ?? 0,
          };
        });
        setLocalRatios(mapped);
        setFinalRatios(mapped);
        if (remoteStatus?.validationStatus === 'VALIDATED') setIsValidated(true);
      } else {
        const suggested = generateSuggestions();
        setLocalRatios(suggested);
        setFinalRatios(suggested);
        setIsValidated(false);
      }
      setIsHydrated(true);
    }
  }, [isHydrated, loadingStatus, loadingCol, remoteFloorRatios, remoteStatus, allFloors, generateSuggestions, setFinalRatios, setIsValidated]);

  const handleUpdate = (floor: string, field: keyof FinalRatio, value: string) => {
    const num = parseFloat(value) || 0;
    setLocalRatios(prev => ({
      ...prev,
      [floor]: { ...prev[floor], [field]: num }
    }));
    setIsValidated(false);
  };

  const sums = useMemo(() => {
    return Object.values(localRatios).reduce((acc, r) => ({
      bldg: acc.bldg + (r.bldg || 0),
      fac: acc.fac + (r.fac || 0),
      tool: acc.tool + (r.tool || 0),
      fix: acc.fix + (r.fix || 0),
      stock: acc.stock + (r.stock || 0)
    }), { bldg: 0, fac: 0, tool: 0, fix: 0, stock: 0 });
  }, [localRatios]);

  const validate = () => {
    const isOk = Math.abs(sums.bldg - 1) < 0.001 && 
                 Math.abs(sums.fac - 1) < 0.001 && 
                 Math.abs(sums.tool - 1) < 0.001 && 
                 Math.abs(sums.fix - 1) < 0.001 &&
                 sums.stock <= 1.0001;
    
    setIsValidated(isOk);
    if (isOk && plant?.id) {
      setFinalRatios(localRatios);
      
      const mainRef = doc(db, 'building_value_ratios', plant.id);
      setDocumentNonBlocking(mainRef, {
        id: plant.id,
        companyName: plant.company,
        plantName: plant.plantName,
        validationStatus: 'VALIDATED',
      }, { merge: true });

      Object.entries(localRatios).forEach(([fId, rats]) => {
        const fRef = doc(db, 'building_value_ratios', plant.id, 'floor_ratios', fId);
        setDocumentNonBlocking(fRef, {
          id: fId,
          floorIdentifier: fId,
          buildingRatio: rats.bldg,
          facilityRatio: rats.fac,
          toolsRatio: rats.tool,
          fixtureRatio: rats.fix,
          stockRatio: rats.stock,
          companyName: plant.company,
          plantName: plant.plantName,
        }, { merge: true });
      });
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="font-black text-primary uppercase tracking-[0.2em] animate-pulse">
          Auditing Financial Matrix...
        </p>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-white/90 backdrop-blur-md overflow-hidden">
      <div className="h-2 bg-accent w-full" />
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-6">
        <div className="space-y-1">
          <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-accent" /> Asset Distribution Matrix
          </CardTitle>
          <CardDescription className="font-medium">Verify financial distribution sums for {plant?.plantName} site segments.</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsHydrated(false)} 
          className="gap-2 font-bold border-primary/20 text-primary hover:bg-primary/5"
        >
          <RefreshCw className="w-3 h-3" /> Sync Database
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pb-10 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isValidated ? (
            <Alert variant="destructive" className="bg-destructive/10 text-destructive border-none shadow-sm">
              <AlertTriangle className="h-5 w-5" />
              <div className="ml-2">
                <AlertTitle className="font-black text-sm uppercase">Audit Required</AlertTitle>
                <AlertDescription className="text-xs font-bold opacity-80">
                  Asset columns must sum to exactly 1.0000. Current matrix is out of balance.
                </AlertDescription>
              </div>
            </Alert>
          ) : (
            <Alert className="bg-emerald-50 text-emerald-700 border-none shadow-sm">
              <CheckCircle2 className="h-5 w-5" />
              <div className="ml-2">
                <AlertTitle className="font-black text-sm uppercase">Matrix Integrity Verified</AlertTitle>
                <AlertDescription className="text-xs font-bold opacity-80">
                  Financial distribution is audited across all site vertical segments.
                </AlertDescription>
              </div>
            </Alert>
          )}
          <Alert className="bg-primary/5 text-primary border-none shadow-sm">
            <Info className="h-5 w-5 text-accent" />
            <div className="ml-2">
              <AlertTitle className="font-black text-sm uppercase">System Guidance</AlertTitle>
              <AlertDescription className="text-xs font-bold opacity-80">
                Blue rows indicate CUP facilities. Input percentages as decimals (e.g. 0.25).
              </AlertDescription>
            </div>
          </Alert>
        </div>

        <div className="border rounded-2xl overflow-hidden shadow-2xl bg-white">
          <div className="max-h-[550px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/80 backdrop-blur-sm sticky top-0 z-20 shadow-md">
                <TableRow className="border-b-2 border-primary/10">
                  <TableHead className="w-[140px] text-[11px] font-black uppercase text-primary bg-muted/50">Floor Identifier</TableHead>
                  <TableHead className="text-[11px] font-black uppercase text-right text-primary">Building %</TableHead>
                  <TableHead className="text-[11px] font-black uppercase text-right text-primary">Facility %</TableHead>
                  <TableHead className="text-[11px] font-black uppercase text-right text-primary">Tools %</TableHead>
                  <TableHead className="text-[11px] font-black uppercase text-right text-primary">Fixture %</TableHead>
                  <TableHead className="text-[11px] font-black uppercase text-right text-primary">Stock %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allFloors.map(floor => (
                  <TableRow 
                    key={floor} 
                    className={`hover:bg-accent/5 transition-colors ${floor.startsWith('CUP') ? 'bg-blue-50/40' : ''}`}
                  >
                    <TableCell className="font-mono text-[11px] font-black py-3 border-r bg-muted/5">{floor}</TableCell>
                    <TableCell className="py-1 px-2 border-r">
                      <Input 
                        type="number" step="0.0001"
                        value={localRatios[floor]?.bldg ?? 0}
                        onChange={(e) => handleUpdate(floor, 'bldg', e.target.value)}
                        className="h-8 border-none bg-transparent font-mono text-xs text-right font-black focus-visible:bg-white focus-visible:ring-1"
                        suppressHydrationWarning
                      />
                    </TableCell>
                    <TableCell className="py-1 px-2 border-r">
                      <Input 
                        type="number" step="0.0001"
                        value={localRatios[floor]?.fac ?? 0}
                        onChange={(e) => handleUpdate(floor, 'fac', e.target.value)}
                        className="h-8 border-none bg-transparent font-mono text-xs text-right font-black focus-visible:bg-white focus-visible:ring-1"
                        suppressHydrationWarning
                      />
                    </TableCell>
                    <TableCell className="py-1 px-2 border-r">
                      <Input 
                        type="number" step="0.0001"
                        value={localRatios[floor]?.tool ?? 0}
                        onChange={(e) => handleUpdate(floor, 'tool', e.target.value)}
                        className="h-8 border-none bg-transparent font-mono text-xs text-right font-black focus-visible:bg-white focus-visible:ring-1"
                        suppressHydrationWarning
                      />
                    </TableCell>
                    <TableCell className="py-1 px-2 border-r">
                      <Input 
                        type="number" step="0.0001"
                        value={localRatios[floor]?.fix ?? 0}
                        onChange={(e) => handleUpdate(floor, 'fix', e.target.value)}
                        className="h-8 border-none bg-transparent font-mono text-xs text-right font-black focus-visible:bg-white focus-visible:ring-1"
                        disabled={floor.startsWith('CUP')}
                        suppressHydrationWarning
                      />
                    </TableCell>
                    <TableCell className="py-1 px-2">
                      <Input 
                        type="number" step="0.0001"
                        value={localRatios[floor]?.stock ?? 0}
                        onChange={(e) => handleUpdate(floor, 'stock', e.target.value)}
                        className="h-8 border-none bg-transparent font-mono text-xs text-right font-black focus-visible:bg-white focus-visible:ring-1"
                        suppressHydrationWarning
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-primary/95 text-primary-foreground sticky bottom-0 z-20 font-black border-t-2 border-accent">
                <TableRow className="hover:bg-primary/95">
                  <TableCell className="text-[11px] uppercase tracking-widest border-r">Cumulative Total</TableCell>
                  <TableCell className={`text-right font-mono text-xs px-4 border-r ${Math.abs(sums.bldg - 1) < 0.001 ? 'text-accent' : 'text-destructive-foreground underline'}`}>
                    {sums.bldg.toFixed(4)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs px-4 border-r ${Math.abs(sums.fac - 1) < 0.001 ? 'text-accent' : 'text-destructive-foreground underline'}`}>
                    {sums.fac.toFixed(4)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs px-4 border-r ${Math.abs(sums.tool - 1) < 0.001 ? 'text-accent' : 'text-destructive-foreground underline'}`}>
                    {sums.tool.toFixed(4)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs px-4 border-r ${Math.abs(sums.fix - 1) < 0.001 ? 'text-accent' : 'text-destructive-foreground underline'}`}>
                    {sums.fix.toFixed(4)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs px-4 ${sums.stock <= 1.0001 ? 'text-accent' : 'text-destructive-foreground underline'}`}>
                    {sums.stock.toFixed(4)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>

        <div className="flex justify-between items-center pt-8 border-t">
          <Button 
            variant="ghost" 
            onClick={() => setStep(4)} 
            className="font-bold text-muted-foreground gap-2 hover:bg-primary/5 transition-all"
          >
            <ArrowLeft className="w-5 h-5" /> Spatial Refinement
          </Button>
          <div className="flex gap-4">
            <Button 
              variant="outline"
              onClick={validate}
              className="border-2 border-primary text-primary font-black hover:bg-primary hover:text-white px-8 h-12 rounded-xl transition-all active:scale-95"
            >
              Run Audit & Lock
            </Button>
            <Button 
              disabled={!isValidated}
              onClick={() => setStep(6)}
              className="bg-primary hover:bg-primary/90 text-white font-black px-12 h-12 rounded-xl gap-2 shadow-xl shadow-primary/20 transition-all hover:translate-x-1 disabled:opacity-40 disabled:translate-x-0"
            >
              Risk Analysis <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
