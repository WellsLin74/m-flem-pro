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

    // Update Local State
    setPlant(numericData);

    // Persist to Consolidated 'plants' collection
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
        <CardDescription>Configure physical dimensions and initial financial values for {plant?.plantName}.</CardDescription>
      </CardHeader>
      <CardContent className="pb-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Geo-Location Section */}
            <div className="p-6 rounded-2xl border-2 border-primary/5 bg-primary/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-widest">Site Location</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lat" className="text-[10px] font-bold uppercase text-muted-foreground">Latitude (N)</Label>
                  <Input id="lat" type="number" step="0.000001" {...register('lat')} className="bg-white border-none font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lon" className="text-[10px] font-bold uppercase text-muted-foreground">Longitude (E)</Label>
                  <Input id="lon" type="number" step="0.000001" {...register('lon')} className="bg-white border-none font-mono font-bold" />
                </div>
              </div>
            </div>

            {/* FAB Specs Section */}
            <div className="p-6 rounded-2xl border-2 border-accent/10 bg-accent/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Maximize className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-widest">FAB Dimensions (m)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Length</Label>
                  <Input type="number" {...register('fabLength')} placeholder="200" className="bg-white border-none font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Width</Label>
                  <Input type="number" {...register('fabWidth')} placeholder="150" className="bg-white border-none font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Floors Above</Label>
                  <Input type="number" {...register('fabAl')} placeholder="4" className="bg-white border-none font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Basements</Label>
                  <Input type="number" {...register('fabBl')} placeholder="2" className="bg-white border-none font-mono font-bold" />
                </div>
              </div>
            </div>

            {/* CUP Specs Section */}
            <div className="p-6 rounded-2xl border-2 border-accent/10 bg-accent/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Maximize className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-widest">CUP Dimensions (m)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Length</Label>
                  <Input type="number" {...register('cupLength')} placeholder="100" className="bg-white border-none font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Width</Label>
                  <Input type="number" {...register('cupWidth')} placeholder="80" className="bg-white border-none font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Floors Above</Label>
                  <Input type="number" {...register('cupAl')} placeholder="2" className="bg-white border-none font-mono font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Basements</Label>
                  <Input type="number" {...register('cupBl')} placeholder="1" className="bg-white border-none font-mono font-bold" />
                </div>
              </div>
            </div>
          </div>

          {/* Financial Values Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-primary/5 pb-2">
              <Coins className="w-5 h-5 text-accent" />
              <h3 className="text-sm font-black uppercase tracking-widest text-primary">Initial Asset Values (Million NTD)</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Building</Label>
                <Input type="number" {...register('pdBuilding')} className="bg-muted/30 border-none font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Facility</Label>
                <Input type="number" {...register('pdFacility')} className="bg-muted/30 border-none font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tools</Label>
                <Input type="number" {...register('pdTools')} className="bg-muted/30 border-none font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Fixture</Label>
                <Input type="number" {...register('pdFixture')} className="bg-muted/30 border-none font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Stock</Label>
                <Input type="number" {...register('pdStock')} className="bg-muted/30 border-none font-mono font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">BI (12M)</Label>
                <Input type="number" {...register('bi12m')} className="bg-muted/30 border-none font-mono font-bold" />
              </div>
            </div>
          </div>

          {/* Area Summary */}
          <div className="p-4 rounded-xl bg-primary text-primary-foreground flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Total Estimated Construction Area:</span>
            </div>
            <span className="text-xl font-black font-mono tracking-tighter">{calculations.plantTotalArea.toLocaleString()} m²</span>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button type="button" variant="ghost" onClick={() => setStep(2)} className="font-bold text-muted-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Config
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 text-lg gap-2 shadow-lg shadow-primary/20">
              Confirm & Refine <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
