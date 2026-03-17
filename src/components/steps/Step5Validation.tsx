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

  const floors = useMemo(() => {
    const list: string[] = [];
    if (!plant) return list;
    for (let i = plant.fabBl; i >= 1; i--) list.push(`FAB-BL${i}0`);
    for (let j = 1; j <= plant.fabAl; j++) list.push(`FAB-L${j}0`);
    for (let i = plant.cupBl; i >= 1; i--) list.push(`CUP-BL${i}0`);
    for (let j = 1; j <= plant.cupAl; j++) list.push(`CUP-L${j}0`);
    return list;
  }, [plant]);

  const fabFloors = useMemo(() => floors.filter(f => f.startsWith('FAB')), [floors]);
  const cupFloors = useMemo(() => floors.filter(f => f.startsWith('CUP')), [floors]);

  const generateSuggestions = () => {
    if (!plant || !refinement) return;

    const totalFacSum = Object.values(refinement.floorData).reduce((sum, f) => sum + f.fac, 0);
    const totalCrSum = Object.values(refinement.floorData).reduce((sum, f) => sum + f.cr, 0);

    const suggestions: Record<string, FinalRatio> = {};

    floors.forEach(f => {
      const fData = refinement.floorData[f];
      
      // Asset Distribution Logic
      const facCrPart = totalCrSum > 0 ? (fData.cr / totalCrSum) * refinement.facCrRatio : 0;
      const facNonCrPart = totalFacSum > 0 ? (fData.fac / totalFacSum) * (1 - refinement.facCrRatio) : 0;
      const calcFac = facCrPart + facNonCrPart;

      const toolCrPart = totalCrSum > 0 ? (fData.cr / totalCrSum) * refinement.toolsCrRatio : 0;
      const toolNonCrPart = totalFacSum > 0 ? (fData.fac / totalFacSum) * (1 - refinement.toolsCrRatio) : 0;
      const calcTool = toolCrPart + toolNonCrPart;

      // Building Distribution: FAB (90%), CUP (10%)
      let bldgRatio = 0;
      if (f.startsWith('FAB')) {
        bldgRatio = 0.9 / fabFloors.length;
      } else if (f.startsWith('CUP')) {
        bldgRatio = 0.1 / cupFloors.length;
      }

      // Fixture Distribution: FAB ONLY
      let fixRatio = 0;
      if (f.startsWith('FAB')) {
        fixRatio = 1.0 / fabFloors.length;
      }

      suggestions[f] = { bldg: bldgRatio, fac: calcFac, tool: calcTool, fix: fixRatio };
    });

    setLocalRatios(suggestions);
    setIsValidated(false);
  };

  useEffect(() => {
    if (finalRatios && Object.keys(finalRatios).length === floors.length) {
      setLocalRatios(finalRatios);
    } else {
      generateSuggestions();
    }
  }, []);

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
      bldg: acc.bldg + r.bldg,
      fac: acc.fac + r.fac,
      tool: acc.tool + r.tool,
      fix: acc.fix + r.fix
    }), { bldg: 0, fac: 0, tool: 0, fix: 0 });
  }, [localRatios]);

  const validate = () => {
    const isOk = Math.abs(sums.bldg - 1) < 0.001 && 
                 Math.abs(sums.fac - 1) < 0.001 && 
                 Math.abs(sums.tool - 1) < 0.001 && 
                 Math.abs(sums.fix - 1) < 0.001;
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
          <CardDescription>Review suggested values or manually refine ratios. CUP excluded from Fixture calculations.</CardDescription>
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
              User adjustments must sum to 100.00% (1.0000) for each category. Click "Run Audit" to verify.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-emerald-50 text-emerald-700 border-none">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle className="font-bold">Matrix Verified</AlertTitle>
            <AlertDescription className="text-xs opacity-80">
              Manual distribution verified. All sums equal 100.00%.
            </AlertDescription>
          </Alert>
        )}

        <div className="border rounded-2xl overflow-hidden shadow-sm bg-white max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase">Building/Floor</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Building (90:10)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Facility (Site)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Tools (Site)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Fixture (FAB Only)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {floors.map(floor => (
                <TableRow key={floor} className={floor.startsWith('CUP') ? 'bg-blue-50/30' : ''}>
                  <TableCell className="font-mono text-[10px] font-bold">{floor}</TableCell>
                  <TableCell className="py-2">
                    <Input 
                      type="number" step="0.0001"
                      value={localRatios[floor]?.bldg || 0}
                      onChange={(e) => handleUpdate(floor, 'bldg', e.target.value)}
                      className="h-8 border-none bg-muted/30 font-mono text-xs text-right"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input 
                      type="number" step="0.0001"
                      value={localRatios[floor]?.fac || 0}
                      onChange={(e) => handleUpdate(floor, 'fac', e.target.value)}
                      className="h-8 border-none bg-muted/30 font-mono text-xs text-right"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input 
                      type="number" step="0.0001"
                      value={localRatios[floor]?.tool || 0}
                      onChange={(e) => handleUpdate(floor, 'tool', e.target.value)}
                      className="h-8 border-none bg-muted/30 font-mono text-xs text-right"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input 
                      type="number" step="0.0001"
                      value={localRatios[floor]?.fix || 0}
                      onChange={(e) => handleUpdate(floor, 'fix', e.target.value)}
                      className="h-8 border-none bg-muted/30 font-mono text-xs text-right"
                      disabled={floor.startsWith('CUP')}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-primary/5 sticky bottom-0">
              <TableRow className="font-black">
                <TableCell className="text-[10px]">TOTAL SUM</TableCell>
                <TableCell className={`text-right font-mono text-xs ${Math.abs(sums.bldg - 1) < 0.001 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {sums.bldg.toFixed(4)}
                </TableCell>
                <TableCell className={`text-right font-mono text-xs ${Math.abs(sums.fac - 1) < 0.001 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {sums.fac.toFixed(4)}
                </TableCell>
                <TableCell className={`text-right font-mono text-xs ${Math.abs(sums.tool - 1) < 0.001 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {sums.tool.toFixed(4)}
                </TableCell>
                <TableCell className={`text-right font-mono text-xs ${Math.abs(sums.fix - 1) < 0.001 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {sums.fix.toFixed(4)}
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
