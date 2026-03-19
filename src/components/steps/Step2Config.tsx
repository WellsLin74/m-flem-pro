
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

  const isAdmin = useMemo(() => {
    return firebaseUser?.email === 'admin@marsh.com' || dbUser?.role === 'ADMIN';
  }, [firebaseUser?.email, dbUser?.role]);

  const assignedCompany = dbUser?.assignedCompany?.trim() || '';

  // 全域使用者查詢，僅限 ADMIN
  const allUsersQuery = useMemoFirebase(() => {
    if (!isAdmin || isUserLoading) return null;
    return collection(db, 'user_permissions');
  }, [db, isAdmin, isUserLoading]);
  
  const { data: allUsers, isLoading: loadingAllUsers } = useCollection(allUsersQuery);

  const pendingUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => u.isApproved === false);
  }, [allUsers]);

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

  const handleNext = () => {
    const selectedPlantData = allAvailablePlants?.find(p => p.id === selectedPlantId);
    const finalPlantName = (isNewPlant ? newPlantName : (selectedPlantData?.plantName || '')).trim();
    const finalCompanyName = (isNewPlant ? companyName : (selectedPlantData?.companyName || companyName)).trim();
    
    if (!finalPlantName || !finalCompanyName) {
      toast({ variant: "destructive", title: "Configuration Error", description: "Please ensure both Organization and Plant are defined." });
      return;
    }
    
    const plantId = isNewPlant ? `${finalCompanyName.replace(/\s+/g, '_')}-${finalPlantName.replace(/\s+/g, '_')}` : selectedPlantId;

    if (plant?.id !== plantId) {
      setRefinement(null);
      setFinalRatios(null);
      setIsValidated(false);
    }

    setPlant({
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
    });

    setStep(3);
  };

  const availableCompanies = useMemo(() => {
    if (!allAvailablePlants) return [];
    if (!isAdmin) return [assignedCompany].filter(Boolean);
    const companies = Array.from(new Set(allAvailablePlants.map(p => p.companyName?.trim())));
    if (assignedCompany && !companies.includes(assignedCompany)) companies.push(assignedCompany);
    return companies.sort();
  }, [allAvailablePlants, isAdmin, assignedCompany]);

  const filteredPlants = useMemo(() => {
    if (!allAvailablePlants) return [];
    if (!companyName) return [];
    return allAvailablePlants.filter(p => p.companyName?.trim() === companyName.trim());
  }, [allAvailablePlants, companyName]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
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
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6">
            {loadingAllUsers ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Scanning Registry...
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className="text-emerald-600 font-bold py-4 italic opacity-60">No pending access requests.</div>
            ) : (
              pendingUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-emerald-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div>
                    <p className="font-bold text-emerald-900">{u.email}</p>
                    <p className="text-[9px] uppercase font-black text-emerald-600 tracking-[0.2em]">{u.role} | {u.assignedCompany}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(u.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-9 text-xs">
                      Approve
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

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden" suppressHydrationWarning>
        <div className="h-2 bg-accent w-full" />
        <CardHeader>
          <CardTitle className="font-headline font-black text-2xl text-primary flex items-center gap-3">
            Organizational Identity {isAdmin && <Shield className="w-5 h-5 text-accent" />}
          </CardTitle>
          <CardDescription className="font-medium">Select the authorized scope for this assessment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pb-10" suppressHydrationWarning>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Building2 className="w-5 h-5" />
                <h3 className="font-headline font-bold uppercase tracking-widest text-sm">Authorized Entity</h3>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Selected Company</Label>
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
                      <SelectValue placeholder={loadingPlants ? "Scanning..." : "Choose Site"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredPlants.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="font-bold">{p.plantName}</SelectItem>
                      ))}
                      {dbUser?.role !== 'READER' && (
                        <SelectItem value="NEW" className="text-accent font-black border-t mt-2">Add New Site...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {isNewPlant && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label className="text-[10px] font-black uppercase text-accent tracking-widest">New Site Name</Label>
                    <Input 
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

          <div className="flex justify-between pt-6 border-t-2 border-primary/5">
            <Button variant="ghost" onClick={() => setStep(1)} className="font-black text-muted-foreground gap-2 hover:bg-primary/5 uppercase text-xs">
              <ArrowLeft className="w-4 h-4" /> Reset Identity
            </Button>
            <Button 
              onClick={handleNext} 
              disabled={!(isNewPlant ? newPlantName : selectedPlantId) || !companyName || isUserLoading}
              className="bg-primary hover:bg-primary/90 text-white font-black px-12 py-6 text-lg gap-3"
            >
              {loadingPlants ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Next: Initialization'} <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline font-black text-xl text-primary flex items-center gap-3">
                <Users className="w-6 h-6 text-accent" /> Global User Directory
              </CardTitle>
              <CardDescription className="font-medium">Audit and manage all registered analyst profiles.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-primary hover:bg-primary/5">
              <RefreshCw className={`w-4 h-4 ${loadingAllUsers ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="rounded-2xl border-2 bg-white overflow-hidden shadow-lg">
              <div className="grid grid-cols-1 divide-y-2 divide-primary/5">
                {loadingAllUsers ? (
                  <div className="p-10 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-10 h-10 text-accent animate-spin" />
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Syncing Registry...</p>
                  </div>
                ) : !allUsers || allUsers.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground font-black uppercase tracking-widest italic opacity-40">No profiles found.</div>
                ) : (
                  allUsers.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 hover:bg-primary/[0.02] transition-colors group">
                      <div className="flex items-center gap-5">
                        <div className={`p-3 rounded-xl ${u.isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                          {u.role === 'ADMIN' ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <p className="font-black text-primary text-lg tracking-tight">{u.email}</p>
                            <Badge variant={u.isApproved ? "default" : "secondary"} className="text-[9px] h-4 uppercase font-black px-2 tracking-widest">
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
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-black h-10 px-4 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs ml-2">Revoke Profile</span>
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
