
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
        <div className="bg-slate-900/90 backdrop-blur-2xl border-2 border-yellow-400/60 px-8 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(250,204,21,0.3)] flex items-center gap-4 group">
            <div className="relative">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping absolute inset-0"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full relative z-10 shadow-[0_0_10px_rgba(250,204,21,0.8)]"></div>
            </div>
            <div className="flex flex-col">
                <span className="text-yellow-400 font-black tracking-tight text-sm uppercase">Access Granted</span>
                <span className="text-white font-bold text-[11px] opacity-80">관리자 계정접속 완료</span>
            </div>
            <div className="ml-2 w-px h-6 bg-white/20"></div>
            <div className="text-white/40 text-[10px] font-mono font-bold tracking-tighter">MASTER</div>
        </div>
    </div>
  );
};

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

      {/* Global Modals */}
      <AuthModal />
      <MatchDetailModal />
      <RecapModal />
      <AnalysisModal />
      
      {/* Admin Specific Guards */}
      <AdminGuard>
        <AdminEditor />
        <AdminHiddenBoardModal />
        <AdminGuillotineModal />
      </AdminGuard>

      <CommunityUserProfileModal />
      <VirtualMatchingModal />
      <DirectMessageModal />
      
      {/* Admin Notification Toast */}
      <AdminToast />
    </div>
  );
};
