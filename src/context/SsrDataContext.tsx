import { createContext, useContext } from 'react';
import type { Game, Package } from '../types';

export interface SsrGamePayload {
  game: Game;
  packages: Package[];
}

export interface SsrDataPayload {
  gameDetails?: Record<string, SsrGamePayload>;
}

const SsrDataContext = createContext<SsrDataPayload>({});

export function SsrDataProvider({ children, value }: { children: React.ReactNode; value?: SsrDataPayload }) {
  return <SsrDataContext.Provider value={value || {}}>{children}</SsrDataContext.Provider>;
}

export const useSsrData = () => useContext(SsrDataContext);

