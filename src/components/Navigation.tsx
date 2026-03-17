'use client';

import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Shield } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useEffect } from 'react';

export function Navigation() {
  const { user, setUser, setStep } = useAppStore();
  const { user: firebaseUser } = useUser();
  const auth = useAuth();

  // Sync Firebase Auth state with local store
  useEffect(() => {
    if (firebaseUser) {
      // In a real app, we'd fetch the user's role and company from Firestore here
      // For now, we sync the email and keep the existing role/company from the store if available
      if (!user) {
        setUser({
          email: firebaseUser.email || 'Anonymous User',
          role: 'ADMIN',
          assignedCompany: 'Default Corp',
        });
      }
    } else {
      setUser(null);
    }
  }, [firebaseUser, setUser, user]);

  const handleLogout = () => {
    signOut(auth);
    setStep(1);
  };

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

      {user && (
        <div className="flex items-center gap-6">
          <div className="hidden md:flex flex-col items-end border-r border-primary-foreground/20 pr-6">
            <span className="text-sm font-semibold">{user.email}</span>
            <div className="flex gap-2 text-[10px] uppercase font-bold tracking-wider text-accent">
              <Shield className="w-2.5 h-2.5" />
              <span>{user.role}</span>
              <span className="text-primary-foreground/30">•</span>
              <span>{user.assignedCompany}</span>
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
