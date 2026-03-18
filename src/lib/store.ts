
import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'EDITOR' | 'READER';

export interface User {
  email: string;
  role: UserRole;
  assignedCompany: string;
  isApproved: boolean;
}

export interface PlantData {
  id: string; // Ensure the ID is part of the plant data
  company: string;
  plantName: string;
  lat: number;
  lon: number;
  fabLength: number;
  fabWidth: number;
  fabAl: number;
  fabBl: number;
  cupLength: number;
  cupWidth: number;
  cupAl: number;
  cupBl: number;
  pdBuilding: number;
  pdFacility: number;
  pdTools: number;
  pdFixture: number;
  pdStock: number;
  bi12m: number;
}

export interface RefinementData {
  facCrRatio: number;
  toolsCrRatio: number;
  floorData: Record<string, { fac: number; cr: number }>;
}

export interface FinalRatio {
  bldg: number;
  fac: number;
  tool: number;
  fix: number;
  stock: number;
}

export interface AppState {
  step: number;
  user: User | null;
  plant: PlantData | null;
  refinement: RefinementData | null;
  finalRatios: Record<string, FinalRatio> | null;
  isValidated: boolean;
  setStep: (step: number) => void;
  setUser: (user: User | null) => void;
  setPlant: (plant: PlantData | null) => void;
  setRefinement: (refinement: RefinementData | null) => void;
  setFinalRatios: (ratios: Record<string, FinalRatio> | null) => void;
  setIsValidated: (isValidated: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  step: 1,
  user: null,
  plant: null,
  refinement: null,
  finalRatios: null,
  isValidated: false,
  setStep: (step) => set({ step }),
  setUser: (user) => set({ user }),
  setPlant: (plant) => set({ plant }),
  setRefinement: (refinement) => set({ refinement }),
  setFinalRatios: (finalRatios) => set({ finalRatios }),
  setIsValidated: (isValidated) => set({ isValidated }),
}));
