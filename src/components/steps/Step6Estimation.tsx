'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { generateFloodRiskInsights } from '@/ai/flows/generate-flood-risk-insights';
import { TrendingDown, Waves, Sparkles, ArrowLeft, Download } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Step6Estimation() {
  const { plant, refinement, setStep } = useAppStore();
  const [l10Height, setL10Height] = useState(5.5);
  const [floodHeight, setFloodHeight] = useState(2.0);
  
  const [ratios, setRatios] = useState({
    bldgBs: 20, bldgL10: 20,
    toolBs: 100, toolL10: 100,
    ffsBs: 100, ffsL10: 0
  });

  const [totalLoss, setTotalLoss] = useState<number | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Synchronize distribution ratios with Step 5 logic
  const assetDistribution = useMemo(() => {
    if (!plant || !refinement) return null;

    const floors: string[] = [];
    // FAB Floors
    for (let i = plant.fabBl; i >= 1; i--) floors.push(`FAB-BL${i}0`);
    for (let j = 1; j <= plant.fabAl; j++) floors.push(`FAB-L${j}0`);
    // CUP Floors
    for (let i = plant.cupBl; i >= 1; i--) floors.push(`CUP-BL${i}0`);
    for (let j = 1; j <= plant.cupAl; j++) floors.push(`CUP-L${j}0`);

    const totalFacSum = Object.values(refinement.floorData).reduce((sum, f) => sum + f.fac, 0);
    const totalCrSum = Object.values(refinement.floorData).reduce((sum, f) => sum + f.cr, 0);

    const fabFloors = floors.filter(f => f.startsWith('FAB'));
    const cupFloors = floors.filter(f => f.startsWith('CUP'));

    const calculateRatiosForFloors = (floorFilter: (f: string) => boolean) => {
      let bldgRatio = 0, facRatio = 0, toolRatio = 0, fixRatio = 0;
      
      const filtered = floors.filter(floorFilter);
      
      filtered.forEach(f => {
        const fData = refinement.floorData[f];
        if (!fData) return;

        // Building Ratio
        if (f.startsWith('FAB')) {
          bldgRatio += (0.9 / fabFloors.length);
        } else if (f.startsWith('CUP')) {
          bldgRatio += (0.1 / cupFloors.length);
        }
        
        // Facility Ratio
        const facCrPart = totalCrSum > 0 ? (fData.cr / totalCrSum) * refinement.facCrRatio : 0;
        const facNonCrPart = totalFacSum > 0 ? (fData.fac / totalFacSum) * (1 - refinement.facCrRatio) : 0;
        facRatio += (facCrPart + facNonCrPart);

        // Tools Ratio
        const toolCrPart = totalCrSum > 0 ? (fData.cr / totalCrSum) * refinement.toolsCrRatio : 0;
        const toolNonCrPart = totalFacSum > 0 ? (fData.fac / totalFacSum) * (1 - refinement.toolsCrRatio) : 0;
        toolRatio += (toolCrPart + toolNonCrPart);

        // Fixture Ratio
        fixRatio += (1.0 / floors.length);
      });

      return { bldgRatio, facRatio, toolRatio, fixRatio };
    };

    const bsDist = calculateRatiosForFloors(f => f.includes('BL'));
    const l10Dist = calculateRatiosForFloors(f => f.includes('-L'));

    return { bsDist, l10Dist };
  }, [plant, refinement]);

  const calculate = () => {
    if (!plant || !assetDistribution) return;
    
    const l10Dynamic = Math.min(100, Math.max(0, (floodHeight / l10Height) * 100));
    setRatios(prev => ({ ...prev, ffsL10: Number(l10Dynamic.toFixed(1)) }));

    const { bsDist, l10Dist } = assetDistribution;
    
    let est = 0;
    
    // Building Loss
    est += (plant.pdBuilding * bsDist.bldgRatio * (ratios.bldgBs / 100));
    est += (plant.pdBuilding * l10Dist.bldgRatio * (ratios.bldgL10 / 100));
    
    // Tools Loss
    est += (plant.pdTools * bsDist.toolRatio * (ratios.toolBs / 100));
    est += (plant.pdTools * l10Dist.toolRatio * (ratios.toolL10 / 100));
    
    // Facility, Fixture, Stock (FFS) Loss
    const facAssets = plant.pdFacility + plant.pdStock;
    est += (facAssets * bsDist.facRatio * (ratios.ffsBs / 100));
    est += (facAssets * l10Dist.facRatio * (l10Dynamic / 100));

    // Fixture Loss
    est += (plant.pdFixture * bsDist.fixRatio * (ratios.ffsBs / 100));
    est += (plant.pdFixture * l10Dist.fixRatio * (l10Dynamic / 100));

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
        buildingBasementLossRatio: ratios.bldgBs / 100,
        buildingL10LossRatio: ratios.bldgL10 / 100,
        toolsBasementLossRatio: ratios.toolBs / 100,
        toolsL10LossRatio: ratios.toolL10 / 100,
        ffsBasementLossRatio: ratios.ffsBs / 100,
        ffsL10LossRatio: ratios.ffsL10 / 100,
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
          <CardDescription>Simulate flood events and calculate direct financial exposure (NTD Million).</CardDescription>
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
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LossCard 
                  title="Building" 
                  bs={ratios.bldgBs} 
                  l10={ratios.bldgL10} 
                  bsValue={plant.pdBuilding * assetDistribution.bsDist.bldgRatio}
                  l10Value={plant.pdBuilding * assetDistribution.l10Dist.bldgRatio}
                  onChange={(k, v) => setRatios(p => ({ ...p, [k]: v }))} 
                  prefix="bldg" 
                />
                <LossCard 
                  title="Production Tools" 
                  bs={ratios.toolBs} 
                  l10={ratios.toolL10} 
                  bsValue={plant.pdTools * assetDistribution.bsDist.toolRatio}
                  l10Value={plant.pdTools * assetDistribution.l10Dist.toolRatio}
                  onChange={(k, v) => setRatios(p => ({ ...p, [k]: v }))} 
                  prefix="tool" 
                />
                <LossCard 
                  title="FFS (Facility/Fix/Stock)" 
                  bs={ratios.ffsBs} 
                  l10={ratios.ffsL10} 
                  bsValue={
                    (plant.pdFacility * assetDistribution.bsDist.facRatio) + 
                    (plant.pdStock * assetDistribution.bsDist.facRatio) + 
                    (plant.pdFixture * assetDistribution.bsDist.fixRatio)
                  }
                  l10Value={
                    (plant.pdFacility * assetDistribution.l10Dist.facRatio) + 
                    (plant.pdStock * assetDistribution.l10Dist.facRatio) + 
                    (plant.pdFixture * assetDistribution.l10Dist.fixRatio)
                  }
                  onChange={() => {}} 
                  prefix="ffs" 
                  readonly 
                />
              </div>

              {totalLoss !== null && (
                <div className="p-8 rounded-3xl bg-primary text-primary-foreground flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-primary/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingDown className="w-40 h-40" />
                  </div>
                  <div className="space-y-1 relative z-10">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Consolidated Estimation</p>
                    <h3 className="text-5xl font-headline font-black tracking-tighter tabular-nums">NTD {totalLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M <span className="text-xl font-medium opacity-50 uppercase ml-2">NTD</span></h3>
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
  prefix, 
  readonly = false 
}: { 
  title: string, 
  bs: number, 
  l10: number, 
  bsValue: number, 
  l10Value: number, 
  onChange: (k: string, v: number) => void, 
  prefix: string, 
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
                onChange={(e) => onChange(`${prefix}Bs`, parseFloat(e.target.value) || 0)}
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
                value={l10} 
                disabled={readonly}
                onChange={(e) => onChange(`${prefix}L10`, parseFloat(e.target.value) || 0)}
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
