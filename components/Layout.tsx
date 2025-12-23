
import React, { ReactNode } from 'react';
import { Header } from './Header';
import { CommunityPanel } from './CommunityPanel';
import { VirtualMatchingModal } from './VirtualMatchingModal';
import { DirectMessageModal } from './DirectMessageModal';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-x-hidden selection:bg-yellow-400 selection:text-slate-900">
      {/* Ambient Background - Light Scattering Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-yellow-400/20 rounded-full blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
      </div>

      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-md w-full relative z-10">
        {children}
      </main>
      
      {/* Community Panel Overlay (z-160) */}
      <CommunityPanel />

      {/* Global Modals (z-200) - Rendered as siblings to ensure they are on top */}
      <VirtualMatchingModal />
      <DirectMessageModal />
    </div>
  );
};
