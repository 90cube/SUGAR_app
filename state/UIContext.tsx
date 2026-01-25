
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
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isVirtualMatchingModalOpen, setIsVirtualMatchingModalOpen] = useState(false);

  const openRecapModal = () => setIsRecapModalOpen(true);
  const closeRecapModal = () => setIsRecapModalOpen(false);
  const openAnalysisModal = () => setIsAnalysisModalOpen(true);
  const closeAnalysisModal = () => setIsAnalysisModalOpen(false);
  const openVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(true);
  const closeVirtualMatchingModal = () => setIsVirtualMatchingModalOpen(false);

  // 전역 ESC 키 핸들링
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAnalysisModalOpen) { closeAnalysisModal(); return; }
        if (isRecapModalOpen) { closeRecapModal(); return; }
        if (isVirtualMatchingModalOpen) { closeVirtualMatchingModal(); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnalysisModalOpen, isRecapModalOpen, isVirtualMatchingModalOpen]);

  // 모달 오픈 시 스크롤 잠금
  useEffect(() => {
    const anyModalOpen = isRecapModalOpen || isAnalysisModalOpen || isVirtualMatchingModalOpen;
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isRecapModalOpen, isAnalysisModalOpen, isVirtualMatchingModalOpen]);

  return (
    <UIContext.Provider value={{
      isRecapModalOpen, openRecapModal, closeRecapModal,
      isAnalysisModalOpen, openAnalysisModal, closeAnalysisModal,
      isVirtualMatchingModalOpen, openVirtualMatchingModal, closeVirtualMatchingModal,
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
