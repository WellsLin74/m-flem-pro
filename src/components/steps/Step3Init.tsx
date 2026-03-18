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
  
  const { register, handleSubmit, reset, watch } = useForm<Partial<PlantData>>({
    defaultValues: plant || {}
  });

  const values = watch();

  useEffect(() => {
    if (plant) reset(plant);
  }, [plant, reset]);

  const calculations = useMemo(() => {
    const fL = Number(values.fabLength) || 0;
    const fW = Number(values.fabWidth) || 0;
    const fAl = Number(values.fabAl) || 0;
    const fBl = Number(values.fabBl) || 0;
    const cL = Number(values.cupLength) || 0;
    const cW = Number(values.cupWidth) || 0;
    const cAl = Number(values.cupAl) || 0;
    const cBl = Number(values.cupBl) || 0;

    const fabTotal = (fL * fW) * (fAl + fBl);
    const cupTotal = (cL * cW) * (cAl + cBl);
    return { plantTotalArea: fabTotal + cupTotal };
  }, [values]);

  const onSubmit = (data: Partial<PlantData>) => {
    if (!plant?.id || !plant?.company) return;

    // 嚴格連動：將 P3 數據鎖定在 P2 生成的 plantId
    const numericData: PlantData = {
      id: plant.id,
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

    const plantRef = doc(db, 'plants', plant.id);
    setDocumentNonBlocking(plantRef, {
      id: plant.id,
      companyName: plant.company,
      plantName: plant.plantName,
      latitude: numericData.lat,
      longitude: numericData.lon,
      fabAboveLevel: numericData.fabAl,
      fabBelowLevel: numericData.fabBl,
      cupAboveLevel: numericData.cupAl,
      cupBelowLevel: numericData.cupBl,
      fabLength: numericData.fabLength,
      fabWidth: numericData.fabWidth,
      cupLength: numericData.cupLength,
      cupWidth: numericData.cupWidth,
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
        <CardDescription>Configure physical and financial values for {plant?.plantName}.</CardDescription>
      </CardHeader>
      <CardContent className="pb-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 rounded-xl border-2 border-primary/5 bg-primary/5 space-y-4">
              <div className="flex items-center gap-2 text-primary"><MapPin className="w-4 h-4" /><h3 className="text-xs font-black uppercase tracking-widest">Geo-Coordinates</h3></div>
              <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Latitude</Label><Input type="number" step="0.000001" {...register('lat')} className="bg-white border-none font-mono" /></div>
              <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Longitude</Label><Input type="number" step="0.000001" {...register('lon')} className="bg-white border-none font-mono" /></div>
            </div>

            <div className="p-4 rounded-xl border-2 border-accent/10 bg-accent/5 space-y-4">
              <div className="flex items-center gap-2 text-primary"><Maximize className="w-4 h-4" /><h3 className="text-xs font-black uppercase tracking-widest">FAB Specs (m)</h3></div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" {...register('fabLength')} placeholder="Len" className="bg-white border-none font-mono" />
                <Input type="number" {...register('fabWidth')} placeholder="Wid" className="bg-white border-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Input type="number" {...register('fabAl')} placeholder="Above" className="bg-white border-none font-mono" />
                <Input type="number" {...register('fabBl')} placeholder="Below" className="bg-white border-none font-mono" />
              </div>
            </div>

            <div className="p-4 rounded-xl border-2 border-accent/10 bg-accent/5 space-y-4">
              <div className="flex items-center gap-2 text-primary"><Maximize className="w-4 h-4" /><h3 className="text-xs font-black uppercase tracking-widest">CUP Specs (m)</h3></div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" {...register('cupLength')} placeholder="Len" className="bg-white border-none font-mono" />
                <Input type="number" {...register('cupWidth')} placeholder="Wid" className="bg-white border-none font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Input type="number" {...register('cupAl')} placeholder="Above" className="bg-white border-none font-mono" />
                <Input type="number" {...register('cupBl')} placeholder="Below" className="bg-white border-none font-mono" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-primary/10 bg-primary/10">
                <h3 className="text-[10px] font-black uppercase">Total Area: {calculations.plantTotalArea.toLocaleString()} m²</h3>
              </div>
              <div className="p-4 rounded-xl border-2 border-primary/5 bg-primary/5 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" {...register('pdBuilding')} placeholder="Bldg" className="h-8 bg-white border-none text-[10px]" />
                  <Input type="number" {...register('pdFacility')} placeholder="Fac" className="h-8 bg-white border-none text-[10px]" />
                  <Input type="number" {...register('pdTools')} placeholder="Tools" className="h-8 bg-white border-none text-[10px]" />
                  <Input type="number" {...register('pdFixture')} placeholder="Fix" className="h-8 bg-white border-none text-[10px]" />
                  <Input type="number" {...register('pdStock')} placeholder="Stock" className="h-8 bg-white border-none text-[10px]" />
                  <Input type="number" {...register('bi12m')} placeholder="BI" className="h-8 bg-white border-none text-[10px]" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <Button type="button" variant="ghost" onClick={() => setStep(2)} className="font-bold text-muted-foreground"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 text-lg gap-2 shadow-lg shadow-primary/20">Confirm & Refine <ChevronRight className="w-5 h-5" /></Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}