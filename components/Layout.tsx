
import React, { ReactNode } from 'react';
import { Header } from './Header';
import { CommunityPanel } from './CommunityPanel';
import { VirtualMatchingModal } from './VirtualMatchingModal';
import { DirectMessageModal } from './DirectMessageModal';
import { AuthModal } from './AuthModal';
import { MatchDetailModal } from './MatchDetailModal';
import { RecapModal } from './RecapModal';
import { AnalysisModal } from './AnalysisModal';
import { AdminEditor } from './AdminEditor';
import { AdminHiddenBoardModal } from './AdminHiddenBoardModal';
import { AdminGuillotineModal } from './AdminGuillotineModal';
import { CommunityUserProfileModal } from './CommunityUserProfileModal';
import { useApp } from '../state/AppContext';
import AdminGuard from './AdminGuard';

interface LayoutProps {
  children: ReactNode;
}

const AdminToast: React.FC = () => {
  const { isAdminToastOpen } = useApp();
  
  return (
    <div className={`fixed bottom-12 left-1/2 -translate-x-1/2 z-[1000] transition-all duration-700 cubic-bezier(0.19, 1, 0.22, 1) transform ${isAdminToastOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-90 pointer-events-none'}`}>
        <div className="bg-slate-950 border-2 border-cyan-500 px-8 py-4 rounded-xl shadow-[0_20px_50px_rgba(34,211,238,0.3)] flex items-center gap-4 group font-mono">
            <div className="relative">
                <div className="w-3 h-3 bg-cyan-500 rounded-full animate-ping absolute inset-0"></div>
                <div className="w-3 h-3 bg-cyan-400 rounded-full relative z-10 shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
            </div>
            <div className="flex flex-col">
                <span className="text-cyan-400 font-black tracking-tight text-sm uppercase">Auth: Authorized</span>
                <span className="text-white font-bold text-[10px] opacity-60">MASTER_ACCESS_POINT</span>
            </div>
            <div className="ml-2 w-px h-6 bg-white/20"></div>
            <div className="text-white/40 text-[9px] font-black tracking-widest">S-ADMIN</div>
        </div>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 relative overflow-x-hidden selection:bg-cyan-500 selection:text-slate-950">
      {/* Ambient Background - Research Lab Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Technical Data Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-400/10 rounded-full blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-slate-400/10 rounded-full blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }}></div>
        
        {/* Background Grid Pattern is handled in index.html via CSS */}
      </div>

      <Header />
      <main className="flex-grow container mx-auto px-4 py-6 max-w-md w-full relative z-10">
        {children}
      </main>
      
      <CommunityPanel />

      {/* Global Modals */}
      <AuthModal />
      <MatchDetailModal />
      <RecapModal />
      <AnalysisModal />
      
      <AdminGuard>
        <AdminEditor />
        <AdminHiddenBoardModal />
        <AdminGuillotineModal />
      </AdminGuard>

      <CommunityUserProfileModal />
      <VirtualMatchingModal />
      <DirectMessageModal />
      
      <AdminToast />
    </div>
  );
};
