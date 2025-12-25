
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

interface LayoutProps {
  children: ReactNode;
}

const AdminToast: React.FC = () => {
  const { isAdminToastOpen } = useApp();
  
  return (
    <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[500] transition-all duration-500 transform ${isAdminToastOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-90 pointer-events-none'}`}>
        <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-yellow-400/50 px-6 py-3 rounded-2xl shadow-[0_0_40px_rgba(250,204,21,0.2)] flex items-center gap-3">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
            <span className="text-yellow-400 font-black tracking-tight text-sm">관리자 계정접속</span>
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

      {/* Global Modals (z-index managed internally, placed here to escape 'main' stacking context) */}
      <AuthModal />
      <MatchDetailModal />
      <RecapModal />
      <AnalysisModal />
      <AdminEditor />
      <AdminHiddenBoardModal />
      <AdminGuillotineModal />
      <CommunityUserProfileModal />
      <VirtualMatchingModal />
      <DirectMessageModal />
      
      {/* Admin Notification Toast */}
      <AdminToast />
    </div>
  );
};
