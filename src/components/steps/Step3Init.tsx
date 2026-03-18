'use client';

import { useAppStore, PlantData } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, LayoutDashboard, Coins, ChevronRight, ArrowLeft, Maximize, Ruler } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step3Init() {
  const { plant, setPlant, setStep } = useAppStore();
  const db = useFirestore();
  
  const { register, handleSubmit, watch, reset } = useForm<Partial<PlantData>>({
    defaultValues: plant || {}
  });

  useEffect(() => {
    if (plant) {
      reset(plant);
    }
  }, [plant, reset]);

  const values = watch();
  
  const calculations = useMemo(() => {
    const fL = Number(values.fabLength) || 0;
    const fW = Number(values.fabWidth) || 0;
    const fAl = Number(values.fabAl) || 0;
    const fBl = Number(values.fabBl) || 0;
    
    const cL = Number(values.cupLength) || 0;
    const cW = Number(values.cupWidth) || 0;
    const cAl = Number(values.cupAl) || 0;
    const cBl = Number(values.cupBl) || 0;

    const fabSingleArea = fL * fW;
    const fabTotalArea = fabSingleArea * (fAl + fBl);
    
    const cupSingleArea = cL * cW;
    const cupTotalArea = cupSingleArea * (cAl + cBl);
    
    const plantTotalArea = fabTotalArea + cupTotalArea;

    return {
      fabSingleArea,
      fabTotalArea,
      cupSingleArea,
      cupTotalArea,
      plantTotalArea
    };
  }, [values]);

  const onSubmit = (data: Partial<PlantData>) => {
    if (!plant) return;

    // 確保 ID 被完整傳遞
    const numericData: PlantData = {
      id: plant.id, // 關鍵：保留工廠編號
      company: plant.company,
      plantName: plant.plantName,
      lat: Number(data.lat) || 0,
      lon: Number(data.lon) || 0,
      fabLength: Number(data.fabLength) || 0,
      fabWidth: Number(data.fabWidth) || 0,
      fabAl: Number(data.fabAl) || 0,
      fabBl: Number(data.fabBl) || 0,
      cupLength: Number(data.cupLength) || 0,
      cupWidth: Number(data.cupWidth) || 0,
      cupAl: Number(data.cupAl) || 0,
      cupBl: Number(data.cupBl) || 0,
      pdBuilding: Number(data.pdBuilding) || 0,
      pdFacility: Number(data.pdFacility) || 0,
      pdTools: Number(data.pdTools) || 0,
      pdFixture: Number(data.pdFixture) || 0,
      pdStock: Number(data.pdStock) || 0,
      bi12m: Number(data.bi12m) || 0,
    };

    setPlant(numericData);

    const plantId = plant.id;

    // 1. 更新 Building Info，使用工廠編號作為 ID
    const buildingRef = doc(db, 'building_info', plantId);
    setDocumentNonBlocking(buildingRef, {
      id: plantId,
      companyName: numericData.company,
      plantName: numericData.plantName,
      latitude: numericData.lat,
      longitude: numericData.lon,
      fabAboveLevel: numericData.fabAl,
      fabBelowLevel: numericData.fabBl,
      cupAboveLevel: numericData.cupAl,
      cupBelowLevel: numericData.cupBl,
    }, { merge: true });

    // 2. 持久化 Plant Initial Values，文件 ID 與工廠編號連動
    const plantValId = `${plantId}-init`;
    const plantValRef = doc(db, 'plant_initial_values', plantValId);
    setDocumentNonBlocking(plantValRef, {
      id: plantValId,
      companyName: numericData.company,
      plantName: numericData.plantName,
      buildingValue: numericData.pdBuilding,
      facilityValue: numericData.pdFacility,
      toolsValue: numericData.pdTools,
      fixtureValue: numericData.pdFixture,
      stockValue: numericData.pdStock,
      bi12mValue: numericData.bi12m,
    }, { merge: true });

    setStep(4);
  };

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
      <div className="h-2 bg-accent w-full" />
      <CardHeader>
        <CardTitle className="font-headline font-black text-2xl text-primary">Baseline Data Initialization</CardTitle>
        <CardDescription>Configure physical dimensions and initial financial values for {plant?.company} - {plant?.plantName}.</CardDescription>
      </CardHeader>
      <CardContent className="pb-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 rounded-xl border-2 border-primary/5 bg-primary/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">Geo-Coordinates</h3>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Latitude</Label>
                <input type="number" step="0.001" {...register('lat')} placeholder="0.000" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Longitude</Label>
                <input type="number" step="0.001" {...register('lon')} placeholder="0.000" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 border-accent/10 bg-accent/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Maximize className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">FAB Footprint (m)</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Length</Label>
                  <input type="number" {...register('fabLength')} placeholder="0" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Width</Label>
                  <input type="number" {...register('fabWidth')} placeholder="0" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-primary pt-2">
                <LayoutDashboard className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">FAB Levels</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Above Ground</Label>
                  <input type="number" {...register('fabAl')} placeholder="0" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Below Ground</Label>
                  <input type="number" {...register('fabBl')} placeholder="0" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
                </div>
              </div>
              <div className="pt-2 border-t border-primary/10 space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Single Floor:</span>
                  <span className="text-primary">{calculations.fabSingleArea.toLocaleString()} m²</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-muted-foreground">Total Floor Area:</span>
                  <span className="text-primary">{calculations.fabTotalArea.toLocaleString()} m²</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 border-accent/10 bg-accent/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Maximize className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">CUP Footprint (m)</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Length</Label>
                  <input type="number" {...register('cupLength')} placeholder="0" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Width</Label>
                  <input type="number" {...register('cupWidth')} placeholder="0" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-primary pt-2">
                <LayoutDashboard className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">CUP Levels</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Above Ground</Label>
                  <input type="number" {...register('cupAl')} placeholder="0" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Below Ground</Label>
                  <input type="number" {...register('cupBl')} placeholder="0" className="flex h-10 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm font-mono" />
                </div>
              </div>
              <div className="pt-2 border-t border-primary/10 space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-muted-foreground">Single Floor:</span>
                  <span className="text-primary">{calculations.cupSingleArea.toLocaleString()} m²</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-muted-foreground">Total Floor Area:</span>
                  <span className="text-primary">{calculations.cupTotalArea.toLocaleString()} m²</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-primary/10 bg-primary/10 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Ruler className="w-4 h-4" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Plant Total Area</h3>
                </div>
                <div className="text-xl font-headline font-black text-primary">
                  {calculations.plantTotalArea.toLocaleString()} <span className="text-xs">m²</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border-2 border-primary/5 bg-primary/5 space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <Coins className="w-4 h-4" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Asset Values (NTD M)</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Building</Label>
                    <input type="number" {...register('pdBuilding')} placeholder="0" className="flex h-8 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Facility</Label>
                    <input type="number" {...register('pdFacility')} placeholder="0" className="flex h-8 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tools</Label>
                    <input type="number" {...register('pdTools')} placeholder="0" className="flex h-8 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Fixture</Label>
                    <input type="number" {...register('pdFixture')} placeholder="0" className="flex h-8 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Stock</Label>
                    <input type="number" {...register('pdStock')} placeholder="0" className="flex h-8 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">BI (12M)</Label>
                    <input type="number" {...register('bi12m')} placeholder="0" className="flex h-8 w-full rounded-md border-none bg-white px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-xs font-mono" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <Button type="button" variant="ghost" onClick={() => setStep(2)} className="font-bold text-muted-foreground gap-2">
              <ArrowLeft className="w-4 h-4" /> Configuration
            </Button>
            <Button 
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 text-lg gap-2 shadow-lg shadow-primary/20"
            >
              Confirm & Refine <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
