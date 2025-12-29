
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  isLoggedIn: boolean;
  authUser: AuthUser | null;
  isAdmin: boolean;
  isAdminToastOpen: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (id: string, pw: string) => Promise<boolean>;
  logout: () => void;
  refreshAuthUser: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAdminToastOpen, setIsAdminToastOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const isAdmin = authUser?.role === 'admin';

  const showAdminToast = () => {
    setIsAdminToastOpen(true);
    setTimeout(() => setIsAdminToastOpen(false), 3500);
  };

  const recoverSession = async () => {
    const profile = await authService.fetchMyProfile();
    if (profile) {
      console.log(`[AuthContext] Session Recovered. User: ${profile.name}, Role: ${profile.role}`);
      setAuthUser(profile);
      setIsLoggedIn(true);
      if (profile.role === 'admin') showAdminToast();
    } else {
      setAuthUser(null);
      setIsLoggedIn(false);
    }
  };

  const refreshAuthUser = async () => {
    await recoverSession();
  };

  useEffect(() => {
    recoverSession();
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') recoverSession();
        else if (event === 'SIGNED_OUT') {
          setAuthUser(null);
          setIsLoggedIn(false);
          setIsAdminToastOpen(false);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const login = async (id: string, pw: string) => {
    const user = await authService.login(id, pw);
    setAuthUser(user);
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
    if (user.role === 'admin') showAdminToast();
    return true;
  };

  const logout = async () => {
    await authService.logout();
    setAuthUser(null);
    setIsLoggedIn(false);
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const signInWithGoogle = async () => {
    await authService.signInWithGoogle();
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn, authUser, isAdmin, isAdminToastOpen, isAuthModalOpen,
      openAuthModal, closeAuthModal, login, logout, refreshAuthUser, signInWithGoogle
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
