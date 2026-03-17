'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Building2, Factory, ChevronRight, ArrowLeft } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step2Config() {
  const { user, plant, setPlant, setStep } = useAppStore();
  const [plantName, setPlantName] = useState(plant?.plantName || '');
  const [companyName, setCompanyName] = useState(plant?.company || user?.assignedCompany || '');
  const db = useFirestore();

  const handleNext = () => {
    if (!plantName || !companyName) return;
    
    const plantData = {
      ...(plant || {}),
      company: companyName,
      plantName,
      lat: plant?.lat || 24.774,
      lon: plant?.lon || 121.013,
      fabLength: plant?.fabLength || 200,
      fabWidth: plant?.fabWidth || 150,
      fabAl: plant?.fabAl || 4,
      fabBl: plant?.fabBl || 2,
      cupLength: plant?.cupLength || 100,
      cupWidth: plant?.cupWidth || 80,
      cupAl: plant?.cupAl || 2,
      cupBl: plant?.cupBl || 1,
      pdBuilding: plant?.pdBuilding || 500,
      pdFacility: plant?.pdFacility || 200,
      pdTools: plant?.pdTools || 1500,
      pdFixture: plant?.pdFixture || 50,
      pdStock: plant?.pdStock || 300,
      bi12m: plant?.bi12m || 1000,
    } as any;

    setPlant(plantData);

    // Persist to Firestore (BuildingInfo)
    const buildingInfoId = `${companyName.replace(/\s+/g, '_')}-${plantName.replace(/\s+/g, '_')}`;
    const buildingRef = doc(db, 'building_info', buildingInfoId);
    setDocumentNonBlocking(buildingRef, {
      id: buildingInfoId,
      companyName,
      plantName,
      latitude: plantData.lat,
      longitude: plantData.lon,
      fabAboveLevel: plantData.fabAl,
      fabBelowLevel: plantData.fabBl,
      cupAboveLevel: plantData.cupAl,
      cupBelowLevel: plantData.cupBl,
    }, { merge: true });

    setStep(3);
  };

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="h-2 bg-accent w-full" />
      <CardHeader>
        <CardTitle className="font-headline font-black text-2xl text-primary">Organizational Identity</CardTitle>
        <CardDescription>Define the scope of this flood loss assessment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Building2 className="w-5 h-5" />
              <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Company Entity</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-xs font-bold uppercase text-muted-foreground">Entity Name</Label>
              <Input 
                id="company" 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Microelectronics"
                className="bg-muted/50 border-none font-bold text-primary"
              />
              <p className="text-[10px] text-muted-foreground italic">Linked to authorized profile: {user?.assignedCompany}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Factory className="w-5 h-5" />
              <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Target Facility</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plant" className="text-xs font-bold uppercase text-muted-foreground">Plant/Site Identifier</Label>
              <Input 
                id="plant" 
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                placeholder="e.g. Fab-12A Phase 2"
                className="bg-muted/50 border-none font-bold text-primary"
              />
              {!plantName && <p className="text-[10px] text-destructive font-bold">Plant name is required to initialize data.</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="ghost" onClick={() => setStep(1)} className="font-bold text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Auth
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!plantName || !companyName}
            className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 text-lg gap-2 shadow-lg shadow-primary/20"
          >
            Next: Initialization <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
