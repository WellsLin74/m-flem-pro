
'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Factory, ChevronRight, ArrowLeft, PlusCircle } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function Step2Config() {
  const { user: firebaseUser } = useUser();
  const { plant, setPlant, setStep, setRefinement, setFinalRatios, setIsValidated } = useAppStore();
  const db = useFirestore();

  const userPermRef = useMemoFirebase(() => {
    if (!firebaseUser?.uid) return null;
    return doc(db, 'user_permissions', firebaseUser.uid);
  }, [db, firebaseUser?.uid]);
  const { data: userPerm } = useDoc(userPermRef);

  const assignedCompany = userPerm?.assignedCompany || '';

  const plantsQuery = useMemoFirebase(() => {
    if (!assignedCompany) return null;
    return query(collection(db, 'plants'), where('companyName', '==', assignedCompany));
  }, [db, assignedCompany]);
  const { data: existingPlants, isLoading: loadingPlants } = useCollection(plantsQuery);

  const [companyName, setCompanyName] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [newPlantName, setNewPlantName] = useState('');
  const [isNewPlant, setIsNewPlant] = useState(false);

  useEffect(() => {
    if (assignedCompany) setCompanyName(assignedCompany);
  }, [assignedCompany]);

  useEffect(() => {
    if (plant?.id && existingPlants) {
      const isExisting = existingPlants.some(p => p.id === plant.id);
      if (isExisting) {
        setSelectedPlantId(plant.id);
        setIsNewPlant(false);
      }
    }
  }, [plant?.id, existingPlants]);

  const handleNext = () => {
    const finalPlantName = isNewPlant ? newPlantName : (existingPlants?.find(p => p.id === selectedPlantId)?.plantName || '');
    if (!finalPlantName || !companyName) return;
    
    const safeCompany = companyName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const safePlant = finalPlantName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    const plantId = isNewPlant ? `${safeCompany}-${safePlant}` : selectedPlantId;

    if (!plantId) return;

    // Reset downstream analysis ONLY if plant ID actually changes
    if (plant?.id !== plantId) {
      setRefinement(null);
      setFinalRatios(null);
      setIsValidated(false);
    }

    const existingData = existingPlants?.find(p => p.id === plantId);

    const plantData: any = {
      id: plantId,
      company: companyName,
      plantName: finalPlantName,
      lat: existingData?.latitude ?? 24.774,
      lon: existingData?.longitude ?? 121.013,
      fabAl: existingData?.fabAboveLevel ?? 4,
      fabBl: existingData?.fabBelowLevel ?? 2,
      cupAl: existingData?.cupAboveLevel ?? 2,
      cupBl: existingData?.cupBelowLevel ?? 1,
      fabLength: existingData?.fabLength ?? 200,
      fabWidth: existingData?.fabWidth ?? 150,
      cupLength: existingData?.cupLength ?? 100,
      cupWidth: existingData?.cupWidth ?? 80,
      pdBuilding: existingData?.buildingValue ?? 500,
      pdFacility: existingData?.facilityValue ?? 200,
      pdTools: existingData?.toolsValue ?? 1500,
      pdFixture: existingData?.fixtureValue ?? 50,
      pdStock: existingData?.stockValue ?? 300,
      bi12m: existingData?.bi12mValue ?? 1000,
    };

    setPlant(plantData);

    const plantRef = doc(db, 'plants', plantId);
    setDocumentNonBlocking(plantRef, {
      id: plantId,
      companyName,
      plantName: finalPlantName,
      latitude: plantData.lat,
      longitude: plantData.lon,
      fabAboveLevel: plantData.fabAl,
      fabBelowLevel: plantData.fabBl,
      cupAboveLevel: plantData.cupAl,
      cupBelowLevel: plantData.cupBl,
      buildingValue: plantData.pdBuilding,
      facilityValue: plantData.pdFacility,
      toolsValue: plantData.pdTools,
      fixtureValue: plantData.pdFixture,
      stockValue: plantData.pdStock,
      bi12mValue: plantData.bi12m,
    }, { merge: true });

    setStep(3);
  };

  const activePlantName = isNewPlant ? newPlantName : (existingPlants?.find(p => p.id === selectedPlantId)?.plantName || '');

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className="h-2 bg-accent w-full" />
      <CardHeader>
        <CardTitle className="font-headline font-black text-2xl text-primary">Organizational Identity</CardTitle>
        <CardDescription>Define or select the scope of this flood loss assessment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Building2 className="w-5 h-5" />
              <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Company Entity</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-xs font-bold uppercase text-muted-foreground">Authorized Entity</Label>
              <Input 
                id="company" 
                value={companyName}
                readOnly
                placeholder="Loading authorization..."
                className="bg-muted/30 border-none font-bold text-primary cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Factory className="w-5 h-5" />
              <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Target Facility</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Select Plant / Site</Label>
                <Select 
                  disabled={loadingPlants}
                  value={isNewPlant ? 'NEW' : selectedPlantId} 
                  onValueChange={(val) => {
                    if (val === 'NEW') {
                      setIsNewPlant(true);
                      setSelectedPlantId('');
                    } else {
                      setIsNewPlant(false);
                      setSelectedPlantId(val);
                    }
                  }}
                >
                  <SelectTrigger className="bg-muted/50 border-none font-bold text-primary">
                    <SelectValue placeholder={loadingPlants ? "Scanning database..." : "Choose existing plant"} />
                  </SelectTrigger>
                  <SelectContent>
                    {existingPlants?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.plantName}</SelectItem>
                    ))}
                    <SelectItem value="NEW" className="text-accent font-bold">
                      <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Add New Plant...</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isNewPlant && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label htmlFor="new-plant" className="text-xs font-bold uppercase text-accent">New Plant Name</Label>
                  <Input 
                    id="new-plant" 
                    value={newPlantName}
                    onChange={(e) => setNewPlantName(e.target.value)}
                    placeholder="e.g. Fab-14P1"
                    className="bg-accent/5 border-accent/20 border font-bold text-primary"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <Button variant="ghost" onClick={() => setStep(1)} className="font-bold text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Auth
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!activePlantName || !companyName}
            className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 text-lg gap-2 shadow-lg shadow-primary/20"
          >
            Next: Initialization <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
