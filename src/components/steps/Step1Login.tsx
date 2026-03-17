'use client';

import { useState } from 'react';
import { useAppStore, UserRole } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, UserPlus, LogIn, Building } from 'lucide-react';

export function Step1Login() {
  const { setUser, setStep } = useAppStore();
  const [mode, setMode] = useState<'login' | 'add'>('login');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [company, setCompany] = useState('');

  const handleLogin = () => {
    if (!email) return;
    setUser({
      email,
      role: 'ADMIN', // Default for simulation
      assignedCompany: 'Default Corp',
    });
    setStep(2);
  };

  const handleAddUser = () => {
    if (!email || !company) return;
    setUser({
      email,
      role,
      assignedCompany: company,
    });
    setStep(2);
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
                placeholder="analyst@mflem.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            >
              {mode === 'login' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {mode === 'login' ? 'Enter System' : 'Create & Access'}
            </Button>
            
            <button 
              type="button"
              className="w-full text-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMode(mode === 'login' ? 'add' : 'login')}
            >
              {mode === 'login' ? 'Need to add a new user?' : 'Back to Secure Login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}