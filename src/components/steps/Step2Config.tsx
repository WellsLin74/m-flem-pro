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

  // 1. Fetch User Permission to get assigned company
  const userPermRef = useMemoFirebase(() => {
    if (!firebaseUser?.uid) return null;
    return doc(db, 'user_permissions', firebaseUser.uid);
  }, [db, firebaseUser?.uid]);
  const { data: userPerm } = useDoc(userPermRef);

  const assignedCompany = userPerm?.assignedCompany || '';

  // 2. Fetch existing plants for this company
  const plantsQuery = useMemoFirebase(() => {
    if (!assignedCompany) return null;
    return query(collection(db, 'building_info'), where('companyName', '==', assignedCompany));
  }, [db, assignedCompany]);
  const { data: existingPlants, isLoading: loadingPlants } = useCollection(plantsQuery);

  const [companyName, setCompanyName] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [newPlantName, setNewPlantName] = useState('');
  const [isNewPlant, setIsNewPlant] = useState(false);

  // Sync component state when data arrives
  useEffect(() => {
    if (assignedCompany) {
      setCompanyName(assignedCompany);
    }
  }, [assignedCompany]);

  const handleNext = () => {
    const finalPlantName = isNewPlant ? newPlantName : (existingPlants?.find(p => p.id === selectedPlantId)?.plantName || '');
    if (!finalPlantName || !companyName) return;
    
    // Generate or retrieve the plant ID
    const buildingInfoId = isNewPlant 
      ? `${companyName.replace(/\s+/g, '_')}-${finalPlantName.replace(/\s+/g, '_')}`
      : selectedPlantId;

    // If it's an existing plant, we pre-fill some data if available
    const existingData = existingPlants?.find(p => p.id === selectedPlantId);

    // CRITICAL: If switching to a different plant, clear previous analysis data to prevent collisions
    if (plant?.id !== buildingInfoId) {
      setRefinement(null);
      setFinalRatios(null);
      setIsValidated(false);
    }

    const plantData: any = {
      id: buildingInfoId,
      company: companyName,
      plantName: finalPlantName,
      lat: existingData?.latitude || plant?.lat || 24.774,
      lon: existingData?.longitude || plant?.lon || 121.013,
      fabAl: existingData?.fabAboveLevel || plant?.fabAl || 4,
      fabBl: existingData?.fabBelowLevel || plant?.fabBl || 2,
      cupAl: existingData?.cupAboveLevel || plant?.cupAl || 2,
      cupBl: existingData?.cupBelowLevel || plant?.cupBl || 1,
      fabLength: plant?.fabLength || 200,
      fabWidth: plant?.fabWidth || 150,
      cupLength: plant?.cupLength || 100,
      cupWidth: plant?.cupWidth || 80,
      pdBuilding: plant?.pdBuilding || 500,
      pdFacility: plant?.pdFacility || 200,
      pdTools: plant?.pdTools || 1500,
      pdFixture: plant?.pdFixture || 50,
      pdStock: plant?.pdStock || 300,
      bi12m: plant?.bi12m || 1000,
    };

    setPlant(plantData);

    // Persist to Firestore (BuildingInfo) using the ID as the document key
    const buildingRef = doc(db, 'building_info', buildingInfoId);
    setDocumentNonBlocking(buildingRef, {
      id: buildingInfoId,
      companyName,
      plantName: finalPlantName,
      latitude: plantData.lat,
      longitude: plantData.lon,
      fabAboveLevel: plantData.fabAl,
      fabBelowLevel: plantData.fabBl,
      cupAboveLevel: plantData.cupAl,
      cupBelowLevel: plantData.cupBl,
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
              <p className="text-[10px] text-muted-foreground italic">
                Logged in as: {firebaseUser?.email}
              </p>
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
                      <div className="flex items-center gap-2">
                        <PlusCircle className="w-4 h-4" /> Add New Plant...
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isNewPlant && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="new-plant" className="text-xs font-bold uppercase text-accent">New Plant Name</Label>
                  <Input 
                    id="new-plant" 
                    value={newPlantName}
                    onChange={(e) => setNewPlantName(e.target.value)}
                    placeholder="e.g. Fab-12A Phase 2"
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
