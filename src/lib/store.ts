import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'EDITOR' | 'READER';

export interface User {
  email: string;
  role: UserRole;
  assignedCompany: string;
}

export interface PlantData {
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

export interface AppState {
  step: number;
  user: User | null;
  plant: PlantData | null;
  refinement: RefinementData | null;
  isValidated: boolean;
  setStep: (step: number) => void;
  setUser: (user: User | null) => void;
  setPlant: (plant: PlantData | null) => void;
  setRefinement: (refinement: RefinementData | null) => void;
  setIsValidated: (isValidated: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  step: 1,
  user: null,
  plant: null,
  refinement: null,
  isValidated: false,
  setStep: (step) => set({ step }),
  setUser: (user) => set({ user }),
  setPlant: (plant) => set({ plant }),
  setRefinement: (refinement) => set({ refinement }),
  setIsValidated: (isValidated) => set({ isValidated }),
}));
