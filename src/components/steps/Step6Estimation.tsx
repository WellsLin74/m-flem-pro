'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateFloodRiskInsights } from '@/ai/flows/generate-flood-risk-insights';
import { TrendingDown, Waves, Sparkles, ArrowLeft, Building2, Factory, Image as ImageIcon, Download } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toJpeg } from 'html-to-image';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step6Estimation() {
  const { plant, finalRatios, setStep } = useAppStore();
  const db = useFirestore();
  const [l10Height, setL10Height] = useState(0);
  const [floodHeight, setFloodHeight] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [ratios, setRatios] = useState({
    fabBldgBs: 0.2, fabBldgL10: 0.2,
    fabFacBs: 100.0, fabFacL10: 0.0,
    fabToolBs: 100.0, fabToolL10: 100.0,
    fabFixBs: 100.0, fabFixL10: 0.0,
    fabStockBs: 100.0, fabStockL10: 0.0,
    cupBldgBs: 0.2, cupBldgL10: 0.2,
    cupFacBs: 100.0, cupFacL10: 0.0,
  });

  const [totalLoss, setTotalLoss] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  const assetDistribution = useMemo(() => {
    if (!plant || !finalRatios) return null;

    const calculateAggregates = (floorFilter: (f: string) => boolean) => {
      let bldgRatio = 0, facRatio = 0, toolRatio = 0, fixRatio = 0, stockRatio = 0;
      Object.keys(finalRatios).filter(floorFilter).forEach(f => {
        const r = finalRatios[f];
        bldgRatio += r.bldg;
        facRatio += r.fac;
        toolRatio += r.tool;
        fixRatio += r.fix;
        stockRatio += r.stock;
      });
      return { bldgRatio, facRatio, toolRatio, fixRatio, stockRatio };
    };

    return {
      fabBs: calculateAggregates(f => f.startsWith('FAB') && f.includes('BL')),
      fabL10Floor: calculateAggregates(f => f === 'FAB-L10'),
      cupBs: calculateAggregates(f => f.startsWith('CUP') && f.includes('BL')),
      cupL10Floor: calculateAggregates(f => f === 'CUP-L10')
    };
  }, [plant, finalRatios]);

  const calcL10Ratio = useMemo(() => {
    if (l10Height <= 0) return 0;
    return Math.min(100, Math.max(0, (floodHeight / l10Height) * 100));
  }, [floodHeight, l10Height]);

  useEffect(() => {
    const recommendedL10 = Number(calcL10Ratio.toFixed(1));
    setRatios(prev => ({
      ...prev,
      fabFacL10: recommendedL10,
      fabFixL10: recommendedL10,
      fabStockL10: recommendedL10,
      cupFacL10: recommendedL10
    }));
  }, [calcL10Ratio]);

  const calculate = () => {
    if (!plant || !assetDistribution) return;
    
    let est = 0;
    const { fabBs, fabL10Floor, cupBs, cupL10Floor } = assetDistribution;
    
    est += (plant.pdBuilding * fabBs.bldgRatio * (ratios.fabBldgBs / 100));
    est += (plant.pdBuilding * fabL10Floor.bldgRatio * (ratios.fabBldgL10 / 100));
    est += (plant.pdFacility * fabBs.facRatio * (ratios.fabFacBs / 100));
    est += (plant.pdFacility * fabL10Floor.facRatio * (ratios.fabFacL10 / 100));
    est += (plant.pdTools * fabBs.toolRatio * (ratios.fabToolBs / 100));
    est += (plant.pdTools * fabL10Floor.toolRatio * (ratios.fabToolL10 / 100));
    est += (plant.pdFixture * fabBs.fixRatio * (ratios.fabFixBs / 100));
    est += (plant.pdFixture * fabL10Floor.fixRatio * (ratios.fabFixL10 / 100));
    est += (plant.pdStock * fabBs.stockRatio * (ratios.fabStockBs / 100));
    est += (plant.pdStock * fabL10Floor.stockRatio * (ratios.fabStockL10 / 100));

    est += (plant.pdBuilding * cupBs.bldgRatio * (ratios.cupBldgBs / 100));
    est += (plant.pdBuilding * cupL10Floor.bldgRatio * (ratios.cupBldgL10 / 100));
    est += (plant.pdFacility * cupBs.facRatio * (ratios.cupFacBs / 100));
    est += (plant.pdFacility * cupL10Floor.facRatio * (ratios.cupFacL10 / 100));

    const finalEst = Number(est.toFixed(1));
    setTotalLoss(finalEst);

    const estimationId = `${plant.company.replace(/\s+/g, '_')}-${plant.plantName.replace(/\s+/g, '_')}-${Date.now()}`;
    const estimationRef = doc(db, 'flood_loss_estimations', estimationId);
    setDocumentNonBlocking(estimationRef, {
      id: estimationId,
      companyName: plant.company,
      plantName: plant.plantName,
      l10Height: l10Height,
      floodHeightAgl: floodHeight,
      buildingBasementLossRatio: ratios.fabBldgBs,
      buildingL10LossRatio: ratios.fabBldgL10,
      toolsBasementLossRatio: ratios.fabToolBs,
      toolsL10LossRatio: ratios.fabToolL10,
      ffsBasementLossRatio: ratios.fabFacBs,
      ffsL10LossRatio: ratios.fabFacL10,
      estimatedTotalLoss: finalEst,
      estimationTimestamp: new Date().toISOString(),
    }, { merge: true });
  };

  const getAiInsights = async () => {
    if (!plant || totalLoss === null) return;
    setLoadingAi(true);
    try {
      const result = await generateFloodRiskInsights({
        companyName: plant.company,
        plantName: plant.plantName,
        l10HeightMeters: l10Height,
        floodHeightAglMeters: floodHeight,
        buildingInitialValueM: plant.pdBuilding,
        facilityInitialValueM: plant.pdFacility,
        toolsInitialValueM: plant.pdTools,
        fixtureInitialValueM: plant.pdFixture,
        stockInitialValueM: plant.pdStock,
        bi12mInitialValueM: plant.bi12m,
        buildingBasementLossRatio: (ratios.fabBldgBs || 0) / 100,
        buildingL10LossRatio: (ratios.fabBldgL10 || 0) / 100,
        toolsBasementLossRatio: (ratios.fabToolBs || 0) / 100,
        toolsL10LossRatio: (ratios.fabToolL10 || 0) / 100,
        ffsBasementLossRatio: (ratios.fabFacBs || 0) / 100,
        ffsL10LossRatio: (ratios.fabFacL10 || 0) / 100,
        totalLossEstimateM: totalLoss
      });
      setAiInsights(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleDownloadJpg = async () => {
    if (reportRef.current === null) return;
    try {
      const dataUrl = await toJpeg(reportRef.current, { quality: 0.95, backgroundColor: '#f8fafc' });
      const link = document.createElement('a');
      link.download = `FLEM-Report-${plant?.plantName || 'Analysis'}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    }
  };

  const formatNum = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const handleRatioChange = (key: keyof typeof ratios, val: string) => {
    setRatios(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const CellContent = ({ assetValue, ratioKey }: { assetValue: number, ratioKey: keyof typeof ratios }) => (
    <div className="flex flex-col items-center justify-center space-y-1 py-2">
      <span className="text-[11px] font-mono font-medium text-muted-foreground">{formatNum(assetValue)}M</span>
      <div className="flex flex-col items-center">
        <div className="relative">
          <Input 
            type="number" 
            step="0.1" 
            value={ratios[ratioKey]} 
            onChange={(e) => handleRatioChange(ratioKey, e.target.value)} 
            className="h-7 w-20 text-center font-mono font-bold border-none bg-muted/30 text-xs px-1" 
          />
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground/50">%</span>
        </div>
        <span className="text-[10px] font-mono font-black text-destructive mt-1">
          {formatNum((ratios[ratioKey] / 100) * assetValue)}M
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div ref={reportRef} className="space-y-8 p-1">
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="h-2 bg-accent w-full" />
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
                  <Waves className="w-6 h-6 text-accent" /> Environmental Impact Modeling
                </CardTitle>
                <CardDescription>Simulate flood events and analyze financial impact (NTD Million).</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadJpg}
                className="font-bold gap-2 text-xs border-primary text-primary hover:bg-primary/5"
              >
                <ImageIcon className="w-4 h-4" /> Export View as JPG
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="space-y-2 text-center">
                <Label className="text-xs font-bold text-muted-foreground uppercase">L10 Critical Height (m)</Label>
                <Input 
                  type="number" step="0.1" 
                  value={l10Height || ''} 
                  onChange={(e) => setL10Height(parseFloat(e.target.value) || 0)}
                  className="bg-white border-none font-mono text-lg font-bold text-center"
                />
              </div>
              <div className="space-y-2 text-center">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Simulated Flood Height AGL (m)</Label>
                <Input 
                  type="number" step="0.1" 
                  value={floodHeight || ''} 
                  onChange={(e) => setFloodHeight(parseFloat(e.target.value) || 0)}
                  className="bg-white border-none font-mono text-lg font-bold text-accent text-center"
                />
              </div>
              <Button 
                onClick={calculate} 
                className="md:col-span-2 bg-accent hover:bg-accent/80 text-primary font-black py-6 text-lg shadow-lg shadow-accent/20"
              >
                Run Simulation Engine
              </Button>
            </div>

            {plant && assetDistribution && (
              <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-primary border-b border-primary/10 pb-4">
                    <Factory className="w-6 h-6" />
                    <h3 className="text-xl font-headline font-black uppercase tracking-tight">FAB Building Analysis</h3>
                  </div>
                  <div className="border rounded-2xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-primary/5">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[120px] text-[10px] font-black uppercase text-center">Location</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Building</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Tools</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Facility</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Fixture</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-muted/5">
                          <TableCell className="text-[10px] font-bold text-muted-foreground uppercase text-center bg-muted/10">Basement</TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdBuilding * assetDistribution.fabBs.bldgRatio} ratioKey="fabBldgBs" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdTools * assetDistribution.fabBs.toolRatio} ratioKey="fabToolBs" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdFacility * assetDistribution.fabBs.facRatio} ratioKey="fabFacBs" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdFixture * assetDistribution.fabBs.fixRatio} ratioKey="fabFixBs" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdStock * assetDistribution.fabBs.stockRatio} ratioKey="fabStockBs" /></TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/5 border-t">
                          <TableCell className="text-[10px] font-bold text-muted-foreground uppercase text-center bg-muted/10">L10 Floor</TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdBuilding * assetDistribution.fabL10Floor.bldgRatio} ratioKey="fabBldgL10" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdTools * assetDistribution.fabL10Floor.toolRatio} ratioKey="fabToolL10" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdFacility * assetDistribution.fabL10Floor.facRatio} ratioKey="fabFacL10" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdFixture * assetDistribution.fabL10Floor.fixRatio} ratioKey="fabFixL10" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdStock * assetDistribution.fabL10Floor.stockRatio} ratioKey="fabStockL10" /></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-primary border-b border-primary/10 pb-4">
                    <Building2 className="w-6 h-6" />
                    <h3 className="text-xl font-headline font-black uppercase tracking-tight">CUP Building Analysis</h3>
                  </div>
                  <div className="border rounded-2xl overflow-hidden shadow-sm bg-white overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-primary/5">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[120px] text-[10px] font-black uppercase text-center">Location</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Building</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Facility</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-muted/5">
                          <TableCell className="text-[10px] font-bold text-muted-foreground uppercase text-center bg-muted/10">Basement</TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdBuilding * assetDistribution.cupBs.bldgRatio} ratioKey="cupBldgBs" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdFacility * assetDistribution.cupBs.facRatio} ratioKey="cupFacBs" /></TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/5 border-t">
                          <TableCell className="text-[10px] font-bold text-muted-foreground uppercase text-center bg-muted/10">L10 Floor</TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdBuilding * assetDistribution.cupL10Floor.bldgRatio} ratioKey="cupBldgL10" /></TableCell>
                          <TableCell className="p-0"><CellContent assetValue={plant.pdFacility * assetDistribution.cupL10Floor.facRatio} ratioKey="cupFacL10" /></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {totalLoss !== null && (
                  <div className="p-8 rounded-3xl bg-primary text-primary-foreground flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-primary/30 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <TrendingDown className="w-40 h-40" />
                    </div>
                    <div className="space-y-1 relative z-10">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Total Site Loss Estimation</p>
                      <h3 className="text-5xl font-headline font-black tracking-tighter tabular-nums text-center md:text-left">NTD {formatNum(totalLoss)}M</h3>
                    </div>
                    <Button 
                      onClick={getAiInsights}
                      disabled={loadingAi}
                      className="bg-accent hover:bg-accent/90 text-primary font-black px-8 py-6 rounded-2xl gap-2 shadow-xl relative z-10"
                    >
                      {loadingAi ? 'Analyzing Data...' : <><Sparkles className="w-5 h-5" /> Generate AI Insights</>}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {aiInsights && (
          <Card className="border-none shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-500">
            <CardHeader className="bg-primary/5 pb-2">
              <div className="flex items-center gap-2 text-accent mb-2">
                <Sparkles className="w-5 h-5 fill-current" />
                <span className="text-xs font-black uppercase tracking-widest">Intelligent Risk Narrative</span>
              </div>
              <CardTitle className="font-headline font-black text-2xl text-primary">Analyst Insight Report</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] p-8">
                <div className="prose prose-blue max-w-none text-muted-foreground whitespace-pre-line font-medium leading-relaxed">
                  {aiInsights}
                </div>
              </ScrollArea>
              <div className="bg-muted/30 p-4 flex justify-end gap-4 border-t">
                <Button variant="ghost" className="font-bold text-xs uppercase gap-2">
                  <Download className="w-4 h-4" /> Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(5)} className="font-bold text-muted-foreground gap-2">
          <ArrowLeft className="w-4 h-4" /> Matrix Validation
        </Button>
      </div>
    </div>
  );
}
