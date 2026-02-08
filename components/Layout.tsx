
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
    <div className="min-h-screen flex flex-col bg-black relative overflow-x-hidden selection:bg-acid-pink selection:text-white">
      {/* Y2K Background Elements are handled in index.html (crt, scanlines), 
          but we ensure the container lets them show through */}

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
