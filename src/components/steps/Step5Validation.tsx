'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, ChevronRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

export function Step5Validation() {
  const { plant, refinement, setIsValidated, isValidated, setStep } = useAppStore();

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

  const calculatedData = useMemo(() => {
    if (!plant || !refinement) return { rows: [], sums: { bldg: 0, fac: 0, tools: 0, fix: 0 } };

    const totalFacSum = Object.values(refinement.floorData).reduce((sum, f) => sum + f.fac, 0);
    const totalCrSum = Object.values(refinement.floorData).reduce((sum, f) => sum + f.cr, 0);

    const fabFloors = floors.filter(f => f.startsWith('FAB'));
    const cupFloors = floors.filter(f => f.startsWith('CUP'));

    const rows = floors.map(f => {
      const fData = refinement.floorData[f];
      
      // Asset Distribution Logic
      const facCrPart = totalCrSum > 0 ? (fData.cr / totalCrSum) * refinement.facCrRatio : 0;
      const facNonCrPart = totalFacSum > 0 ? (fData.fac / totalFacSum) * (1 - refinement.facCrRatio) : 0;
      const calcFac = facCrPart + facNonCrPart;

      const toolCrPart = totalCrSum > 0 ? (fData.cr / totalCrSum) * refinement.toolsCrRatio : 0;
      const toolNonCrPart = totalFacSum > 0 ? (fData.fac / totalFacSum) * (1 - refinement.toolsCrRatio) : 0;
      const calcTool = toolCrPart + toolNonCrPart;

      // Building Distribution: FAB (90% total), CUP (10% total)
      let bldgRatio = 0;
      if (f.startsWith('FAB')) {
        bldgRatio = 0.9 / fabFloors.length;
      } else if (f.startsWith('CUP')) {
        bldgRatio = 0.1 / cupFloors.length;
      }

      const fixRatio = 1.0 / floors.length;

      return { floor: f, bldg: bldgRatio, fac: calcFac, tool: calcTool, fix: fixRatio };
    });

    const sums = rows.reduce((acc, r) => ({
      bldg: acc.bldg + r.bldg,
      fac: acc.fac + r.fac,
      tools: acc.tools + r.tool,
      fix: acc.fix + r.fix
    }), { bldg: 0, fac: 0, tools: 0, fix: 0 });

    return { rows, sums };
  }, [plant, refinement, floors]);

  const validate = () => {
    const s = calculatedData.sums;
    const isOk = Math.abs(s.bldg - 1) < 0.001 && 
                 Math.abs(s.fac - 1) < 0.001 && 
                 Math.abs(s.tools - 1) < 0.001 && 
                 Math.abs(s.fix - 1) < 0.001;
    setIsValidated(isOk);
  };

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
      <div className="h-2 bg-accent w-full" />
      <CardHeader>
        <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-accent" /> Asset Distribution Matrix
        </CardTitle>
        <CardDescription>Final verification of normalized financial ratios across FAB and CUP site assets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pb-10">
        {!isValidated ? (
          <Alert variant="destructive" className="bg-destructive/10 text-destructive border-none">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-bold">Validation Required</AlertTitle>
            <AlertDescription className="text-xs opacity-80">
              Computed sums must equal 100.00% (1.0000) for all asset categories to ensure data integrity.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="bg-emerald-50 text-emerald-700 border-none">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle className="font-bold">Matrix Verified</AlertTitle>
            <AlertDescription className="text-xs opacity-80">
              Audit successful. All distributed ratios meet the normalization criteria.
            </AlertDescription>
          </Alert>
        )}

        <div className="border rounded-2xl overflow-hidden shadow-sm bg-white max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase">Building/Floor</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Building</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Facility (Auto)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Tools (Auto)</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-right">Fixture</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calculatedData.rows.map(r => (
                <TableRow key={r.floor} className={r.floor.startsWith('CUP') ? 'bg-blue-50/30' : ''}>
                  <TableCell className="font-mono text-[10px] font-bold">{r.floor}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.bldg.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.fac.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.tool.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.fix.toFixed(4)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="bg-primary/5 sticky bottom-0">
              <TableRow className="font-black text-primary">
                <TableCell className="text-[10px]">TOTAL SUM</TableCell>
                <TableCell className="text-right font-mono text-xs">{calculatedData.sums.bldg.toFixed(4)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{calculatedData.sums.fac.toFixed(4)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{calculatedData.sums.tools.toFixed(4)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{calculatedData.sums.fix.toFixed(4)}</TableCell>
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
