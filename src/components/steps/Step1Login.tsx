'use client';

import { useState } from 'react';
import { useAppStore, UserRole } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, UserPlus, LogIn, Building, AlertCircle } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';

export function Step1Login() {
  const { setUser, setStep } = useAppStore();
  const [mode, setMode] = useState<'login' | 'add'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Default to empty to force user entry or show validation
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter both email and security key.",
      });
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setStep(2);
    } catch (e: any) {
      let message = "An unknown error occurred.";
      if (e.code === 'auth/invalid-credential') {
        message = "Invalid email or security key. If you haven't registered, please use 'Register New User' below.";
      } else if (e.code === 'auth/user-not-found') {
        message = "Account not found. Please register first.";
      } else if (e.code === 'auth/wrong-password') {
        message = "Incorrect security key.";
      }
      
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    // 1. Basic field validation
    if (!email || !company || !password) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all fields including email, security key, and assigned company.",
      });
      return;
    }

    // 2. Password length validation
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Security Key Too Short",
        description: "Your Security Key must be at least 6 characters long.",
      });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      
      // Persist permissions to Firestore
      const userPermRef = doc(db, 'user_permissions', userId);
      setDocumentNonBlocking(userPermRef, {
        id: userId,
        email,
        role,
        assignedCompany: company,
      }, { merge: true });

      setUser({
        email,
        role,
        assignedCompany: company,
      });
      
      toast({
        title: "Registration Successful",
        description: `Welcome to M-FLEM Pro. Authorized as ${role}.`,
      });
      
      setStep(2);
    } catch (e: any) {
      let message = e.message;
      if (e.code === 'auth/email-already-in-use') {
        message = "This email is already registered. Please login instead.";
      } else if (e.code === 'auth/weak-password') {
        message = "The security key is too weak. Please use at least 6 characters.";
      } else if (e.code === 'auth/invalid-email') {
        message = "Please enter a valid email address.";
      }

      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-sm overflow-hidden">
        <div className="h-2 bg-accent w-full" />
        <CardHeader className="text-center pt-8">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            {mode === 'login' ? <ShieldCheck className="w-8 h-8 text-primary" /> : <UserPlus className="w-8 h-8 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-headline font-black text-primary">
            {mode === 'login' ? 'System Access' : 'Register New User'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Please verify your identity to access the FLEM terminal.' 
              : 'Add a new authorized analyst to the system.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <Input 
                id="email" 
                type="email"
                placeholder="analyst@mflem.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/50 border-none focus-visible:ring-accent"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="pass" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Security Key</Label>
                {mode === 'add' && <span className="text-[10px] font-bold text-muted-foreground/60 italic">Min. 6 chars</span>}
              </div>
              <Input 
                id="pass" 
                type="password"
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/50 border-none focus-visible:ring-accent"
              />
            </div>

            {mode === 'add' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="role" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">System Role</Label>
                  <Select value={role} onValueChange={(val: UserRole) => setRole(val)}>
                    <SelectTrigger className="bg-muted/50 border-none focus-visible:ring-accent">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="EDITOR">EDITOR</SelectItem>
                      <SelectItem value="READER">READER</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Assigned Company</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      id="company" 
                      placeholder="Organization Name" 
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="pl-10 bg-muted/50 border-none focus-visible:ring-accent"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-white font-black py-6 text-lg gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              onClick={mode === 'login' ? handleLogin : handleAddUser}
              disabled={loading}
            >
              {loading ? "Authorizing..." : (
                <>
                  {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  {mode === 'login' ? 'Enter System' : 'Create & Access'}
                </>
              )}
            </Button>
            
            <button 
              type="button"
              className="w-full text-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
              onClick={() => {
                setMode(mode === 'login' ? 'add' : 'login');
                setPassword(''); // Clear password when switching modes
              }}
            >
              {mode === 'login' ? 'Need to add a new user?' : 'Back to Secure Login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
