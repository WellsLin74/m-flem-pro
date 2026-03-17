'use client';

import { useAppStore, PlantData } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, LayoutDashboard, Coins, ChevronRight, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';

export function Step3Init() {
  const { plant, setPlant, setStep } = useAppStore();
  const { register, handleSubmit } = useForm<PlantData>({
    defaultValues: plant || {
      lat: 24.774, lon: 121.013,
      fabAl: 4, fabBl: 2,
      cupAl: 2, cupBl: 1,
      pdBuilding: 500, pdFacility: 200, pdTools: 1500, pdFixture: 50, pdStock: 300, bi12m: 1000
    }
  });

  const onSubmit = (data: PlantData) => {
    setPlant({ ...plant, ...data });
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Geo-Location */}
            <div className="p-4 rounded-xl border-2 border-primary/5 bg-primary/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">Geo-Coordinates</h3>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Latitude</Label>
                <Input type="number" step="0.001" {...register('lat')} className="bg-white border-none font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Longitude</Label>
                <Input type="number" step="0.001" {...register('lon')} className="bg-white border-none font-mono" />
              </div>
            </div>

            {/* FAB Dimensions */}
            <div className="p-4 rounded-xl border-2 border-accent/10 bg-accent/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <LayoutDashboard className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">FAB Levels</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Above Ground</Label>
                  <Input type="number" {...register('fabAl')} className="bg-white border-none font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Below Ground</Label>
                  <Input type="number" {...register('fabBl')} className="bg-white border-none font-mono" />
                </div>
              </div>
            </div>

            {/* CUP Dimensions */}
            <div className="p-4 rounded-xl border-2 border-accent/10 bg-accent/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <LayoutDashboard className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">CUP Levels</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Above Ground</Label>
                  <Input type="number" {...register('cupAl')} className="bg-white border-none font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Below Ground</Label>
                  <Input type="number" {...register('cupBl')} className="bg-white border-none font-mono" />
                </div>
              </div>
            </div>

            {/* Initial Financials */}
            <div className="p-4 rounded-xl border-2 border-primary/5 bg-primary/5 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Coins className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-widest">Asset Values (NTD M)</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Building</Label>
                  <Input type="number" {...register('pdBuilding')} className="bg-white border-none text-xs font-mono h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Facility</Label>
                  <Input type="number" {...register('pdFacility')} className="bg-white border-none text-xs font-mono h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tools</Label>
                  <Input type="number" {...register('pdTools')} className="bg-white border-none text-xs font-mono h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Fixture</Label>
                  <Input type="number" {...register('pdFixture')} className="bg-white border-none text-xs font-mono h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Stock</Label>
                  <Input type="number" {...register('pdStock')} className="bg-white border-none text-xs font-mono h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">BI (12M)</Label>
                  <Input type="number" {...register('bi12m')} className="bg-white border-none text-xs font-mono h-8" />
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
