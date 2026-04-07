'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Waves from 'lucide-react/dist/esm/icons/waves';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Building2 from 'lucide-react/dist/esm/icons/building-2';
import Factory from 'lucide-react/dist/esm/icons/factory';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import FileSpreadsheet from 'lucide-react/dist/esm/icons/file-spreadsheet';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

import { EstimationInputs } from './estimation/EstimationInputs';
import { AnalysisTable } from './estimation/AnalysisTable';
import { ImpactSummary } from './estimation/ImpactSummary';

export function Step6Estimation() {
  const { plant, finalRatios, refinement, setStep } = useAppStore();
  const db = useFirestore();
  const { toast } = useToast();
  const [fabL10Height, setFabL10Height] = useState(0);
  const [cupL10Height, setCupL10Height] = useState(0);
  const [floodHeight, setFloodHeight] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);
  
  const [ratios, setRatios] = useState<Record<string, number>>({
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

  const assetDistribution = useMemo(() => {
    if (!plant || !finalRatios) return null;
    const calculateAggregates = (floorFilter: (f: string) => boolean) => {
      let bldgRatio = 0, facRatio = 0, toolRatio = 0, fixRatio = 0, stockRatio = 0;
      Object.keys(finalRatios).filter(floorFilter).forEach(f => {
        const r = finalRatios[f];
        bldgRatio += r.bldg; facRatio += r.fac; toolRatio += r.tool; fixRatio += r.fix; stockRatio += r.stock;
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
    let estFab = 0; let estCup = 0;
    const { fabBs, fabL10Floor, cupBs, cupL10Floor } = assetDistribution;
    
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

    estCup += (plant.pdBuilding * cupBs.bldgRatio * (ratios.cupBldgBs / 100));
    estCup += (plant.pdBuilding * cupL10Floor.bldgRatio * (ratios.cupBldgL10 / 100));
    estCup += (plant.pdFacility * cupBs.facRatio * (ratios.cupFacBs / 100));
    estCup += (plant.pdFacility * cupL10Floor.facRatio * (ratios.cupFacL10 / 100));

    const finalFab = Number(estFab.toFixed(1));
    const finalCup = Number(estCup.toFixed(1));
    const finalTotal = Number((finalFab + finalCup).toFixed(1));

    setFabLoss(finalFab); setCupLoss(finalCup); setTotalLoss(finalTotal);

    const estimationRef = doc(db, 'flood_loss_estimations', `${plant.id}-${Date.now()}`);
    setDocumentNonBlocking(estimationRef, {
      id: `${plant.id}-${Date.now()}`, companyName: plant.company, plantName: plant.plantName,
      fabL10Height, cupL10Height, floodHeightAgl: floodHeight,
      estimatedTotalLoss: finalTotal, estimatedFabLoss: finalFab, estimatedCupLoss: finalCup,
      estimationTimestamp: new Date().toISOString(),
    }, { merge: true });
  };

  const handleDownloadJpg = async () => {
    if (reportRef.current === null) return;
    try {
      const { toJpeg } = await import('html-to-image');
      const dataUrl = await toJpeg(reportRef.current, { quality: 0.95, backgroundColor: '#f8fafc', fontEmbedCSS: '' });
      const link = document.createElement('a');
      link.download = `MFLE_REPORT_${(plant?.company || 'CO').replace(/\s+/g, '_')}_${(plant?.plantName || 'PL').replace(/\s+/g, '_')}.jpg`;
      link.href = dataUrl; link.click();
    } catch (err) { console.error('Failed to export image', err); }
  };

  const handleDownloadExcel = async () => {
    if (!plant || !finalRatios || !refinement) return;
    const XLSX = await import('xlsx');
    const wsData: any[][] = [[`M-FLEM Pro Integrated Report - ${plant.company} ${plant.plantName}`], []];
    wsData.push(['--- Organization & Plant Configuration ---'], ['Company', plant.company], ['Site', plant.plantName], [`${plant.lat}, ${plant.lon}`], []);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "M-FLEM Report");
    XLSX.writeFile(wb, `MFLE_REPORT_${plant.company.replace(/\s+/g, '_')}.xlsx`);
  };

  const formatNum = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const handleRatioChange = (key: string, val: string) => setRatios(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));

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
              {totalLoss !== null && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadExcel} className="font-bold gap-2 text-xs border-emerald-600 text-emerald-600">
                    <FileSpreadsheet className="w-4 h-4" /> Export to Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadJpg} className="font-bold gap-2 text-xs border-primary text-primary">
                    <ImageIcon className="w-4 h-4" /> Export View as JPG
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-10">
            <EstimationInputs 
              fabL10Height={fabL10Height} setFabL10Height={setFabL10Height}
              cupL10Height={cupL10Height} setCupL10Height={setCupL10Height}
              floodHeight={floodHeight} setFloodHeight={setFloodHeight}
              onCalculate={calculate}
            />

            {plant && assetDistribution && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <AnalysisTable 
                  title="FAB Building Loss Analysis" icon={<Factory className="w-8 h-8 text-accent" />}
                  ratios={ratios} onRatioChange={handleRatioChange} formatNum={formatNum}
                  levels={[
                    { name: 'Basement', 
                      valueData: { bldg: plant.pdBuilding * assetDistribution.fabBs.bldgRatio, tool: plant.pdTools * assetDistribution.fabBs.toolRatio, fac: plant.pdFacility * assetDistribution.fabBs.facRatio, fix: plant.pdFixture * assetDistribution.fabBs.fixRatio, stock: plant.pdStock * assetDistribution.fabBs.stockRatio },
                      ratioKeys: { bldg: 'fabBldgBs', tool: 'fabToolBs', fac: 'fabFacBs', fix: 'fabFixBs', stock: 'fabStockBs' }
                    },
                    { name: 'L10 Level', 
                      valueData: { bldg: plant.pdBuilding * assetDistribution.fabL10Floor.bldgRatio, tool: plant.pdTools * assetDistribution.fabL10Floor.toolRatio, fac: plant.pdFacility * assetDistribution.fabL10Floor.facRatio, fix: plant.pdFixture * assetDistribution.fabL10Floor.fixRatio, stock: plant.pdStock * assetDistribution.fabL10Floor.stockRatio },
                      ratioKeys: { bldg: 'fabBldgL10', tool: 'fabToolL10', fac: 'fabFacL10', fix: 'fabFixL10', stock: 'fabStockL10' }
                    }
                  ]}
                />
                <AnalysisTable 
                  title="CUP Building Loss Analysis" icon={<Building2 className="w-8 h-8 text-accent" />}
                  ratios={ratios} onRatioChange={handleRatioChange} formatNum={formatNum}
                  levels={[
                    { name: 'Basement', 
                      valueData: { bldg: plant.pdBuilding * assetDistribution.cupBs.bldgRatio, fac: plant.pdFacility * assetDistribution.cupBs.facRatio },
                      ratioKeys: { bldg: 'cupBldgBs', fac: 'cupFacBs' }
                    },
                    { name: 'L10 Level', 
                      valueData: { bldg: plant.pdBuilding * assetDistribution.cupL10Floor.bldgRatio, fac: plant.pdFacility * assetDistribution.cupL10Floor.facRatio },
                      ratioKeys: { bldg: 'cupBldgL10', fac: 'cupFacL10' }
                    }
                  ]}
                />
                <ImpactSummary fabLoss={fabLoss} cupLoss={cupLoss} totalLoss={totalLoss} formatNum={formatNum} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-between px-2">
        <Button variant="ghost" onClick={() => setStep(5)} className="font-bold text-muted-foreground gap-2 hover:bg-primary/5">
          <ArrowLeft className="w-4 h-4" /> Return to Validation Matrix
        </Button>
      </div>
    </div>
  );
}
