
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UIContextType {
  isRecapModalOpen: boolean;
  openRecapModal: () => void;
  closeRecapModal: () => void;

  isAnalysisModalOpen: boolean;
  openAnalysisModal: () => void;
  closeAnalysisModal: () => void;

  isVirtualMatchingModalOpen: boolean;
  openVirtualMatchingModal: () => void;
  closeVirtualMatchingModal: () => void;

  isUpdatesModalOpen: boolean;
  openUpdatesModal: () => void;
  closeUpdatesModal: () => void;

  isCommunityOpen: boolean;
  openCommunity: () => void;
  closeCommunity: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isVirtualMatchingModalOpen, setIsVirtualMatchingModalOpen] = useState(false);
  const [isUpdatesModalOpen, setIsUpdatesModalOpen] = useState(false);
  const [isCommunityOpen, setIsCommunityOpen] = useState(false);

  const openRecapModal = () => setIsRecapModalOpen(true);
  const closeRecapModal = () => setIsRecapModalOpen(false);
  const openAnalysisModal = () => setIsAnalysisModalOpen(true);
  const closeAnalysisModal = () => setIsAnalysisModalOpen(false);
  const openVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(true);
  const closeVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(false);
  const openUpdatesModal = () => setIsUpdatesModalOpen(true);
  const closeUpdatesModal = () => setIsUpdatesModalOpen(false);
  const openCommunity = () => setIsCommunityOpen(true);
  const closeCommunity = () => setIsCommunityOpen(false);

  // 전역 ESC 키 핸들링
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isUpdatesModalOpen) { closeUpdatesModal(); return; }
        if (isAnalysisModalOpen) { closeAnalysisModal(); return; }
        if (isRecapModalOpen) { closeRecapModal(); return; }
        if (isVirtualMatchingModalOpen) { closeVirtualMatchingModal(); return; }
        if (isCommunityOpen) { closeCommunity(); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnalysisModalOpen, isRecapModalOpen, isVirtualMatchingModalOpen, isUpdatesModalOpen, isCommunityOpen]);

  // 모달 오픈 시 스크롤 잠금
  useEffect(() => {
    const anyModalOpen = isRecapModalOpen || isAnalysisModalOpen || isVirtualMatchingModalOpen || isUpdatesModalOpen || isCommunityOpen;
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isRecapModalOpen, isAnalysisModalOpen, isVirtualMatchingModalOpen, isUpdatesModalOpen, isCommunityOpen]);

  return (
    <UIContext.Provider value={{
      isRecapModalOpen, openRecapModal, closeRecapModal,
      isAnalysisModalOpen, openAnalysisModal, closeAnalysisModal,
      isVirtualMatchingModalOpen, openVirtualMatchingModal, closeVirtualMatchingModal,
      isUpdatesModalOpen, openUpdatesModal, closeUpdatesModal,
      isCommunityOpen, openCommunity, closeCommunity,
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
