'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateFloodRiskInsights } from '@/ai/flows/generate-flood-risk-insights';
import { TrendingDown, Waves, Sparkles, ArrowLeft, Building2, Factory, Image as ImageIcon, ShieldAlert } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toJpeg } from 'html-to-image';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step6Estimation() {
  const { plant, finalRatios, setStep } = useAppStore();
  const db = useFirestore();
  const [fabL10Height, setFabL10Height] = useState(0);
  const [cupL10Height, setCupL10Height] = useState(0);
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

  const [fabLoss, setFabLoss] = useState<number | null>(null);
  const [cupLoss, setCupLoss] = useState<number | null>(null);
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

  const calcFabL10Ratio = useMemo(() => {
    if (fabL10Height <= 0) return 0;
    return Math.min(100, Math.max(0, (floodHeight / fabL10Height) * 100));
  }, [floodHeight, fabL10Height]);

  const calcCupL10Ratio = useMemo(() => {
    if (cupL10Height <= 0) return 0;
    return Math.min(100, Math.max(0, (floodHeight / cupL10Height) * 100));
  }, [floodHeight, cupL10Height]);

  useEffect(() => {
    const recommendedFabL10 = Number(calcFabL10Ratio.toFixed(1));
    const recommendedCupL10 = Number(calcCupL10Ratio.toFixed(1));
    setRatios(prev => ({
      ...prev,
      fabFacL10: recommendedFabL10,
      fabFixL10: recommendedFabL10,
      fabStockL10: recommendedFabL10,
      cupFacL10: recommendedCupL10
    }));
  }, [calcFabL10Ratio, calcCupL10Ratio]);

  const calculate = () => {
    if (!plant || !assetDistribution) return;
    
    let estFab = 0;
    let estCup = 0;
    const { fabBs, fabL10Floor, cupBs, cupL10Floor } = assetDistribution;
    
    // FAB Subtotal
    estFab += (plant.pdBuilding * fabBs.bldgRatio * (ratios.fabBldgBs / 100));
    estFab += (plant.pdBuilding * fabL10Floor.bldgRatio * (ratios.fabBldgL10 / 100));
    estFab += (plant.pdFacility * fabBs.facRatio * (ratios.fabFacBs / 100));
    estFab += (plant.pdFacility * fabL10Floor.facRatio * (ratios.fabFacL10 / 100));
    estFab += (plant.pdTools * fabBs.toolRatio * (ratios.fabToolBs / 100));
    estFab += (plant.pdTools * fabL10Floor.toolRatio * (ratios.fabToolL10 / 100));
    estFab += (plant.pdFixture * fabBs.fixRatio * (ratios.fabFixBs / 100));
    estFab += (plant.pdFixture * fabL10Floor.fixRatio * (ratios.fabFixL10 / 100));
    estFab += (plant.pdStock * fabBs.stockRatio * (ratios.fabStockBs / 100));
    estFab += (plant.pdStock * fabL10Floor.stockRatio * (ratios.fabStockL10 / 100));

    // CUP Subtotal
    estCup += (plant.pdBuilding * cupBs.bldgRatio * (ratios.cupBldgBs / 100));
    estCup += (plant.pdBuilding * cupL10Floor.bldgRatio * (ratios.cupBldgL10 / 100));
    estCup += (plant.pdFacility * cupBs.facRatio * (ratios.cupFacBs / 100));
    estCup += (plant.pdFacility * cupL10Floor.facRatio * (ratios.cupFacL10 / 100));

    const finalFab = Number(estFab.toFixed(1));
    const finalCup = Number(estCup.toFixed(1));
    const finalTotal = Number((finalFab + finalCup).toFixed(1));

    setFabLoss(finalFab);
    setCupLoss(finalCup);
    setTotalLoss(finalTotal);

    const plantId = plant.id;
    const estimationId = `${plantId}-${Date.now()}`;
    
    const estimationRef = doc(db, 'flood_loss_estimations', estimationId);
    setDocumentNonBlocking(estimationRef, {
      id: estimationId,
      companyName: plant.company,
      plantName: plant.plantName,
      fabL10Height: fabL10Height,
      cupL10Height: cupL10Height,
      floodHeightAgl: floodHeight,
      estimatedTotalLoss: finalTotal,
      estimatedFabLoss: finalFab,
      estimatedCupLoss: finalCup,
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
        fabL10HeightMeters: fabL10Height,
        cupL10HeightMeters: cupL10Height,
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
      const company = (plant?.company || 'COMPANY').replace(/\s+/g, '_');
      const site = (plant?.plantName || 'PLANT').replace(/\s+/g, '_');
      link.download = `MFLE_REPORT_${company}_${site}.jpg`;
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

  const AnalysisRow = ({ 
    level, 
    metric, 
    data 
  }: { 
    level?: string, 
    metric: 'VALUE' | 'RATIO' | 'LOSS', 
    data: Record<string, { value: number, ratioKey?: keyof typeof ratios }> 
  }) => (
    <TableRow className="hover:bg-transparent">
      {level && <TableCell rowSpan={3} className="text-xs font-black text-primary uppercase text-center bg-muted/10 border-r-2 border-b-2">{level}</TableCell>}
      <TableCell className={`text-[10px] font-black uppercase text-center border-r-2 ${metric === 'LOSS' ? 'border-b-2' : ''} bg-muted/5`}>
        {metric === 'VALUE' ? 'Asset Value' : metric === 'RATIO' ? 'Loss %' : 'Loss Value'}
      </TableCell>
      {Object.entries(data).map(([key, item]) => (
        <TableCell key={key} className={`text-center py-2 px-4 ${metric === 'LOSS' ? 'border-b-2' : ''}`}>
          <div className="flex flex-col items-center justify-center h-full w-full">
            {metric === 'VALUE' && (
              <span className="text-sm font-mono font-bold text-primary">{formatNum(item.value)}M</span>
            )}
            {metric === 'RATIO' && item.ratioKey && (
              <div className="relative inline-flex items-center">
                <Input 
                  type="number" 
                  step="0.1" 
                  value={ratios[item.ratioKey]} 
                  onChange={(e) => handleRatioChange(item.ratioKey!, e.target.value)} 
                  className="h-8 w-24 text-center font-mono font-black border-none bg-muted/30 text-sm focus-visible:ring-accent" 
                />
                <span className="absolute -right-4 text-[10px] font-black text-muted-foreground/50">%</span>
              </div>
            )}
            {metric === 'LOSS' && item.ratioKey && (
              <span className="text-sm font-mono font-black text-destructive">
                {formatNum((ratios[item.ratioKey] / 100) * item.value)}M
              </span>
            )}
          </div>
        </TableCell>
      ))}
    </TableRow>
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
                  <Waves className="w-6 h-6 text-accent" /> Risk Estimation Profile
                </CardTitle>
                <CardDescription>Simulate flood events for {plant?.plantName} with independent FAB/CUP benchmarks.</CardDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
              <div className="space-y-3 text-center">
                <Label className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">FAB L10 Height (m)</Label>
                <Input 
                  type="number" step="0.1" 
                  value={fabL10Height || ''} 
                  onChange={(e) => setFabL10Height(parseFloat(e.target.value) || 0)}
                  className="bg-white border-2 border-primary/10 font-mono text-xl font-black text-center h-14 rounded-xl"
                />
              </div>
              <div className="space-y-3 text-center">
                <Label className="text-[10px] font-black text-primary-foreground bg-primary px-2 py-0.5 rounded uppercase tracking-[0.2em]">CUP L10 Height (m)</Label>
                <Input 
                  type="number" step="0.1" 
                  value={cupL10Height || ''} 
                  onChange={(e) => setCupL10Height(parseFloat(e.target.value) || 0)}
                  className="bg-white border-2 border-primary/20 font-mono text-xl font-black text-center h-14 rounded-xl"
                />
              </div>
              <div className="space-y-3 text-center">
                <Label className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Flood Height AGL (m)</Label>
                <Input 
                  type="number" step="0.1" 
                  value={floodHeight || ''} 
                  onChange={(e) => setFloodHeight(parseFloat(e.target.value) || 0)}
                  className="bg-white border-2 border-accent/30 font-mono text-xl font-black text-accent text-center h-14 rounded-xl"
                />
              </div>
              <Button 
                onClick={calculate} 
                className="md:col-span-3 bg-primary hover:bg-primary/90 text-white font-black py-8 text-xl rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95"
              >
                Execute Analysis Engine
              </Button>
            </div>

            {plant && assetDistribution && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-primary border-b-2 border-primary/10 pb-4">
                    <Factory className="w-8 h-8 text-accent" />
                    <h3 className="text-2xl font-headline font-black uppercase tracking-tight">FAB Building Loss Analysis</h3>
                  </div>
                  <div className="border-2 rounded-2xl overflow-hidden shadow-2xl bg-white">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-b-2">
                          <TableHead className="w-[120px] text-xs font-black uppercase text-center border-r-2 text-primary">Analysis Level</TableHead>
                          <TableHead className="w-[100px] text-xs font-black uppercase text-center border-r-2 text-primary">Metric</TableHead>
                          <TableHead className="text-xs font-black uppercase text-center">Building</TableHead>
                          <TableHead className="text-xs font-black uppercase text-center">Tools</TableHead>
                          <TableHead className="text-xs font-black uppercase text-center">Facility</TableHead>
                          <TableHead className="text-xs font-black uppercase text-center">Fixture</TableHead>
                          <TableHead className="text-xs font-black uppercase text-center">Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnalysisRow level="Basement" metric="VALUE" data={{
                          bldg: { value: plant.pdBuilding * assetDistribution.fabBs.bldgRatio },
                          tool: { value: plant.pdTools * assetDistribution.fabBs.toolRatio },
                          fac: { value: plant.pdFacility * assetDistribution.fabBs.facRatio },
                          fix: { value: plant.pdFixture * assetDistribution.fabBs.fixRatio },
                          stock: { value: plant.pdStock * assetDistribution.fabBs.stockRatio }
                        }} />
                        <AnalysisRow metric="RATIO" data={{
                          bldg: { value: 0, ratioKey: 'fabBldgBs' },
                          tool: { value: 0, ratioKey: 'fabToolBs' },
                          fac: { value: 0, ratioKey: 'fabFacBs' },
                          fix: { value: 0, ratioKey: 'fabFixBs' },
                          stock: { value: 0, ratioKey: 'fabStockBs' }
                        }} />
                        <AnalysisRow metric="LOSS" data={{
                          bldg: { value: plant.pdBuilding * assetDistribution.fabBs.bldgRatio, ratioKey: 'fabBldgBs' },
                          tool: { value: plant.pdTools * assetDistribution.fabBs.toolRatio, ratioKey: 'fabToolBs' },
                          fac: { value: plant.pdFacility * assetDistribution.fabBs.facRatio, ratioKey: 'fabFacBs' },
                          fix: { value: plant.pdFixture * assetDistribution.fabBs.fixRatio, ratioKey: 'fabFixBs' },
                          stock: { value: plant.pdStock * assetDistribution.fabBs.stockRatio, ratioKey: 'fabStockBs' }
                        }} />

                        <AnalysisRow level="L10 Level" metric="VALUE" data={{
                          bldg: { value: plant.pdBuilding * assetDistribution.fabL10Floor.bldgRatio },
                          tool: { value: plant.pdTools * assetDistribution.fabL10Floor.toolRatio },
                          fac: { value: plant.pdFacility * assetDistribution.fabL10Floor.facRatio },
                          fix: { value: plant.pdFixture * assetDistribution.fabL10Floor.fixRatio },
                          stock: { value: plant.pdStock * assetDistribution.fabL10Floor.stockRatio }
                        }} />
                        <AnalysisRow metric="RATIO" data={{
                          bldg: { value: 0, ratioKey: 'fabBldgL10' },
                          tool: { value: 0, ratioKey: 'fabToolL10' },
                          fac: { value: 0, ratioKey: 'fabFacL10' },
                          fix: { value: 0, ratioKey: 'fabFixL10' },
                          stock: { value: 0, ratioKey: 'fabStockL10' }
                        }} />
                        <AnalysisRow metric="LOSS" data={{
                          bldg: { value: plant.pdBuilding * assetDistribution.fabL10Floor.bldgRatio, ratioKey: 'fabBldgL10' },
                          tool: { value: plant.pdTools * assetDistribution.fabL10Floor.toolRatio, ratioKey: 'fabToolL10' },
                          fac: { value: plant.pdFacility * assetDistribution.fabL10Floor.facRatio, ratioKey: 'fabFacL10' },
                          fix: { value: plant.pdFixture * assetDistribution.fabL10Floor.fixRatio, ratioKey: 'fabFixL10' },
                          stock: { value: plant.pdStock * assetDistribution.fabL10Floor.stockRatio, ratioKey: 'fabStockL10' }
                        }} />
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-primary border-b-2 border-primary/10 pb-4">
                    <Building2 className="w-8 h-8 text-accent" />
                    <h3 className="text-2xl font-headline font-black uppercase tracking-tight">CUP Building Loss Analysis</h3>
                  </div>
                  <div className="border-2 rounded-2xl overflow-hidden shadow-2xl bg-white">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent border-b-2">
                          <TableHead className="w-[120px] text-xs font-black uppercase text-center border-r-2 text-primary">Analysis Level</TableHead>
                          <TableHead className="w-[100px] text-xs font-black uppercase text-center border-r-2 text-primary">Metric</TableHead>
                          <TableHead className="text-xs font-black uppercase text-center">Building</TableHead>
                          <TableHead className="text-xs font-black uppercase text-center">Facility</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnalysisRow level="Basement" metric="VALUE" data={{
                          bldg: { value: plant.pdBuilding * assetDistribution.cupBs.bldgRatio },
                          fac: { value: plant.pdFacility * assetDistribution.cupBs.facRatio }
                        }} />
                        <AnalysisRow metric="RATIO" data={{
                          bldg: { value: 0, ratioKey: 'cupBldgBs' },
                          fac: { value: 0, ratioKey: 'cupFacBs' }
                        }} />
                        <AnalysisRow metric="LOSS" data={{
                          bldg: { value: plant.pdBuilding * assetDistribution.cupBs.bldgRatio, ratioKey: 'cupBldgBs' },
                          fac: { value: plant.pdFacility * assetDistribution.cupBs.facRatio, ratioKey: 'cupFacBs' }
                        }} />

                        <AnalysisRow level="L10 Level" metric="VALUE" data={{
                          bldg: { value: plant.pdBuilding * assetDistribution.cupL10Floor.bldgRatio },
                          fac: { value: plant.pdFacility * assetDistribution.cupL10Floor.facRatio }
                        }} />
                        <AnalysisRow metric="RATIO" data={{
                          bldg: { value: 0, ratioKey: 'cupBldgL10' },
                          fac: { value: 0, ratioKey: 'cupFacL10' }
                        }} />
                        <AnalysisRow metric="LOSS" data={{
                          bldg: { value: plant.pdBuilding * assetDistribution.cupL10Floor.bldgRatio, ratioKey: 'cupBldgL10' },
                          fac: { value: plant.pdFacility * assetDistribution.cupL10Floor.facRatio, ratioKey: 'cupFacL10' }
                        }} />
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {totalLoss !== null && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex items-center justify-between border border-white/10 group hover:scale-[1.02] transition-transform">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">Cumulative FAB Financial Impact</p>
                          <p className="text-3xl font-headline font-black tracking-tighter tabular-nums">NTD {formatNum(fabLoss || 0)}M</p>
                        </div>
                        <Factory className="w-10 h-10 text-accent/20 group-hover:text-accent/40 transition-colors" />
                      </div>
                      <div className="p-6 rounded-3xl bg-blue-900 text-white shadow-xl flex items-center justify-between border border-white/10 group hover:scale-[1.02] transition-transform">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/80">Cumulative CUP Financial Impact</p>
                          <p className="text-3xl font-headline font-black tracking-tighter tabular-nums">NTD {formatNum(cupLoss || 0)}M</p>
                        </div>
                        <Building2 className="w-10 h-10 text-accent/20 group-hover:text-accent/40 transition-colors" />
                      </div>
                    </div>

                    <div className="p-10 rounded-[2.5rem] bg-primary text-primary-foreground flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden transition-all">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <TrendingDown className="w-64 h-64" />
                      </div>
                      <div className="space-y-2 relative z-10 text-center md:text-left">
                        <p className="text-sm font-black uppercase tracking-[0.4em] text-accent">Cumulative Site Financial Impact</p>
                        <h3 className="text-6xl font-headline font-black tracking-tighter tabular-nums">NTD {formatNum(totalLoss)}M</h3>
                      </div>
                      <button 
                        onClick={getAiInsights}
                        disabled={loadingAi}
                        className="inline-flex items-center justify-center bg-accent hover:bg-accent/90 text-primary font-black px-10 py-8 rounded-2xl gap-3 shadow-2xl relative z-10 text-lg transition-all active:scale-95 disabled:opacity-50"
                      >
                        {loadingAi ? 'Synthesizing Data...' : <><Sparkles className="w-6 h-6 fill-current" /> Generate AI Insights</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {aiInsights && (
          <Card className="border-none shadow-2xl bg-white overflow-hidden animate-in zoom-in-95 duration-500 rounded-[2.5rem]">
            <CardHeader className="bg-primary/5 pb-4 border-b">
              <div className="flex items-center gap-2 text-accent mb-2">
                <Sparkles className="w-5 h-5 fill-current" />
                <span className="text-xs font-black uppercase tracking-[0.3em]">Advanced Analytical Narrative</span>
              </div>
              <CardTitle className="font-headline font-black text-3xl text-primary">Expert Risk Assessment Report</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] p-10">
                <div className="prose prose-blue max-w-none text-muted-foreground whitespace-pre-line font-medium text-lg leading-relaxed">
                  {aiInsights}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-between px-2">
        <Button variant="ghost" onClick={() => setStep(5)} className="font-bold text-muted-foreground gap-2 hover:bg-primary/5">
          <ArrowLeft className="w-4 h-4" /> Return to Validation Matrix
        </Button>
      </div>
    </div>
  );
}
