'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateFloodRiskInsights } from '@/ai/flows/generate-flood-risk-insights';
import { TrendingDown, Waves, Sparkles, ArrowLeft, Download, Building2, Factory } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export function Step6Estimation() {
  const { plant, finalRatios, setStep } = useAppStore();
  const [l10Height, setL10Height] = useState(5.5);
  const [floodHeight, setFloodHeight] = useState(2.0);
  
  const [ratios, setRatios] = useState({
    fabBldgBs: 20, fabBldgL10: 20,
    fabToolBs: 100, fabToolL10: 100,
    fabFfsBs: 100,
    cupBldgBs: 20, cupBldgL10: 20,
    cupToolBs: 100, cupToolL10: 100,
    cupFfsBs: 100,
  });

  const [totalLoss, setTotalLoss] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  const assetDistribution = useMemo(() => {
    if (!plant || !finalRatios) return null;

    const floors = Object.keys(finalRatios);

    const calculateAggregates = (floorFilter: (f: string) => boolean) => {
      let bldgRatio = 0, facRatio = 0, toolRatio = 0, fixRatio = 0;
      floors.filter(floorFilter).forEach(f => {
        const r = finalRatios[f];
        bldgRatio += r.bldg;
        facRatio += r.fac;
        toolRatio += r.tool;
        fixRatio += r.fix;
      });
      return { bldgRatio, facRatio, toolRatio, fixRatio };
    };

    return {
      fabBs: calculateAggregates(f => f.startsWith('FAB') && f.includes('BL')),
      fabL10: calculateAggregates(f => f.startsWith('FAB') && f.includes('-L')),
      cupBs: calculateAggregates(f => f.startsWith('CUP') && f.includes('BL')),
      cupL10: calculateAggregates(f => f.startsWith('CUP') && f.includes('-L'))
    };
  }, [plant, finalRatios]);

  const ffsL10Ratio = useMemo(() => Math.min(100, Math.max(0, (floodHeight / l10Height) * 100)), [floodHeight, l10Height]);

  const calculate = () => {
    if (!plant || !assetDistribution) return;
    
    let est = 0;
    const { fabBs, fabL10, cupBs, cupL10 } = assetDistribution;
    
    // FAB Calculation
    est += (plant.pdBuilding * fabBs.bldgRatio * (ratios.fabBldgBs / 100));
    est += (plant.pdBuilding * fabL10.bldgRatio * (ratios.fabBldgL10 / 100));
    est += (plant.pdTools * fabBs.toolRatio * (ratios.fabToolBs / 100));
    est += (plant.pdTools * fabL10.toolRatio * (ratios.fabToolL10 / 100));
    
    const fabFfsAssets = plant.pdFacility + plant.pdStock + plant.pdFixture;
    est += (fabFfsAssets * fabBs.facRatio * (ratios.fabFfsBs / 100));
    est += (fabFfsAssets * fabL10.facRatio * (ffsL10Ratio / 100));

    // CUP Calculation
    est += (plant.pdBuilding * cupBs.bldgRatio * (ratios.cupBldgBs / 100));
    est += (plant.pdBuilding * cupL10.bldgRatio * (ratios.cupBldgL10 / 100));
    est += (plant.pdTools * cupBs.toolRatio * (ratios.cupToolBs / 100));
    est += (plant.pdTools * cupL10.toolRatio * (ratios.cupToolL10 / 100));
    
    const cupFfsAssets = plant.pdFacility + plant.pdStock + plant.pdFixture;
    est += (cupFfsAssets * cupBs.facRatio * (ratios.cupFfsBs / 100));
    est += (cupFfsAssets * cupL10.facRatio * (ffsL10Ratio / 100));

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
        ffsBasementLossRatio: ratios.fabFfsBs / 100,
        ffsL10LossRatio: ffsL10Ratio / 100,
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
          <CardDescription>Simulate flood events using validated asset distribution ratios (NTD Million).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">L10 Critical Height (m)</Label>
              <Input 
                type="number" step="0.1" 
                value={l10Height} 
                onChange={(e) => setL10Height(parseFloat(e.target.value) || 0)}
                className="bg-white border-none font-mono text-lg font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase">Simulated Flood Height AGL (m)</Label>
              <Input 
                type="number" step="0.1" 
                value={floodHeight} 
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
              {/* FAB Building Analysis */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-primary">
                  <Factory className="w-6 h-6" />
                  <h3 className="text-xl font-headline font-black uppercase tracking-tight">FAB Building Analysis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LossCard 
                    title="Building" 
                    bs={ratios.fabBldgBs} 
                    l10={ratios.fabBldgL10} 
                    bsValue={plant.pdBuilding * assetDistribution.fabBs.bldgRatio}
                    l10Value={plant.pdBuilding * assetDistribution.fabL10.bldgRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`fabBldg${k}`]: v }))} 
                  />
                  <LossCard 
                    title="Production Tools" 
                    bs={ratios.fabToolBs} 
                    l10={ratios.fabToolL10} 
                    bsValue={plant.pdTools * assetDistribution.fabBs.toolRatio}
                    l10Value={plant.pdTools * assetDistribution.fabL10.toolRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`fabTool${k}`]: v }))} 
                  />
                  <LossCard 
                    title="FFS (Facility/Fix/Stock)" 
                    bs={ratios.fabFfsBs} 
                    l10={ffsL10Ratio} 
                    bsValue={(plant.pdFacility + plant.pdStock + plant.pdFixture) * assetDistribution.fabBs.facRatio}
                    l10Value={(plant.pdFacility + plant.pdStock + plant.pdFixture) * assetDistribution.fabL10.facRatio}
                    onChange={() => {}} 
                    readonly 
                  />
                </div>
              </div>

              <Separator className="bg-primary/10" />

              {/* CUP Building Analysis */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-primary">
                  <Building2 className="w-6 h-6" />
                  <h3 className="text-xl font-headline font-black uppercase tracking-tight">CUP Building Analysis</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <LossCard 
                    title="Building" 
                    bs={ratios.cupBldgBs} 
                    l10={ratios.cupBldgL10} 
                    bsValue={plant.pdBuilding * assetDistribution.cupBs.bldgRatio}
                    l10Value={plant.pdBuilding * assetDistribution.cupL10.bldgRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`cupBldg${k}`]: v }))} 
                  />
                  <LossCard 
                    title="Production Tools" 
                    bs={ratios.cupToolBs} 
                    l10={ratios.cupToolL10} 
                    bsValue={plant.pdTools * assetDistribution.cupBs.toolRatio}
                    l10Value={plant.pdTools * assetDistribution.cupL10.toolRatio}
                    onChange={(k, v) => setRatios(p => ({ ...p, [`cupTool${k}`]: v }))} 
                  />
                  <LossCard 
                    title="FFS (Facility/Fix/Stock)" 
                    bs={ratios.cupFfsBs} 
                    l10={ffsL10Ratio} 
                    bsValue={(plant.pdFacility + plant.pdStock + plant.pdFixture) * assetDistribution.cupBs.facRatio}
                    l10Value={(plant.pdFacility + plant.pdStock + plant.pdFixture) * assetDistribution.cupL10.facRatio}
                    onChange={() => {}} 
                    readonly 
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

function LossCard({ 
  title, 
  bs, 
  l10, 
  bsValue, 
  l10Value, 
  onChange, 
  readonly = false 
}: { 
  title: string, 
  bs: number, 
  l10: number, 
  bsValue: number, 
  l10Value: number, 
  onChange: (k: string, v: number) => void, 
  readonly?: boolean 
}) {
  return (
    <div className="p-4 rounded-xl border-2 border-primary/5 bg-white space-y-4 shadow-sm">
      <h4 className="text-xs font-black uppercase tracking-wider text-primary border-b border-primary/10 pb-2">{title}</h4>
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Basement Asset</span>
            <span className="text-[10px] font-mono font-bold text-primary">NTD {bsValue.toFixed(2)}M</span>
          </div>
          <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg">
            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase">Loss Ratio</span>
            <div className="flex items-center gap-1">
              <Input 
                type="number" 
                value={bs} 
                disabled={readonly}
                onChange={(e) => onChange('Bs', parseFloat(e.target.value) || 0)}
                className="h-6 w-14 p-1 text-right font-mono text-xs border-none bg-transparent" 
              />
              <span className="text-[10px] font-bold text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">L10 Asset</span>
            <span className="text-[10px] font-mono font-bold text-primary">NTD {l10Value.toFixed(2)}M</span>
          </div>
          <div className="flex justify-between items-center bg-muted/20 p-2 rounded-lg">
            <span className="text-[9px] font-bold text-muted-foreground/70 uppercase">Loss Ratio</span>
            <div className="flex items-center gap-1">
              <Input 
                type="number" 
                value={l10.toFixed(1)} 
                disabled={readonly}
                onChange={(e) => onChange('L10', parseFloat(e.target.value) || 0)}
                className="h-6 w-14 p-1 text-right font-mono text-xs border-none bg-transparent" 
              />
              <span className="text-[10px] font-bold text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
