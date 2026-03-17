'use client';

import { useAppStore, FinalRatio } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertTriangle, ChevronRight, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

export function Step5Validation() {
  const { plant, refinement, finalRatios, setFinalRatios, setIsValidated, isValidated, setStep } = useAppStore();
  const [localRatios, setLocalRatios] = useState<Record<string, FinalRatio>>({});

  const allFloors = useMemo(() => {
    const list: string[] = [];
    if (!plant) return list;
    for (let i = Number(plant.fabBl); i >= 1; i--) list.push(`FAB-BL${i}0`);
    for (let j = 1; j <= Number(plant.fabAl); j++) list.push(`FAB-L${j}0`);
    for (let i = Number(plant.cupBl); i >= 1; i--) list.push(`CUP-BL${i}0`);
    for (let j = 1; j <= Number(plant.cupAl); j++) list.push(`CUP-L${j}0`);
    return list;
  }, [plant]);

  const fabFloors = useMemo(() => allFloors.filter(f => f.startsWith('FAB')), [allFloors]);

  const generateSuggestions = () => {
    if (!plant || !refinement) return;

    const fabL = Number(plant.fabLength);
    const fabW = Number(plant.fabWidth);
    const cupL = Number(plant.cupLength);
    const cupW = Number(plant.cupWidth);
    const fabLevels = Number(plant.fabAl) + Number(plant.fabBl);
    const cupLevels = Number(plant.cupAl) + Number(plant.cupBl);

    const fabFloorArea = fabL * fabW;
    const cupFloorArea = cupL * cupW;
    
    const totalFabArea = fabFloorArea * fabLevels;
    const totalCupArea = cupFloorArea * cupLevels;
    const plantTotalArea = totalFabArea + totalCupArea;

    // Sum weights only from FAB floors
    const totalFabFacSum = Object.keys(refinement.floorData)
      .filter(f => f.startsWith('FAB'))
      .reduce((sum, f) => sum + Number(refinement.floorData[f].fac), 0);
    
    const totalFabCrSum = Object.keys(refinement.floorData)
      .filter(f => f.startsWith('FAB'))
      .reduce((sum, f) => sum + Number(refinement.floorData[f].cr), 0);

    const suggestions: Record<string, FinalRatio> = {};

    /**
     * FACILITY REFINED FORMULA DENOMINATOR:
     * facDenominator = (FAB 總面積 * (1 - 全棟 CR 總權重) + CUP 總面積)
     */
    const facDenominator = (totalFabArea * (1 - totalFabCrSum) + totalCupArea);

    allFloors.forEach(f => {
      const isFab = f.startsWith('FAB');
      const fData = refinement.floorData[f] || { fac: isFab ? 0 : 1, cr: 0 }; 
      const floorArea = isFab ? fabFloorArea : cupFloorArea;
      
      /**
       * FACILITY CALCULATION FORMULA:
       * Fac_Ratio = (Floor_CR / Total_Fab_CR) * Global_Fac_CR_Ratio 
       *             + (Floor_Fac_Weight * Floor_Area / facDenominator) * (1 - Global_Fac_CR_Ratio)
       */
      const facCrPart = totalFabCrSum > 0 ? (Number(fData.cr) / totalFabCrSum) * Number(refinement.facCrRatio) : 0;
      
      // For FAB: Weight is from input. For CUP: Weight is implicitly 1.
      const floorFacWeight = isFab ? Number(fData.fac) : 1;
      const facNonCrPart = facDenominator !== 0 
        ? (floorFacWeight * floorArea / facDenominator) * (1 - Number(refinement.facCrRatio)) 
        : 0;
      
      const calcFac = facCrPart + facNonCrPart;

      /**
       * TOOLS CALCULATION FORMULA:
       * Distributed based on CR and Fac weights within FAB.
       */
      const toolCrPart = totalFabCrSum > 0 ? (Number(fData.cr) / totalFabCrSum) * Number(refinement.toolsCrRatio) : 0;
      const toolNonCrPart = totalFabFacSum > 0 && isFab ? (Number(fData.fac) / totalFabFacSum) * (1 - Number(refinement.toolsCrRatio)) : 0;
      const calcTool = toolCrPart + toolNonCrPart;

      /**
       * BUILDING CALCULATION FORMULA:
       * Ratio = Floor_Area / Plant_Total_Area
       */
      let bldgRatio = plantTotalArea > 0 ? floorArea / plantTotalArea : 0;

      /**
       * FIXTURE CALCULATION FORMULA:
       * Distributed equally among FAB floors only.
       */
      let fixRatio = isFab && fabFloors.length > 0 ? 1.0 / fabFloors.length : 0;

      /**
       * STOCK CALCULATION FORMULA:
       * 100% on FAB-L10 by default.
       */
      const stockRatio = f === 'FAB-L10' ? 1.0 : 0.0;

      suggestions[f] = { bldg: bldgRatio, fac: calcFac, tool: calcTool, fix: fixRatio, stock: stockRatio };
    });

    setLocalRatios(suggestions);
    setIsValidated(false);
  };

  useEffect(() => {
    if (finalRatios && Object.keys(finalRatios).length === allFloors.length) {
      setLocalRatios(finalRatios);
    } else {
      generateSuggestions();
    }
  }, [plant, refinement]);

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
      bldg: acc.bldg + Number(r.bldg),
      fac: acc.fac + Number(r.fac),
      tool: acc.tool + Number(r.tool),
      fix: acc.fix + Number(r.fix),
      stock: acc.stock + (Number(r.stock) || 0)
    }), { bldg: 0, fac: 0, tool: 0, fix: 0, stock: 0 });
  }, [localRatios]);

  const validate = () => {
    const isOk = Math.abs(sums.bldg - 1) < 0.001 && 
                 Math.abs(sums.fac - 1) < 0.001 && 
                 Math.abs(sums.tool - 1) < 0.001 && 
                 Math.abs(sums.fix - 1) < 0.001 &&
                 sums.stock <= 1.0001;
    setIsValidated(isOk);
    if (isOk) {
      setFinalRatios(localRatios);
    }
  };

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
      <div className="h-2 bg-accent w-full" />
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-accent" /> Asset Distribution Matrix
          </CardTitle>
          <CardDescription>Review suggested values or manually refine ratios. Stock sum must be &le; 1.0000; others must equal 1.0000.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={generateSuggestions} className="gap-2 font-bold text-xs">
          <RefreshCw className="w-3 h-3" /> Reset to Suggested
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pb-10">
        {!isValidated ? (
          <Alert variant="destructive" className="bg-destructive/10 text-destructive border-none">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-bold">Validation Required</AlertTitle>
            <AlertDescription className="text-xs opacity-80">
              Columns must sum to 1.0000 (Stock &le; 1.0000). Click "Run Audit" to verify.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-emerald-50 text-emerald-700 border-none">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle className="font-bold">Matrix Verified</AlertTitle>
            <AlertDescription className="text-xs opacity-80">
              Manual distribution verified. All criteria met.
            </AlertDescription>
          </Alert>
        )}

        <div className="border rounded-2xl overflow-hidden shadow-sm bg-white max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase">Building/Floor</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Building</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Facility</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Tools</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Fixture (FAB Only)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allFloors.map(floor => (
                <TableRow key={floor} className={floor.startsWith('CUP') ? 'bg-blue-50/30' : ''}>
                  <TableCell className="font-mono text-[10px] font-bold">{floor}</TableCell>
                  <TableCell className="py-1">
                    <Input 
                      type="number" step="0.0001"
                      value={localRatios[floor]?.bldg || 0}
                      onChange={(e) => handleUpdate(floor, 'bldg', e.target.value)}
                      className="h-7 border-none bg-muted/30 font-mono text-xs text-right"
                    />
                  </TableCell>
                  <TableCell className="py-1">
                    <Input 
                      type="number" step="0.0001"
                      value={localRatios[floor]?.fac || 0}
                      onChange={(e) => handleUpdate(floor, 'fac', e.target.value)}
                      className="h-7 border-none bg-muted/30 font-mono text-xs text-right"
                    />
                  </TableCell>
                  <TableCell className="py-1">
                    <Input 
                      type="number" step="0.0001"
                      value={localRatios[floor]?.tool || 0}
                      onChange={(e) => handleUpdate(floor, 'tool', e.target.value)}
                      className="h-7 border-none bg-muted/30 font-mono text-xs text-right"
                    />
                  </TableCell>
                  <TableCell className="py-1">
                    <Input 
                      type="number" step="0.0001"
                      value={localRatios[floor]?.fix || 0}
                      onChange={(e) => handleUpdate(floor, 'fix', e.target.value)}
                      className="h-7 border-none bg-muted/30 font-mono text-xs text-right"
                      disabled={floor.startsWith('CUP')}
                    />
                  </TableCell>
                  <TableCell className="py-1">
                    <Input 
                      type="number" step="0.0001"
                      value={localRatios[floor]?.stock || 0}
                      onChange={(e) => handleUpdate(floor, 'stock', e.target.value)}
                      className="h-7 border-none bg-muted/30 font-mono text-xs text-right"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-primary/5 sticky bottom-0">
              <TableRow className="font-black">
                <TableCell className="text-[10px]">TOTAL SUM</TableCell>
                <TableCell className={`text-right font-mono text-[10px] ${Math.abs(sums.bldg - 1) < 0.001 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {sums.bldg.toFixed(4)}
                </TableCell>
                <TableCell className={`text-right font-mono text-[10px] ${Math.abs(sums.fac - 1) < 0.001 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {sums.fac.toFixed(4)}
                </TableCell>
                <TableCell className={`text-right font-mono text-[10px] ${Math.abs(sums.tool - 1) < 0.001 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {sums.tool.toFixed(4)}
                </TableCell>
                <TableCell className={`text-right font-mono text-[10px] ${Math.abs(sums.fix - 1) < 0.001 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {sums.fix.toFixed(4)}
                </TableCell>
                <TableCell className={`text-right font-mono text-[10px] ${sums.stock <= 1.0001 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {sums.stock.toFixed(4)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="ghost" onClick={() => setStep(4)} className="font-bold text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" /> Ratio Refinement
          </Button>
          <div className="flex gap-4">
            <Button 
              variant="outline"
              onClick={validate}
              className="border-primary text-primary font-bold hover:bg-primary/5"
            >
              Run Audit
            </Button>
            <Button 
              disabled={!isValidated}
              onClick={() => setStep(6)}
              className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 text-lg gap-2 shadow-lg shadow-primary/20"
            >
              Analysis & Insights <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
