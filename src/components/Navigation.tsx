
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
  // We use dbUser directly from the provider to avoid redundant/unauthenticated Firestore reads
  useEffect(() => {
    if (firebaseUser && dbUser) {
      setUser({
        email: firebaseUser.email || dbUser.email || 'Authorized User',
        role: dbUser.role || 'READER',
        assignedCompany: dbUser.assignedCompany || 'Unauthorized Org',
        isApproved: dbUser.isApproved
      });
    } else if (!firebaseUser) {
      setUser(null);
    }
  }, [firebaseUser, dbUser, setUser]);

  const handleLogout = () => {
    signOut(auth);
    // 重點：登出時必須徹底清除本地 Store 狀態，防止重新登入後發生 Hydration 衝突
    setUser(null);
    setPlant(null);
    setRefinement(null);
    setFinalRatios(null);
    setIsValidated(false);
    setStep(1);
    
    // 強制重整頁面以清除所有 React Context 殘留
    window.location.reload();
  };

  const displayUser = firebaseUser && dbUser;

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
            <span className="text-sm font-semibold">{firebaseUser.email}</span>
            <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider text-accent">
              <Shield className="w-2.5 h-2.5" />
              <span>{dbUser.role}</span>
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
