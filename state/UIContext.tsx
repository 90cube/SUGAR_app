
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CommunityPost, CommunityUserProfile } from '../types';
import { useAuth } from './AuthContext';

export type CommunityViewMode = 'MAIN' | 'UPDATE_ARCHIVE' | 'POST_DETAIL';

interface UIContextType {
  isCommunityOpen: boolean;
  openCommunity: () => void;
  closeCommunity: () => void;
  
  isRecapModalOpen: boolean;
  openRecapModal: () => void;
  closeRecapModal: () => void;
  
  isAnalysisModalOpen: boolean;
  openAnalysisModal: () => void;
  closeAnalysisModal: () => void;
  
  isVirtualMatchingModalOpen: boolean;
  openVirtualMatchingModal: () => void;
  closeVirtualMatchingModal: () => void;
  
  isDMModalOpen: boolean;
  openDMModal: (username: string) => void;
  closeDMModal: () => void;
  activeDMUser: string | null;

  isAdminEditorOpen: boolean;
  openAdminEditor: () => void;
  closeAdminEditor: () => void;

  isAdminHiddenBoardOpen: boolean;
  openAdminHiddenBoard: () => void;
  closeAdminHiddenBoard: () => void;

  isAdminGuillotineOpen: boolean;
  openAdminGuillotine: () => void;
  closeAdminGuillotine: () => void;

  selectedCommunityUser: CommunityUserProfile & { authorId?: string } | null;
  setSelectedCommunityUser: (user: CommunityUserProfile & { authorId?: string } | null) => void;
  closeCommunityUserProfile: () => void;

  communityViewMode: CommunityViewMode;
  setCommunityViewMode: (mode: CommunityViewMode) => void;
  
  isCommunityWriteFormOpen: boolean;
  setIsCommunityWriteFormOpen: (open: boolean) => void;
  
  selectedCommunityPost: CommunityPost | null;
  setSelectedCommunityPost: (post: CommunityPost | null) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  const [isCommunityOpen, setIsCommunityOpen] = useState(false);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isVirtualMatchingModalOpen, setIsVirtualMatchingModalOpen] = useState(false);
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [activeDMUser, setActiveDMUser] = useState<string | null>(null);
  const [isAdminEditorOpen, setIsAdminEditorOpen] = useState(false);
  const [isAdminHiddenBoardOpen, setIsAdminHiddenBoardOpen] = useState(false);
  const [isAdminGuillotineOpen, setIsAdminGuillotineOpen] = useState(false);
  const [selectedCommunityUser, setSelectedCommunityUser] = useState<CommunityUserProfile & { authorId?: string } | null>(null);
  
  const [communityViewMode, setCommunityViewMode] = useState<CommunityViewMode>('MAIN');
  const [isCommunityWriteFormOpen, setIsCommunityWriteFormOpen] = useState(false);
  const [selectedCommunityPost, setSelectedCommunityPost] = useState<CommunityPost | null>(null);

  const openCommunity = () => setIsCommunityOpen(true);
  const closeCommunity = () => setIsCommunityOpen(false);
  const openRecapModal = () => setIsRecapModalOpen(true);
  const closeRecapModal = () => setIsRecapModalOpen(false);
  const openAnalysisModal = () => setIsAnalysisModalOpen(true);
  const closeAnalysisModal = () => setIsAnalysisModalOpen(false);
  const openVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(true);
  const closeVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(false);
  const openDMModal = (username: string) => { setActiveDMUser(username); setIsDMModalOpen(true); };
  const closeDMModal = () => { setIsDMModalOpen(false); setActiveDMUser(null); };
  const openAdminEditor = () => setIsAdminEditorOpen(true);
  const closeAdminEditor = () => setIsAdminEditorOpen(false);
  const openAdminHiddenBoard = () => setIsAdminHiddenBoardOpen(true);
  const closeAdminHiddenBoard = () => setIsAdminHiddenBoardOpen(false);
  const openAdminGuillotine = () => setIsAdminGuillotineOpen(true);
  const closeAdminGuillotine = () => setIsAdminGuillotineOpen(false);
  const closeCommunityUserProfile = () => setSelectedCommunityUser(null);

  // 전역 ESC 키 핸들링
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedCommunityUser) { closeCommunityUserProfile(); return; }
        if (isAdminGuillotineOpen) { closeAdminGuillotine(); return; }
        if (isAdminHiddenBoardOpen) { closeAdminHiddenBoard(); return; }
        if (isAdminEditorOpen) { closeAdminEditor(); return; }
        if (isAnalysisModalOpen) { closeAnalysisModal(); return; }
        if (isRecapModalOpen) { closeRecapModal(); return; }
        if (isVirtualMatchingModalOpen) { closeVirtualMatchingModal(); return; }
        if (isDMModalOpen) { closeDMModal(); return; }
        if (isAuthModalOpen) { closeAuthModal(); return; }
        if (isCommunityOpen) {
          if (isCommunityWriteFormOpen) { setIsCommunityWriteFormOpen(false); return; }
          if (communityViewMode === 'POST_DETAIL' || communityViewMode === 'UPDATE_ARCHIVE') { setCommunityViewMode('MAIN'); return; }
          closeCommunity();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedCommunityUser, isAdminGuillotineOpen, isAdminHiddenBoardOpen, isAdminEditorOpen, 
    isAnalysisModalOpen, isRecapModalOpen, isVirtualMatchingModalOpen, isDMModalOpen, 
    isAuthModalOpen, isCommunityOpen, isCommunityWriteFormOpen, communityViewMode
  ]);

  // 모달 오픈 시 스크롤 잠금
  useEffect(() => {
    const anyModalOpen = isAuthModalOpen || isRecapModalOpen || isAnalysisModalOpen || isCommunityOpen || 
                        isVirtualMatchingModalOpen || isDMModalOpen || isAdminEditorOpen || 
                        isAdminHiddenBoardOpen || isAdminGuillotineOpen || !!selectedCommunityUser;
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [
    isAuthModalOpen, isRecapModalOpen, isAnalysisModalOpen, isCommunityOpen, 
    isVirtualMatchingModalOpen, isDMModalOpen, isAdminEditorOpen, 
    isAdminHiddenBoardOpen, isAdminGuillotineOpen, selectedCommunityUser
  ]);

  return (
    <UIContext.Provider value={{
      isCommunityOpen, openCommunity, closeCommunity,
      isRecapModalOpen, openRecapModal, closeRecapModal,
      isAnalysisModalOpen, openAnalysisModal, closeAnalysisModal,
      isVirtualMatchingModalOpen, openVirtualMatchingModal, closeVirtualMatchingModal,
      isDMModalOpen, openDMModal, closeDMModal, activeDMUser,
      isAdminEditorOpen, openAdminEditor, closeAdminEditor,
      isAdminHiddenBoardOpen, openAdminHiddenBoard, closeAdminHiddenBoard,
      isAdminGuillotineOpen, openAdminGuillotine, closeAdminGuillotine,
      selectedCommunityUser, setSelectedCommunityUser, closeCommunityUserProfile,
      communityViewMode, setCommunityViewMode,
      isCommunityWriteFormOpen, setIsCommunityWriteFormOpen,
      selectedCommunityPost, setSelectedCommunityPost
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};
