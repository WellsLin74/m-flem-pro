'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateFloodRiskInsights } from '@/ai/flows/generate-flood-risk-insights';
import { TrendingDown, Waves, Sparkles, ArrowLeft, Image as ImageIcon, FileSpreadsheet } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toJpeg } from 'html-to-image';
import * as XLSX from 'xlsx';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step6Estimation() {
  const { plant, finalRatios, refinement, setStep } = useAppStore();
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

    if (db) {
      const estimationId = `${plant.id}-${Date.now()}`;
      const estimationRef = doc(db, 'flood_loss_estimations', estimationId);
      setDocumentNonBlocking(estimationRef, {
        id: estimationId,
        companyName: plant.company,
        plantName: plant.plantName,
        fabL10Height,
        cupL10Height,
        floodHeightAgl: floodHeight,
        estimatedTotalLoss: finalTotal,
        estimatedFabLoss: finalFab,
        estimatedCupLoss: finalCup,
        estimationTimestamp: new Date().toISOString(),
      }, { merge: true });
    }
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
      setAiInsights("AI Analysis encountered an error. Please try again later.");
    } finally {
      setLoadingAi(false);
    }
  };

  const handleDownloadJpg = async () => {
    if (reportRef.current === null) return;
    try {
      const dataUrl = await toJpeg(reportRef.current, { 
        quality: 0.95, 
        backgroundColor: '#f8fafc',
        fontEmbedCSS: '',
      });
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

  const handleDownloadExcel = () => {
    if (!plant || !finalRatios) return;
    
    const wsData: any[][] = [];
    wsData.push([`M-FLEM Pro Integrated Report - ${plant.company} ${plant.plantName}`]);
    wsData.push([]);
    wsData.push(['--- Organization & Plant Configuration ---']);
    wsData.push(['Company', plant.company]);
    wsData.push(['Site', plant.plantName]);
    wsData.push(['Asset Building', plant.pdBuilding]);
    wsData.push(['Asset Facility', plant.pdFacility]);
    wsData.push(['Asset Tools', plant.pdTools]);
    wsData.push([]);
    
    if (refinement) {
      wsData.push(['--- Spatial Value Distribution ---']);
      wsData.push(['Floor', 'Facility %', 'Cleanroom %']);
      Object.entries(refinement.floorData).forEach(([floor, data]: [string, any]) => {
        wsData.push([floor, data.fac, data.cr]);
      });
      wsData.push([]);
    }
    
    wsData.push(['--- Risk Estimation Profile ---']);
    wsData.push(['FAB L10 (m)', fabL10Height]);
    wsData.push(['CUP L10 (m)', cupL10Height]);
    wsData.push(['Flood Height (m)', floodHeight]);
    wsData.push(['Total Impact (M NTD)', totalLoss]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "M-FLEM Report");
    XLSX.writeFile(wb, `MFLE_REPORT_${plant.company.replace(/\s+/g, '_')}.xlsx`);
  };

  const formatNum = (val: number | null) => {
    if (val === null) return '0.0';
    return val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  };

  const handleRatioChange = (key: keyof typeof ratios, val: string) => {
    setRatios(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
        <CardHeader className="bg-primary p-10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 pointer-events-none">
            <Waves className="w-64 h-64" />
          </div>
          <div className="relative z-10 space-y-2">
            <CardTitle className="text-5xl font-headline font-black tracking-tight">Risk Estimation Profile</CardTitle>
            <p className="text-primary-foreground/80 text-xl font-medium tracking-wide">Financial loss modeling based on critical elevation benchmarks</p>
          </div>
        </CardHeader>
        
        <CardContent className="p-10 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:shadow-lg">
              <Label className="text-sm font-black uppercase tracking-widest text-slate-500">FAB L10 Benchmark (m)</Label>
              <Input 
                type="number" 
                value={fabL10Height || ''} 
                onChange={(e) => setFabL10Height(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className="text-2xl font-black h-16 rounded-2xl border-none bg-white shadow-inner focus-visible:ring-accent" 
              />
            </div>
            <div className="space-y-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:shadow-lg">
              <Label className="text-sm font-black uppercase tracking-widest text-slate-500">CUP L10 Benchmark (m)</Label>
              <Input 
                type="number" 
                value={cupL10Height || ''} 
                onChange={(e) => setCupL10Height(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className="text-2xl font-black h-16 rounded-2xl border-none bg-white shadow-inner focus-visible:ring-accent" 
              />
            </div>
            <div className="space-y-4 p-6 bg-blue-50 rounded-3xl border border-blue-100 transition-all hover:shadow-lg">
              <Label className="text-sm font-black uppercase tracking-widest text-blue-600">Actual Flood Height (m)</Label>
              <Input 
                type="number" 
                value={floodHeight || ''} 
                onChange={(e) => setFloodHeight(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className="text-2xl font-black h-16 rounded-2xl border-none bg-white shadow-inner focus-visible:ring-accent" 
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 py-4">
            <Button 
              onClick={calculate} 
              className="w-full md:w-auto px-16 py-8 h-auto bg-primary hover:bg-primary/90 text-white rounded-3xl font-black text-xl shadow-2xl transition-all active:scale-95 group"
            >
              Execute Financial Loss Simulation
            </Button>
          </div>

          {totalLoss !== null && (
            <div ref={reportRef} className="space-y-8 animate-in zoom-in-95 duration-500 p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <Card className="rounded-3xl border-none bg-slate-50 p-8">
                   <h4 className="font-black text-slate-500 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                     <Waves className="w-4 h-4" /> FAB Estimated Loss
                   </h4>
                   <p className="text-5xl font-headline font-black text-primary tracking-tighter tabular-nums">NTD {formatNum(fabLoss)}M</p>
                 </Card>
                 <Card className="rounded-3xl border-none bg-slate-50 p-8">
                   <h4 className="font-black text-slate-500 uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                     <Waves className="w-4 h-4" /> CUP Estimated Loss
                   </h4>
                   <p className="text-5xl font-headline font-black text-primary tracking-tighter tabular-nums">NTD {formatNum(cupLoss)}M</p>
                 </Card>
              </div>

              <div className="bg-primary text-white rounded-[2.5rem] p-12 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <TrendingDown className="w-64 h-64" />
                </div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="space-y-2 relative z-10 text-center md:text-left">
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-accent">Cumulative Site Financial Impact</p>
                    <h3 className="text-6xl font-headline font-black tracking-tighter tabular-nums">NTD {formatNum(totalLoss)}M</h3>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button 
                      onClick={getAiInsights}
                      disabled={loadingAi}
                      className="bg-accent hover:bg-accent/90 text-primary font-black px-10 py-6 rounded-2xl gap-3 shadow-xl active:scale-95 disabled:opacity-50"
                    >
                      {loadingAi ? 'Synthesizing...' : <><Sparkles className="w-6 h-6 fill-current" /> AI Insights</>}
                    </Button>
                    <Button onClick={handleDownloadJpg} variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-black px-8 py-6 rounded-2xl gap-3 backdrop-blur-md">
                      <ImageIcon className="w-5 h-5" /> JPG
                    </Button>
                    <Button onClick={handleDownloadExcel} variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-black px-8 py-6 rounded-2xl gap-3 backdrop-blur-md">
                      <FileSpreadsheet className="w-5 h-5" /> EXCEL
                    </Button>
                  </div>
                </div>
              </div>

              {aiInsights && (
                <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem]">
                  <CardHeader className="bg-slate-50 pb-4 border-b px-10 py-8">
                    <div className="flex items-center gap-2 text-accent mb-2">
                      <Sparkles className="w-5 h-5 fill-current" />
                      <span className="text-xs font-black uppercase tracking-[0.3em]">Analytical Narrative</span>
                    </div>
                    <CardTitle className="font-headline font-black text-3xl text-primary">Expert Risk Assessment Report</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px] p-10">
                      <div className="prose prose-blue max-w-none text-slate-600 whitespace-pre-line font-medium text-lg leading-relaxed">
                        {aiInsights}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between px-2">
        <Button variant="ghost" onClick={() => setStep(5)} className="font-bold text-slate-500 gap-2 hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4" /> Return to Validation Matrix
        </Button>
      </div>
    </div>
  );
}
