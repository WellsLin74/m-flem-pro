
'use client';

import { useAppStore } from '@/lib/store';
import { Step1Login } from './steps/Step1Login';
import { Step2Config } from './steps/Step2Config';
import { Step3Init } from './steps/Step3Init';
import { Step4Refinement } from './steps/Step4Refinement';
import { Step5Validation } from './steps/Step5Validation';
import { Step6Estimation } from './steps/Step6Estimation';
import { Progress } from '@/components/ui/progress';

export function Wizard() {
  const { step, plant } = useAppStore();

  const progress = (step / 6) * 100;

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-10 space-y-4">
        <div className="flex justify-between items-end mb-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-headline font-black text-primary">Step {step} of 6</h1>
            <p className="text-muted-foreground font-medium">{getStepTitle(step)}</p>
          </div>
          <span className="text-sm font-bold text-primary tabular-nums">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-3 bg-white/50" />
      </div>

      <div className="transition-all duration-300">
        {step === 1 && <Step1Login />}
        {step === 2 && <Step2Config />}
        {/* CRITICAL: Use plant.id as key to force complete re-mount when switching plants */}
        {step === 3 && <Step3Init key={plant?.id || 'new'} />}
        {step === 4 && <Step4Refinement key={plant?.id || 'new'} />}
        {step === 5 && <Step5Validation key={plant?.id || 'new'} />}
        {step === 6 && <Step6Estimation key={plant?.id || 'new'} />}
      </div>
    </div>
  );
}

function getStepTitle(step: number) {
  switch (step) {
    case 1: return 'Secure Authentication';
    case 2: return 'Organization & Plant Configuration';
    case 3: return 'Physical Plant Parameters';
    case 4: return 'Cleanroom & Distribution Refinement';
    case 5: return 'Financial Ratio Validation';
    case 6: return 'Risk Analysis & AI Insights';
    default: return '';
  }
}
