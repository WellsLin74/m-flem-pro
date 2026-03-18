'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Factory, ChevronRight, ArrowLeft, PlusCircle, Shield, Loader2, Zap, UserCheck, CheckCircle, Clock } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

export function Step2Config() {
  const { user: firebaseUser, dbUser, isUserLoading } = useUser();
  const { plant, setPlant, setStep, setRefinement, setFinalRatios, setIsValidated } = useAppStore();
  const db = useFirestore();
  const { toast } = useToast();

  const isAdmin = dbUser?.role === 'ADMIN' || firebaseUser?.email === 'admin@marsh.com';
  const assignedCompany = dbUser?.assignedCompany?.trim() || '';

  // For Admin: List of pending users to approve
  const pendingUsersQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'user_permissions'), where('isApproved', '==', false));
  }, [db, isAdmin]);
  const { data: pendingUsers } = useCollection(pendingUsersQuery);

  const plantsQuery = useMemoFirebase(() => {
    if (!firebaseUser || isUserLoading) return null;
    if (isAdmin) return collection(db, 'plants');
    if (!assignedCompany) return null;
    return query(collection(db, 'plants'), where('companyName', '==', assignedCompany));
  }, [db, assignedCompany, isAdmin, firebaseUser, isUserLoading]);

  const { data: allAvailablePlants, isLoading: loadingPlants } = useCollection(plantsQuery);

  const [companyName, setCompanyName] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState<string>('');
  const [newPlantName, setNewPlantName] = useState('');
  const [isNewPlant, setIsNewPlant] = useState(false);
  const [isJumping, setIsJumping] = useState(false);

  const validationRef = useMemoFirebase(() => {
    if (!selectedPlantId) return null;
    return doc(db, 'building_value_ratios', selectedPlantId);
  }, [db, selectedPlantId]);
  const { data: validationData } = useDoc(validationRef);

  const isFastTrackAvailable = validationData?.validationStatus === 'VALIDATED';

  const availableCompanies = useMemo(() => {
    if (!allAvailablePlants) return [];
    if (!isAdmin) return [assignedCompany].filter(Boolean);
    const companies = Array.from(new Set(allAvailablePlants.map(p => p.companyName?.trim())));
    return companies.sort();
  }, [allAvailablePlants, isAdmin, assignedCompany]);

  const filteredPlants = useMemo(() => {
    if (!allAvailablePlants) return [];
    if (!companyName) return [];
    return allAvailablePlants.filter(p => p.companyName?.trim() === companyName.trim());
  }, [allAvailablePlants, companyName]);

  useEffect(() => {
    if (assignedCompany && !companyName) setCompanyName(assignedCompany);
  }, [assignedCompany, companyName]);

  const handleCompanyChange = (val: string) => {
    setCompanyName(val);
    setSelectedPlantId('');
    setIsNewPlant(false);
    setNewPlantName('');
  };

  const handleApprove = (userId: string) => {
    const userRef = doc(db, 'user_permissions', userId);
    updateDocumentNonBlocking(userRef, { isApproved: true });
    toast({ title: "User Approved", description: "Access granted successfully." });
  };

  const mapPlantData = (selectedPlantData: any) => {
    return {
      id: selectedPlantData.id,
      company: selectedPlantData.companyName,
      plantName: selectedPlantData.plantName,
      lat: selectedPlantData.latitude ?? 24.774,
      lon: selectedPlantData.longitude ?? 121.013,
      fabAl: selectedPlantData.fabAboveLevel ?? 4,
      fabBl: selectedPlantData.fabBelowLevel ?? 2,
      cupAl: selectedPlantData.cupAboveLevel ?? 2,
      cupBl: selectedPlantData.cupBelowLevel ?? 1,
      fabLength: selectedPlantData.fabLength ?? 200,
      fabWidth: selectedPlantData.fabWidth ?? 150,
      cupLength: selectedPlantData.cupLength ?? 100,
      cupWidth: selectedPlantData.cupWidth ?? 80,
      pdBuilding: selectedPlantData.buildingValue ?? 500,
      pdFacility: selectedPlantData.facilityValue ?? 200,
      pdTools: selectedPlantData.toolsValue ?? 1500,
      pdFixture: selectedPlantData.fixtureValue ?? 50,
      pdStock: selectedPlantData.stockValue ?? 300,
      bi12m: selectedPlantData.bi12mValue ?? 1000,
    };
  };

  const handleNext = () => {
    const selectedPlantData = allAvailablePlants?.find(p => p.id === selectedPlantId);
    const finalPlantName = (isNewPlant ? newPlantName : (selectedPlantData?.plantName || '')).trim();
    const finalCompanyName = (isNewPlant ? companyName : (selectedPlantData?.companyName || companyName)).trim();
    
    if (!finalPlantName || !finalCompanyName) return;
    
    const safeCompany = finalCompanyName.replace(/\s+/g, '_');
    const safePlant = finalPlantName.replace(/\s+/g, '_');
    const plantId = isNewPlant ? `${safeCompany}-${safePlant}` : selectedPlantId;

    if (!plantId) return;

    if (plant?.id !== plantId) {
      setRefinement(null);
      setFinalRatios(null);
      setIsValidated(false);
    }

    const plantData = mapPlantData(selectedPlantData || { id: plantId, companyName: finalCompanyName, plantName: finalPlantName });
    setPlant(plantData);

    if (dbUser?.role !== 'READER' && isNewPlant) {
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

  const handleJumpToP6 = async () => {
    if (!selectedPlantId) return;
    setIsJumping(true);

    try {
      const selectedPlantData = allAvailablePlants?.find(p => p.id === selectedPlantId);
      if (!selectedPlantData) throw new Error("Plant data not found");
      const plantData = mapPlantData(selectedPlantData);

      const occDoc = await getDoc(doc(db, 'fab_cleanroom_occupancy', selectedPlantId));
      const floorRatiosSnapshot = await getDocs(collection(db, 'fab_cleanroom_occupancy', selectedPlantId, 'floor_ratios'));
      
      const mappedFloorData: Record<string, { fac: number; cr: number }> = {};
      floorRatiosSnapshot.forEach(d => {
        const data = d.data();
        mappedFloorData[data.floorIdentifier] = {
          fac: data.facilityOccupancyRatio,
          cr: data.cleanroomOccupancyRatio
        };
      });

      const refinementData = {
        facCrRatio: occDoc.data()?.overallFacilityCleanroomRatio || 0.33,
        toolsCrRatio: occDoc.data()?.overallToolsCleanroomRatio || 0.9,
        floorData: mappedFloorData
      };

      const p5FloorRatiosSnapshot = await getDocs(collection(db, 'building_value_ratios', selectedPlantId, 'floor_ratios'));
      const finalRatios: Record<string, any> = {};
      p5FloorRatiosSnapshot.forEach(d => {
        const data = d.data();
        finalRatios[data.floorIdentifier] = {
          bldg: data.buildingRatio,
          fac: data.facilityRatio,
          tool: data.toolsRatio,
          fix: data.fixtureRatio,
          stock: data.stockRatio
        };
      });

      setPlant(plantData);
      setRefinement(refinementData);
      setFinalRatios(finalRatios);
      setIsValidated(true);
      setStep(6);
    } catch (err) {
      console.error("Jump failed:", err);
    } finally {
      setIsJumping(false);
    }
  };

  const activePlantName = isNewPlant ? newPlantName : (allAvailablePlants?.find(p => p.id === selectedPlantId)?.plantName || '');

  return (
    <div className="space-y-8">
      {/* ADMIN ONLY: Approval Dashboard */}
      {isAdmin && pendingUsers && pendingUsers.length > 0 && (
        <Card className="border-none shadow-xl bg-emerald-50/50 backdrop-blur-sm overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="h-1.5 bg-emerald-500 w-full" />
          <CardHeader className="pb-4">
            <CardTitle className="font-headline font-black text-xl text-emerald-800 flex items-center gap-3">
              <UserCheck className="w-6 h-6" /> User Approval Center
              <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">{pendingUsers.length} Pending</span>
            </CardTitle>
            <CardDescription className="text-emerald-700/70">Authorize new analysts for system access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6">
            {pendingUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-emerald-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-emerald-900">{u.email}</p>
                    <p className="text-[10px] uppercase font-black text-emerald-600 tracking-widest">{u.role} | {u.assignedCompany}</p>
                  </div>
                </div>
                <Button onClick={() => handleApprove(u.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 rounded-lg h-9">
                  <CheckCircle className="w-4 h-4" /> Approve Access
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Main Configuration Card */}
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
                  disabled={isUserLoading || !isAdmin}
                  value={companyName}
                  onValueChange={handleCompanyChange}
                >
                  <SelectTrigger className={`border-none font-bold text-primary ${isAdmin ? 'bg-accent/5' : 'bg-muted/30'}`} suppressHydrationWarning>
                    <SelectValue placeholder={isUserLoading ? "Scanning..." : "Choose Company"} />
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
                    disabled={loadingPlants || isUserLoading || !companyName}
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
                      {dbUser?.role !== 'READER' && (
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

          {isUserLoading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm font-bold animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" /> Authorizing Profile...
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between pt-6 gap-4">
            <Button variant="ghost" onClick={() => setStep(1)} className="font-bold text-muted-foreground gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Auth
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {isFastTrackAvailable && !isNewPlant && (
                <Button 
                  onClick={handleJumpToP6}
                  disabled={isJumping}
                  className="bg-accent hover:bg-accent/90 text-primary font-black px-8 py-6 text-lg gap-2 shadow-lg shadow-accent/20 border-2 border-primary/10 animate-pulse hover:animate-none"
                >
                  {isJumping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
                  Fast Track to P6
                </Button>
              )}
              
              <Button 
                onClick={handleNext} 
                disabled={!activePlantName || !companyName || isUserLoading || isJumping}
                className="bg-primary hover:bg-primary/90 text-white font-black px-10 py-6 text-lg gap-2 shadow-lg shadow-primary/20"
              >
                Next: Initialization <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}