'use client';

import { useState, useEffect } from 'react';
import { useAppStore, UserRole } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, UserPlus, Clock, CheckCircle, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, collection, query, where, getDocs } from 'firebase/firestore';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function Step1Login() {
  const { setUser, setStep } = useAppStore();
  const { user: firebaseUser, dbUser } = useUser();
  const [mode, setMode] = useState<'login' | 'add'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('READER');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const isAdmin = dbUser?.role === 'ADMIN' || firebaseUser?.email === 'admin@marsh.com';

  // For Admin: List of pending users
  const pendingUsersQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return query(collection(db, 'user_permissions'), where('isApproved', '==', false));
  }, [db, isAdmin]);
  const { data: pendingUsers } = useCollection(pendingUsersQuery);

  useEffect(() => {
    if (firebaseUser && dbUser) {
      setUser({
        email: firebaseUser.email || dbUser.email,
        role: dbUser.role,
        assignedCompany: dbUser.assignedCompany,
        isApproved: dbUser.isApproved
      });
      if (dbUser.isApproved) {
        setStep(2);
      }
    }
  }, [firebaseUser, dbUser, setUser, setStep]);

  const handleLogin = async () => {
    if (!email || !password) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please enter both email and security key." });
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Login Failed", description: "Invalid credentials or system interruption." });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !company || !password) {
      toast({ variant: "destructive", title: "Missing Information", description: "All fields are required." });
      return;
    }

    setLoading(true);
    try {
      // Logic for Super Admin (admin@marsh.com)
      const isSuperAdmin = cleanEmail === 'admin@marsh.com';
      let finalRole = role;
      let finalApproved = false;

      if (isSuperAdmin) {
        finalRole = 'ADMIN';
        finalApproved = true;
      } else {
        // Prevent multiple ADMINs unless it's the super admin
        if (role === 'ADMIN') {
          const q = query(collection(db, 'user_permissions'), where('role', '==', 'ADMIN'));
          const snap = await getDocs(q);
          if (!snap.empty) {
            toast({ variant: "destructive", title: "ADMIN Restricted", description: "Only one system ADMIN is allowed." });
            setLoading(false);
            return;
          }
        }
      }

      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const userId = userCredential.user.uid;
      
      const userPermRef = doc(db, 'user_permissions', userId);
      setDocumentNonBlocking(userPermRef, {
        id: userId,
        email: cleanEmail,
        role: finalRole,
        assignedCompany: company.trim(),
        isApproved: finalApproved
      }, { merge: true });

      toast({ 
        title: "Registration Successful", 
        description: finalApproved ? "Authorized as System Master." : "Account created. Awaiting ADMIN approval." 
      });
      setMode('login');
    } catch (e: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (userId: string) => {
    const userRef = doc(db, 'user_permissions', userId);
    updateDocumentNonBlocking(userRef, { isApproved: true });
    toast({ title: "User Approved", description: "Access granted successfully." });
  };

  if (firebaseUser && dbUser && !dbUser.isApproved) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden text-center py-10">
          <div className="h-2 bg-accent w-full absolute top-0" />
          <div className="mx-auto bg-amber-100 p-4 rounded-full w-fit mb-6">
            <Clock className="w-12 h-12 text-amber-600 animate-pulse" />
          </div>
          <CardTitle className="text-2xl font-black text-primary px-6">Access Pending Approval</CardTitle>
          <CardDescription className="px-10 mt-4 font-medium">
            Your account ({dbUser.email}) is registered for <span className="text-primary font-bold">{dbUser.assignedCompany}</span>.
          </CardDescription>
          <div className="p-8">
            <Alert className="bg-primary/5 border-primary/10 text-primary">
              <AlertCircle className="w-5 h-5" />
              <AlertDescription className="text-xs font-bold uppercase tracking-wider ml-2 text-left">
                A system administrator must verify your identity before you can access the modeling terminal.
              </AlertDescription>
            </Alert>
          </div>
          <Button variant="outline" onClick={() => auth.signOut()} className="mt-4 font-bold border-primary text-primary">
            Sign Out & Re-login
          </Button>
        </Card>
      </div>
    );
  }

  if (isAdmin && pendingUsers && pendingUsers.length > 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
          <div className="h-2 bg-emerald-500 w-full" />
          <CardHeader>
            <CardTitle className="font-black text-primary flex items-center gap-2">
              <UserCheck className="w-6 h-6" /> User Approval Dashboard
            </CardTitle>
            <CardDescription>Review {pendingUsers.length} analyst requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                <div>
                  <p className="font-bold text-primary">{u.email}</p>
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{u.role} | {u.assignedCompany}</p>
                </div>
                <Button onClick={() => handleApprove(u.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
              </div>
            ))}
            <Button onClick={() => setStep(2)} className="w-full bg-primary py-6 font-black text-lg mt-6">
              Continue to Site Config
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="h-2 bg-accent w-full" />
        <CardHeader className="text-center pt-8">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            {mode === 'login' ? <ShieldCheck className="w-8 h-8 text-primary" /> : <UserPlus className="w-8 h-8 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-headline font-black text-primary">
            {mode === 'login' ? 'System Access' : 'Register Analyst'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Use Admin (admin@marsh.com) to initialize system.' 
              : 'New accounts require Admin approval to access data.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@marsh.com"
                className="bg-muted/50 border-none" 
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Security Key</Label>
              <Input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••"
                className="bg-muted/50 border-none" 
              />
            </div>
            {mode === 'add' && (
              <>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Requested Role</Label>
                  <Select value={role} onValueChange={(val: UserRole) => setRole(val)}>
                    <SelectTrigger className="bg-muted/50 border-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EDITOR">EDITOR</SelectItem>
                      <SelectItem value="READER">READER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Organization Name</Label>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Marsh McLennan" className="bg-muted/50 border-none" />
                </div>
              </>
            )}
          </div>
          <Button onClick={mode === 'login' ? handleLogin : handleAddUser} disabled={loading} className="w-full bg-primary py-6 font-black text-lg shadow-lg">
            {loading ? "Authorizing..." : (mode === 'login' ? 'Enter System' : 'Request Access')}
          </Button>
          <button 
            type="button" 
            className="w-full text-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors" 
            onClick={() => setMode(mode === 'login' ? 'add' : 'login')}
          >
            {mode === 'login' ? 'Need to register a new analyst?' : 'Back to Login'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
