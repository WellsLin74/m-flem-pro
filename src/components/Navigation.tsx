
'use client';

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect } from 'react';

export function Navigation() {
  const { setUser, setStep, setPlant, setRefinement, setFinalRatios, setIsValidated } = useAppStore();
  const { user: firebaseUser, dbUser } = useUser();
  const auth = useAuth();

  // Sync Firebase Auth and Firestore data with local store
  useEffect(() => {
    if (firebaseUser) {
      // 超級管理員特權判定
      const isSuperAdmin = firebaseUser.email === 'admin@marsh.com';
      
      setUser({
        email: firebaseUser.email || dbUser?.email || 'Authorized User',
        role: isSuperAdmin ? 'ADMIN' : (dbUser?.role || 'READER'),
        assignedCompany: isSuperAdmin ? 'Marsh' : (dbUser?.assignedCompany || 'Unauthorized Org'),
        isApproved: isSuperAdmin || dbUser?.isApproved === true
      });
    } else {
      setUser(null);
    }
  }, [firebaseUser, dbUser, setUser]);

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    setPlant(null);
    setRefinement(null);
    setFinalRatios(null);
    setIsValidated(false);
    setStep(1);
    
    // 清除狀態並重整
    window.location.href = '/';
  };

  const displayUser = !!firebaseUser;

  return (
    <nav className="bg-primary text-primary-foreground shadow-lg px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="bg-white/10 p-2 rounded-lg">
          <span className="text-2xl font-black tracking-tighter text-accent italic">M-FLEM</span>
        </div>
        <div className="hidden sm:block">
          <p className="font-headline font-bold text-lg leading-none">Pro v10.7</p>
          <p className="text-[10px] text-primary-foreground/60 uppercase tracking-widest mt-1">Industrial Intelligence</p>
        </div>
      </div>

      {displayUser && (
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end border-r border-primary-foreground/20 pr-6">
            <span className="text-sm font-semibold">{firebaseUser?.email}</span>
            <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider text-accent">
              <Shield className="w-2.5 h-2.5" />
              <span>{firebaseUser?.email === 'admin@marsh.com' ? 'ADMIN' : (dbUser?.role || 'READER')}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-primary-foreground hover:bg-white/10 gap-2 font-bold"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      )}
    </nav>
  );
}
