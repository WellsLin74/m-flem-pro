'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Factory, ChevronRight, ArrowLeft, PlusCircle, Shield, Loader2, Zap, UserCheck, CheckCircle, Clock, Trash2, Users, RefreshCw } from 'lucide-react';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function Step2Config() {
  const { user: firebaseUser, dbUser, isUserLoading } = useUser();
  const { plant, setPlant, setStep, setRefinement, setFinalRatios, setIsValidated } = useAppStore();
  const db = useFirestore();
  const { toast } = useToast();

  // 強化 ADMIN 判定邏輯：Email 優先
  const isAdmin = useMemo(() => {
    return firebaseUser?.email === 'admin@marsh.com' || dbUser?.role === 'ADMIN';
  }, [firebaseUser?.email, dbUser?.role]);

  const assignedCompany = dbUser?.assignedCompany?.trim() || '';

  // 管理員專屬：系統所有使用者查詢
  const allUsersQuery = useMemoFirebase(() => {
    if (!isAdmin || isUserLoading) return null;
    return collection(db, 'user_permissions');
  }, [db, isAdmin, isUserLoading]);
  
  const { data: allUsers, isLoading: loadingAllUsers } = useCollection(allUsersQuery);

  const pendingUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => u.isApproved === false);
  }, [allUsers]);

  // 工廠查詢邏輯
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

  // 快速跳轉狀態檢查
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
    toast({ title: "User Approved", description: "Analytical access granted." });
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (email === 'admin@marsh.com') {
      toast({ variant: "destructive", title: "Action Restricted", description: "Master ADMIN cannot be purged." });
      return;
    }
    const userRef = doc(db, 'user_permissions', userId);
    deleteDocumentNonBlocking(userRef);
    toast({ title: "Profile Revoked", description: `Account ${email} removed from system.` });
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
    
    if (!finalPlantName || !finalCompanyName) {
      toast({ variant: "destructive", title: "Configuration Error", description: "Please ensure both Organization and Plant are defined." });
      return;
    }
    
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
      toast({ variant: "destructive", title: "Jump Sequence Failed", description: "Could not synchronize all remote parameters." });
    } finally {
      setIsJumping(false);
    }
  };

  const activePlantName = isNewPlant ? newPlantName : (allAvailablePlants?.find(p => p.id === selectedPlantId)?.plantName || '');

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 管理員審核面板 */}
      {isAdmin && (pendingUsers.length > 0 || loadingAllUsers) && (
        <Card className="border-none shadow-xl bg-emerald-50/50 backdrop-blur-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <div className="h-1.5 bg-emerald-500 w-full" />
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline font-black text-xl text-emerald-800 flex items-center gap-3">
                <UserCheck className="w-6 h-6" /> User Approval Center
                {!loadingAllUsers && (
                  <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse font-black uppercase tracking-widest">
                    {pendingUsers.length} Pending
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-emerald-700/70 font-medium">Authorize new analysts for industrial terminal access.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-emerald-600 hover:bg-emerald-100">
              <RefreshCw className={`w-4 h-4 ${loadingAllUsers ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6">
            {loadingAllUsers ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Scanning Registry...
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-emerald-600 font-bold py-4 italic opacity-60">No pending access requests at this time.</div>
            ) : (
              pendingUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-emerald-100 rounded-xl shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-100 p-2 rounded-full group-hover:scale-110 transition-transform">
                      <Clock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-900">{u.email}</p>
                      <p className="text-[9px] uppercase font-black text-emerald-600 tracking-[0.2em]">{u.role} | {u.assignedCompany}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(u.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black gap-2 rounded-lg h-9 text-xs">
                      <CheckCircle className="w-4 h-4" /> Approve
                    </Button>
                    <Button variant="ghost" onClick={() => handleDeleteUser(u.id, u.email)} className="text-destructive hover:bg-destructive/10 h-9 px-3">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* 主配置卡片 */}
      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden" suppressHydrationWarning>
        <div className="h-2 bg-accent w-full" />
        <CardHeader>
          <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
            Organizational Identity {isAdmin && <Shield className="w-5 h-5 text-accent animate-pulse" />}
          </CardTitle>
          <CardDescription className="font-medium">
            {isAdmin ? 'Administrative scope management and site selection.' : 'Select the authorized scope for this assessment.'}
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
                <Label htmlFor="company" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selected Company</Label>
                <Select 
                  disabled={isUserLoading || !isAdmin}
                  value={companyName}
                  onValueChange={handleCompanyChange}
                >
                  <SelectTrigger className={`border-none font-bold text-primary h-12 ${isAdmin ? 'bg-accent/5' : 'bg-muted/30'}`} suppressHydrationWarning>
                    <SelectValue placeholder={isUserLoading ? "Scanning..." : "Choose Company"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map((comp) => (
                      <SelectItem key={comp} value={comp} className="font-bold">{comp}</SelectItem>
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
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select Site</Label>
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
                    <SelectTrigger className="bg-muted/50 border-none font-bold text-primary h-12" suppressHydrationWarning>
                      <SelectValue placeholder={loadingPlants ? "Scanning..." : (filteredPlants.length > 0 ? "Choose existing plant" : "No plants found")} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPlants.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="font-bold">
                          {p.plantName}
                        </SelectItem>
                      ))}
                      {dbUser?.role !== 'READER' && (
                        <SelectItem value="NEW" className="text-accent font-black border-t mt-2">
                          <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Add New Site...</div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {isNewPlant && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="new-plant" className="text-[10px] font-black uppercase text-accent tracking-widest">New Site Name</Label>
                    <Input 
                      id="new-plant" 
                      value={newPlantName}
                      onChange={(e) => setNewPlantName(e.target.value)}
                      placeholder="e.g. Fab-14P1"
                      className="bg-accent/5 border-accent/20 border-2 font-black text-primary h-12"
                      suppressHydrationWarning
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between pt-6 gap-4 border-t-2 border-primary/5">
            <Button variant="ghost" onClick={() => setStep(1)} className="font-black text-muted-foreground gap-2 hover:bg-primary/5 uppercase text-xs tracking-widest">
              <ArrowLeft className="w-4 h-4" /> Reset Identity
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-4">
              {isFastTrackAvailable && !isNewPlant && (
                <Button 
                  onClick={handleJumpToP6}
                  disabled={isJumping}
                  className="bg-accent hover:bg-accent/90 text-primary font-black px-8 py-6 text-lg gap-2 shadow-xl shadow-accent/20 border-2 border-primary/10 animate-pulse hover:animate-none group"
                >
                  {isJumping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current group-hover:scale-125 transition-transform" />}
                  Fast Track to P6
                </Button>
              )}
              
              <Button 
                onClick={handleNext} 
                disabled={!activePlantName || !companyName || isUserLoading || isJumping}
                className="bg-primary hover:bg-primary/90 text-white font-black px-12 py-6 text-lg gap-3 shadow-xl shadow-primary/20"
              >
                {loadingPlants ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Next: Initialization'} <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 系統使用者名錄 */}
      {isAdmin && (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="font-headline font-black text-xl text-primary flex items-center gap-3">
              <Users className="w-6 h-6 text-accent" /> Global User Directory
            </CardTitle>
            <CardDescription className="font-medium">Audit and manage all registered analyst profiles.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="rounded-2xl border-2 bg-white overflow-hidden shadow-lg">
              <div className="grid grid-cols-1 divide-y-2 divide-primary/5">
                {loadingAllUsers ? (
                  <div className="p-10 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-accent animate-spin" />
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em] animate-pulse">Syncing User Registry...</p>
                  </div>
                ) : !allUsers || allUsers.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground font-black uppercase tracking-widest italic opacity-40">No analytical profiles registered.</div>
                ) : (
                  allUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 hover:bg-primary/[0.02] transition-colors group">
                      <div className="flex items-center gap-5">
                        <div className={`p-3 rounded-xl transition-all group-hover:rotate-12 ${u.isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {u.role === 'ADMIN' ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-black text-primary text-lg tracking-tight">{u.email}</p>
                            <Badge variant={u.isApproved ? "default" : "secondary"} className="text-[9px] h-4 uppercase font-black px-2 tracking-widest bg-emerald-500 hover:bg-emerald-600">
                              {u.isApproved ? 'Authorized' : 'Pending'}
                            </Badge>
                          </div>
                          <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">{u.role} | {u.assignedCompany}</p>
                        </div>
                      </div>
                      {u.email !== 'admin@marsh.com' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-black gap-2 h-10 px-4 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs">Revoke Profile</span>
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
