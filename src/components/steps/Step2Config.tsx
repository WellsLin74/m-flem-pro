'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Factory, ChevronRight, ArrowLeft, PlusCircle, Shield, Loader2 } from 'lucide-react';
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
  const { data: userPerm, isLoading: loadingPerm } = useDoc(userPermRef);

  const isAdmin = userPerm?.role === 'ADMIN' || firebaseUser?.email === 'admin@marsh.com';
  const assignedCompany = userPerm?.assignedCompany || '';

  // Data fetching: ADMIN sees everything, others see only their company
  const plantsQuery = useMemoFirebase(() => {
    if (!firebaseUser || loadingPerm) return null;
    if (isAdmin) return collection(db, 'plants');
    if (!assignedCompany) return null;
    return query(collection(db, 'plants'), where('companyName', '==', assignedCompany));
  }, [db, assignedCompany, isAdmin, firebaseUser, loadingPerm]);

  const { data: allAvailablePlants, isLoading: loadingPlants } = useCollection(plantsQuery);

  const [companyName, setCompanyName] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [newPlantName, setNewPlantName] = useState('');
  const [isNewPlant, setIsNewPlant] = useState(false);

  // Extract unique companies from the plants collection
  const availableCompanies = useMemo(() => {
    if (!allAvailablePlants) return [];
    if (!isAdmin) return [assignedCompany].filter(Boolean);
    const companies = Array.from(new Set(allAvailablePlants.map(p => p.companyName)));
    return companies.sort();
  }, [allAvailablePlants, isAdmin, assignedCompany]);

  // Filter plants based on the SELECTED companyName
  const filteredPlants = useMemo(() => {
    if (!allAvailablePlants) return [];
    if (!companyName) return [];
    return allAvailablePlants.filter(p => p.companyName === companyName);
  }, [allAvailablePlants, companyName]);

  useEffect(() => {
    if (assignedCompany && !companyName) setCompanyName(assignedCompany);
  }, [assignedCompany, companyName]);

  // If company changes, reset selected plant
  const handleCompanyChange = (val: string) => {
    setCompanyName(val);
    setSelectedPlantId('');
    setIsNewPlant(false);
  };

  const handleNext = () => {
    const selectedPlantData = allAvailablePlants?.find(p => p.id === selectedPlantId);
    const finalPlantName = isNewPlant ? newPlantName : (selectedPlantData?.plantName || '');
    const finalCompanyName = isNewPlant ? companyName : (selectedPlantData?.companyName || companyName);
    
    if (!finalPlantName || !finalCompanyName) return;
    
    const safeCompany = finalCompanyName.trim().replace(/\s+/g, '_');
    const safePlant = finalPlantName.trim().replace(/\s+/g, '_');
    const plantId = isNewPlant ? `${safeCompany}-${safePlant}` : selectedPlantId;

    if (!plantId) return;

    if (plant?.id !== plantId) {
      setRefinement(null);
      setFinalRatios(null);
      setIsValidated(false);
    }

    const plantData: any = {
      id: plantId,
      company: finalCompanyName,
      plantName: finalPlantName,
      lat: selectedPlantData?.latitude ?? 24.774,
      lon: selectedPlantData?.longitude ?? 121.013,
      fabAl: selectedPlantData?.fabAboveLevel ?? 4,
      fabBl: selectedPlantData?.fabBelowLevel ?? 2,
      cupAl: selectedPlantData?.cupAboveLevel ?? 2,
      cupBl: selectedPlantData?.cupBelowLevel ?? 1,
      fabLength: selectedPlantData?.fabLength ?? 200,
      fabWidth: selectedPlantData?.fabWidth ?? 150,
      cupLength: selectedPlantData?.cupLength ?? 100,
      cupWidth: selectedPlantData?.cupWidth ?? 80,
      pdBuilding: selectedPlantData?.buildingValue ?? 500,
      pdFacility: selectedPlantData?.facilityValue ?? 200,
      pdTools: selectedPlantData?.toolsValue ?? 1500,
      pdFixture: selectedPlantData?.fixtureValue ?? 50,
      pdStock: selectedPlantData?.stockValue ?? 300,
      bi12m: selectedPlantData?.bi12mValue ?? 1000,
    };

    setPlant(plantData);

    if (userPerm?.role !== 'READER') {
      const plantRef = doc(db, 'plants', plantId);
      setDocumentNonBlocking(plantRef, {
        id: plantId,
        companyName: finalCompanyName,
        plantName: finalPlantName,
        latitude: plantData.lat,
        longitude: plantData.lon,
        fabAboveLevel: plantData.fabAl,
        fabBelowLevel: plantData.fabBl,
        cupAboveLevel: plantData.cupAl,
        cupBelowLevel: plantData.cupBl,
        fabLength: plantData.fabLength,
        fabWidth: plantData.fabWidth,
        cupLength: plantData.cupLength,
        cupWidth: plantData.cupWidth,
        buildingValue: plantData.pdBuilding,
        facilityValue: plantData.pdFacility,
        toolsValue: plantData.pdTools,
        fixtureValue: plantData.pdFixture,
        stockValue: plantData.pdStock,
        bi12mValue: plantData.bi12m,
      }, { merge: true });
    }

    setStep(3);
  };

  const activePlantName = isNewPlant ? newPlantName : (allAvailablePlants?.find(p => p.id === selectedPlantId)?.plantName || '');

  return (
    <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden" suppressHydrationWarning>
      <div className="h-2 bg-accent w-full" />
      <CardHeader>
        <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
          Organizational Identity {isAdmin && <Shield className="w-5 h-5 text-accent animate-pulse" />}
        </CardTitle>
        <CardDescription>
          {isAdmin ? 'Administrative scope management.' : 'Select the scope of this flood loss assessment.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pb-10" suppressHydrationWarning>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Building2 className="w-5 h-5" />
              <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Authorized Entity</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-xs font-bold uppercase text-muted-foreground">Select Company</Label>
              <Select 
                disabled={loadingPerm || !isAdmin}
                value={companyName}
                onValueChange={handleCompanyChange}
              >
                <SelectTrigger className={`border-none font-bold text-primary ${isAdmin ? 'bg-accent/5' : 'bg-muted/30'}`} suppressHydrationWarning>
                  <SelectValue placeholder={loadingPerm ? "Scanning..." : "Choose Company"} />
                </SelectTrigger>
                <SelectContent>
                  {availableCompanies.map((comp) => (
                    <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  disabled={loadingPlants || loadingPerm || !companyName}
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
                  <SelectTrigger className="bg-muted/50 border-none font-bold text-primary" suppressHydrationWarning>
                    <SelectValue placeholder={loadingPlants ? "Scanning..." : (filteredPlants.length > 0 ? "Choose existing plant" : "No plants found")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPlants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.plantName}
                      </SelectItem>
                    ))}
                    {userPerm?.role !== 'READER' && (
                      <SelectItem value="NEW" className="text-accent font-bold border-t">
                        <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Add New Site...</div>
                      </SelectItem>
                    )}
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
                    suppressHydrationWarning
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {loadingPerm && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm font-bold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" /> Authorizing Profile...
          </div>
        )}

        <div className="flex justify-between pt-6">
          <Button variant="ghost" onClick={() => setStep(1)} className="font-bold text-muted-foreground gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Auth
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={!activePlantName || !companyName || loadingPerm}
            className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 text-lg gap-2 shadow-lg shadow-primary/20"
          >
            Next: Initialization <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
