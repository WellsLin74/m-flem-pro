
'use client';

import { useState, useEffect } from 'react';
import { useAppStore, UserRole } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, UserPlus, Clock, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Step1Login() {
  const { setUser, setStep } = useAppStore();
  const { user: firebaseUser, dbUser, isUserLoading } = useUser();
  const [mode, setMode] = useState<'login' | 'add'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('READER');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const isSuperAdmin = firebaseUser?.email === 'admin@marsh.com';
  const isApproved = isSuperAdmin || dbUser?.isApproved === true;

  // Jump to P2 if user is logged in and approved
  useEffect(() => {
    if (firebaseUser && !isUserLoading) {
      if (isApproved) {
        setUser({
          email: firebaseUser.email || 'Authorized User',
          role: isSuperAdmin ? 'ADMIN' : (dbUser?.role || 'READER'),
          assignedCompany: isSuperAdmin ? 'Marsh' : (dbUser?.assignedCompany || 'Guest'),
          isApproved: true
        });
        setStep(2);
      }
    }
  }, [firebaseUser, dbUser, isApproved, isSuperAdmin, isUserLoading, setUser, setStep]);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setLoginError(true);
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter both email and security key." });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (e: any) {
      setLoginError(true);
      toast({ 
        variant: "destructive", 
        title: "Access Denied", 
        description: "Account not registered or invalid password. Please complete the registration first." 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCompany = company.trim();
    
    if (!cleanEmail || !cleanCompany || !password) {
      toast({ variant: "destructive", title: "Missing Information", description: "All fields are required for access request." });
      return;
    }

    if (password.length < 6) {
      toast({ variant: "destructive", title: "Security Alert", description: "Security key must be at least 6 characters." });
      return;
    }

    setLoading(true);
    try {
      const isRegisteringSuperAdmin = cleanEmail === 'admin@marsh.com';
      let finalRole = role;
      let finalApproved = false;

      if (isRegisteringSuperAdmin) {
        finalRole = 'ADMIN';
        finalApproved = true;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const userId = userCredential.user.uid;
      
      const userPermRef = doc(db, 'user_permissions', userId);
      await setDoc(userPermRef, {
        id: userId,
        email: cleanEmail,
        role: finalRole,
        assignedCompany: cleanCompany,
        isApproved: finalApproved
      });

      toast({ 
        title: "Transmission Complete", 
        description: finalApproved ? "System Master Authorized." : "Access requested. Awaiting ADMIN verification." 
      });
      
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        toast({ 
          variant: "destructive", 
          title: "Account Conflict", 
          description: "This account is already registered. Please use the login interface." 
        });
        setMode('login');
      } else {
        toast({ 
          variant: "destructive", 
          title: "Registration Error", 
          description: "Registration failed. Please check your input or network connection." 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 space-y-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="font-black text-primary uppercase tracking-[0.2em] animate-pulse">
          Synchronizing Security Layers...
        </p>
      </div>
    );
  }

  if (firebaseUser && !isApproved) {
    const hasApplied = !!dbUser;
    
    return (
      <div className="max-w-md mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden text-center py-10 relative">
          <div className={`h-2 w-full absolute top-0 ${hasApplied ? 'bg-amber-500' : 'bg-destructive'}`} />
          <div className={`mx-auto p-4 rounded-full w-fit mb-6 ${hasApplied ? 'bg-amber-100' : 'bg-destructive/10'}`}>
            {hasApplied ? (
              <Clock className="w-12 h-12 text-amber-600 animate-pulse" />
            ) : (
              <AlertCircle className="w-12 h-12 text-destructive animate-bounce" />
            )}
          </div>
          <CardTitle className={`text-2xl font-black px-6 tracking-tight ${hasApplied ? 'text-primary' : 'text-destructive'}`}>
            {hasApplied ? 'Access Pending Approval' : 'Unregistered Account'}
          </CardTitle>
          <CardDescription className="px-10 mt-4 font-medium text-muted-foreground">
            {hasApplied ? (
              <>Your identity <span className="text-primary font-bold">{firebaseUser.email}</span> is awaiting administrator approval.</>
            ) : (
              <>Identity <span className="text-destructive font-bold">{firebaseUser.email}</span> verified, but no system access request found.</>
            )}
          </CardDescription>
          <div className="p-8">
            <Alert className={`${hasApplied ? 'bg-primary/5 border-primary/10 text-primary' : 'bg-destructive/5 border-destructive/10 text-destructive'}`}>
              <ShieldCheck className="w-5 h-5" />
              <AlertDescription className="text-xs font-bold uppercase tracking-wider ml-2 text-left">
                {hasApplied 
                  ? 'Industrial security protocols require manual approval for all new analysts.'
                  : 'This account is not yet on the approved list.'}
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex flex-col gap-3 px-10">
            {!hasApplied && (
              <Button onClick={() => setMode('add')} className="bg-destructive hover:bg-destructive/90 text-white font-black py-6 rounded-xl">
                Apply for Account Access
              </Button>
            )}
            <Button variant="outline" onClick={() => auth.signOut()} className="font-bold border-primary text-primary hover:bg-primary/5">
              Switch Account / Logout
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      {loginError && (
        <div className="fixed top-0 left-0 w-full h-full z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-xs w-full mx-4 text-center space-y-6 animate-in zoom-in-95 duration-300 relative border-2 border-destructive/10">
            <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
            <div className="space-y-1">
              <h3 className="font-headline font-black text-3xl text-primary tracking-tight">Login Failed</h3>
              <p className="font-bold text-muted-foreground text-sm tracking-widest pt-1">Invalid account or password</p>
            </div>
            <div className="pt-2">
              <Button onClick={() => setLoginError(false)} className="w-full py-7 font-black text-xl bg-destructive hover:bg-destructive/90 rounded-2xl shadow-xl shadow-destructive/20 transition-all active:scale-95 text-white">
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="h-2 bg-accent w-full" />
        <CardHeader className="text-center pt-8">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            {mode === 'login' ? <KeyRound className="w-8 h-8 text-primary" /> : <UserPlus className="w-8 h-8 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-headline font-black text-primary tracking-tight">
            {mode === 'login' ? 'Terminal Access' : 'Register Analyst'}
          </CardTitle>
          <CardDescription className="font-medium">
            {mode === 'login' 
              ? 'Authorized personnel, please enter security key.' 
              : 'New accounts require manual authorization by an ADMIN.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground">ANALYST EMAIL</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="analyst@marsh.com"
                className="bg-muted/50 border-none font-medium focus-visible:ring-accent" 
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground">SECURITY KEY (PASSWORD)</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="bg-muted/50 border-none font-mono tracking-widest focus-visible:ring-accent" 
                disabled={loading}
              />
            </div>
            {mode === 'add' && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground">ASSIGN ROLE</Label>
                  <Select value={role} onValueChange={(val: UserRole) => setRole(val)} disabled={loading}>
                    <SelectTrigger className="bg-muted/50 border-none font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EDITOR" className="font-bold">EDITOR</SelectItem>
                      <SelectItem value="READER" className="font-bold">READER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase tracking-[0.2em] text-muted-foreground">ORGANIZATION NAME</Label>
                  <Input 
                    value={company} 
                    onChange={(e) => setCompany(e.target.value)} 
                    placeholder="e.g. Marsh McLennan" 
                    className="bg-muted/50 border-none font-medium focus-visible:ring-accent"
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>
          <Button 
            onClick={mode === 'login' ? handleLogin : handleAddUser} 
            disabled={loading} 
            className="w-full bg-primary hover:bg-primary/90 py-6 font-black text-lg shadow-xl shadow-primary/20 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'ENTER SYSTEM' : 'SUBMIT APPLICATION')}
          </Button>
          <button 
            type="button" 
            disabled={loading}
            className="w-full text-center text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest disabled:opacity-50" 
            onClick={() => setMode(mode === 'login' ? 'add' : 'login')}
          >
            {mode === 'login' ? 'New Analyst? Click here to register' : 'Return to Login'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
