
import React, { ReactNode } from 'react';
import { Header } from './Header';
import { VirtualMatchingModal } from './VirtualMatchingModal';
import { MatchDetailModal } from './MatchDetailModal';
import { RecapModal } from './RecapModal';
import { AnalysisModal } from './AnalysisModal';
import { useUI } from '../state/UIContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    isRecapModalOpen, isAnalysisModalOpen, isVirtualMatchingModalOpen
  } = useUI();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-400/10 rounded-full blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-slate-400/10 rounded-full blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }}></div>
      </div>

      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-md lg:max-w-6xl w-full relative z-10">
        {children}
      </main>

      <MatchDetailModal />
      {isRecapModalOpen && <RecapModal />}
      {isAnalysisModalOpen && <AnalysisModal />}
      {isVirtualMatchingModalOpen && <VirtualMatchingModal />}
    </div>
  );
};
