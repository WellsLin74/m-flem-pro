
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, ShieldAlert } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service if needed
    console.error('System Exception:', error);
  }, [error]);

  const isPermissionError = error.message.includes('Missing or insufficient permissions');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center animate-pulse">
          {isPermissionError ? (
            <ShieldAlert className="w-12 h-12 text-destructive" />
          ) : (
            <AlertCircle className="w-12 h-12 text-destructive" />
          )}
        </div>
        
        <div className="space-y-4">
          <h2 className="text-3xl font-black tracking-tighter text-primary">
            {isPermissionError ? 'Access Denied' : 'System Interruption'}
          </h2>
          <div className="p-4 bg-muted rounded-xl border border-border/50">
            <p className="text-sm font-mono text-muted-foreground break-words overflow-auto max-h-48 text-left whitespace-pre-wrap">
              {error.message || 'An unexpected error occurred during execution.'}
            </p>
          </div>
          <p className="text-muted-foreground font-medium">
            {isPermissionError 
              ? 'Your current role lacks authorization for this operation. Please contact your system administrator.' 
              : 'The terminal encountered a runtime exception. Attempt a system reset below.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => reset()}
            className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 px-8 py-6 rounded-xl shadow-lg shadow-primary/20"
          >
            <RefreshCcw className="w-4 h-4" /> Reset Terminal
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
            className="font-bold border-primary text-primary hover:bg-primary/5 px-8 py-6 rounded-xl"
          >
            Return to Root
          </Button>
        </div>

        {error.digest && (
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/30">
            Digest ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
