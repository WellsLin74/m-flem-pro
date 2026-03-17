'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateFloodRiskInsights } from '@/ai/flows/generate-flood-risk-insights';
import { TrendingDown, Waves, Sparkles, ArrowLeft, Download, Building2, Factory } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function Step6Estimation() {
  const { plant, finalRatios, setStep } = useAppStore();
  const [l10Height, setL10Height] = useState(0);
  const [floodHeight, setFloodHeight] = useState(0);
  
  const [ratios, setRatios] = useState({
    fabBldgBs: 0.2, fabBldgL10: 0.2,
    fabFacBs: 100, fabFacL10: 0,
    fabToolBs: 100, fabToolL10: 100,
    fabFixBs: 100, fabFixL10: 0,
    fabStockBs: 100, fabStockL10: 0,
    cupBldgBs: 0.2, cupBldgL10: 0.2,
    cupFacBs: 100, cupFacL10: 0,
    // Defaults for CUP Tool/Fix/Stock are 0 based on P5 distribution logic
    cupToolBs: 0, cupToolL10: 0,
    cupFixBs: 0, cupFixL10: 0,
    cupStockBs: 0, cupStockL10: 0,
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
    if (l10Height === 0) return 0;
    return Math.min(100, Math.max(0, (floodHeight / l10Height) * 100));
  }, [floodHeight, l10Height]);

  // Update dynamic L10 suggestions for Facility, Fixture, and Stock
  useEffect(() => {
    setRatios(prev => ({
      ...prev,
      fabFacL10: calcL10Ratio,
      fabFixL10: calcL10Ratio,
      fabStockL10: calcL10Ratio,
      cupFacL10: calcL10Ratio
    }));
  }, [calcL10Ratio]);

  const calculate = () => {
    if (!plant || !assetDistribution) return;
    
    let est = 0;
    const { fabBs, fabL10Floor, cupBs, cupL10Floor } = assetDistribution;
    
    const calcCategory = (dist: any, buildingPrefix: 'fab' | 'cup', isBasement: boolean) => {
      const ratioKeyPrefix = `${buildingPrefix}`;

      const bRatio = isBasement ? (ratios[`${ratioKeyPrefix}BldgBs` as keyof typeof ratios] / 100) : (ratios[`${ratioKeyPrefix}BldgL10` as keyof typeof ratios] / 100);
      est += (plant.pdBuilding * dist.bldgRatio * bRatio);

      const fRatio = isBasement ? (ratios[`${ratioKeyPrefix}FacBs` as keyof typeof ratios] / 100) : (ratios[`${ratioKeyPrefix}FacL10` as keyof typeof ratios] / 100);
      est += (plant.pdFacility * dist.facRatio * fRatio);

      const tRatio = isBasement ? (ratios[`${ratioKeyPrefix}ToolBs` as keyof typeof ratios] / 100) : (ratios[`${ratioKeyPrefix}ToolL10` as keyof typeof ratios] / 100);
      est += (plant.pdTools * dist.toolRatio * tRatio);

      const fixR = isBasement ? (ratios[`${ratioKeyPrefix}FixBs` as keyof typeof ratios] / 100) : (ratios[`${ratioKeyPrefix}FixL10` as keyof typeof ratios] / 100);
      est += (plant.pdFixture * dist.fixRatio * fixR);

      const sRatio = isBasement ? (ratios[`${ratioKeyPrefix}StockBs` as keyof typeof ratios] / 100) : (ratios[`${ratioKeyPrefix}StockL10` as keyof typeof ratios] / 100);
      est += (plant.pdStock * dist.stockRatio * sRatio);
    };

    calcCategory(fabBs, 'fab', true);
    calcCategory(fabL10Floor, 'fab', false);
    calcCategory(cupBs, 'cup', true);
    calcCategory(cupL10Floor, 'cup', false);

    setTotalLoss(est);
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
        buildingBasementLossRatio: ratios.fabBldgBs / 100,
        buildingL10LossRatio: ratios.fabBldgL10 / 100,
        toolsBasementLossRatio: ratios.fabToolBs / 100,
        toolsL10LossRatio: ratios.fabToolL10 / 100,
        ffsBasementLossRatio: ratios.fabFacBs / 100,
        ffsL10LossRatio: ratios.fabFacL10 / 100,
        totalLossEstimateM: totalLoss
      });
      setAiInsights(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="h-2 bg-accent w-full" />
        <CardHeader>
          <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
            <Waves className="w-6 h-6 text-accent" /> Environmental Impact Modeling
          </CardTitle>
          <CardDescription>Simulate flood events using validated asset distribution ratios (NTD Million). Ratios for L20+ floors are 0%.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">L10 Critical Height (m)</Label>
              <Input 
                type="number" step="0.1" 
                value={l10Height || ''} 
                onChange={(e) => setL10Height(parseFloat(e.target.value) || 0)}
                className="bg-white border-none font-mono text-lg font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Simulated Flood Height AGL (m)</Label>
              <Input 
                type="number" step="0.1" 
                value={floodHeight || ''} 
                onChange={(e) => setFloodHeight(parseFloat(e.target.value) || 0)}
                className="bg-white border-none font-mono text-lg font-bold text-accent"
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
            <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-primary border-b border-primary/10 pb-4">
                  <Factory className="w-6 h-6" />
                  <h3 className="text-xl font-headline font-black uppercase tracking-tight">FAB Building Analysis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <AssetLossDetail 
                    title="Building" 
                    bs={ratios.fabBldgBs} l10={ratios.fabBldgL10} 
                    bsVal={plant.pdBuilding * assetDistribution.fabBs.bldgRatio}
                    l10Val={plant.pdBuilding * assetDistribution.fabL10Floor.bldgRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`fabBldg${k}`]: v }))}
                  />
                  <AssetLossDetail 
                    title="Production Tools" 
                    bs={ratios.fabToolBs} l10={ratios.fabToolL10} 
                    bsVal={plant.pdTools * assetDistribution.fabBs.toolRatio}
                    l10Val={plant.pdTools * assetDistribution.fabL10Floor.toolRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`fabTool${k}`]: v }))}
                  />
                  <AssetLossDetail 
                    title="Facility" 
                    bs={ratios.fabFacBs} l10={ratios.fabFacL10} 
                    bsVal={plant.pdFacility * assetDistribution.fabBs.facRatio}
                    l10Val={plant.pdFacility * assetDistribution.fabL10Floor.facRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`fabFac${k}`]: v }))}
                  />
                  <AssetLossDetail 
                    title="Fixture" 
                    bs={ratios.fabFixBs} l10={ratios.fabFixL10} 
                    bsVal={plant.pdFixture * assetDistribution.fabBs.fixRatio}
                    l10Val={plant.pdFixture * assetDistribution.fabL10Floor.fixRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`fabFix${k}`]: v }))}
                  />
                  <AssetLossDetail 
                    title="Stock" 
                    bs={ratios.fabStockBs} l10={ratios.fabStockL10} 
                    bsVal={plant.pdStock * assetDistribution.fabBs.stockRatio}
                    l10Val={plant.pdStock * assetDistribution.fabL10Floor.stockRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`fabStock${k}`]: v }))}
                  />
                </div>
              </div>

              <Separator className="bg-primary/10" />

              <div className="space-y-6">
                <div className="flex items-center gap-3 text-primary border-b border-primary/10 pb-4">
                  <Building2 className="w-6 h-6" />
                  <h3 className="text-xl font-headline font-black uppercase tracking-tight">CUP Building Analysis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <AssetLossDetail 
                    title="Building" 
                    bs={ratios.cupBldgBs} l10={ratios.cupBldgL10} 
                    bsVal={plant.pdBuilding * assetDistribution.cupBs.bldgRatio}
                    l10Val={plant.pdBuilding * assetDistribution.cupL10Floor.bldgRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`cupBldg${k}`]: v }))}
                  />
                  <AssetLossDetail 
                    title="Facility" 
                    bs={ratios.cupFacBs} l10={ratios.cupFacL10} 
                    bsVal={plant.pdFacility * assetDistribution.cupBs.facRatio}
                    l10Val={plant.pdFacility * assetDistribution.cupL10Floor.facRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`cupFac${k}`]: v }))}
                  />
                </div>
              </div>

              {totalLoss !== null && (
                <div className="p-8 rounded-3xl bg-primary text-primary-foreground flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-primary/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingDown className="w-40 h-40" />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Total Site Loss Estimation</p>
                    <h3 className="text-5xl font-headline font-black tracking-tighter tabular-nums">NTD {totalLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M</h3>
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

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep(5)} className="font-bold text-muted-foreground gap-2">
          <ArrowLeft className="w-4 h-4" /> Matrix Validation
        </Button>
      </div>
    </div>
  );
}

function AssetLossDetail({ 
  title, bs, l10, bsVal, l10Val, onChange 
}: { 
  title: string, bs: number, l10: number, bsVal: number, l10Val: number, 
  onChange: (k: string, v: number) => void
}) {
  return (
    <div className="p-3 rounded-xl border-2 border-primary/5 bg-white space-y-3 shadow-sm hover:border-accent/30 transition-colors">
      <h4 className="text-[10px] font-black uppercase tracking-wider text-primary border-b border-primary/5 pb-2 truncate">{title}</h4>
      <div className="space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase">
            <span>Basement</span>
            <span className="text-primary">NTD {bsVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-lg">
            <span className="text-[8px] font-bold text-muted-foreground/60 uppercase flex-grow">Loss %</span>
            <Input 
              type="number" value={bs} 
              onChange={(e) => onChange('Bs', parseFloat(e.target.value) || 0)}
              className="h-5 w-12 p-1 text-right font-mono text-[10px] border-none bg-white/50" 
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[9px] font-bold text-muted-foreground uppercase">
            <span>L10 Floor</span>
            <span className="text-primary">NTD {l10Val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M</span>
          </div>
          <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-lg">
            <span className="text-[8px] font-bold text-muted-foreground/60 uppercase flex-grow">Loss %</span>
            <Input 
              type="number" value={l10} 
              onChange={(e) => onChange('L10', parseFloat(e.target.value) || 0)}
              className="h-5 w-12 p-1 text-right font-mono text-[10px] border-none bg-white/50" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
