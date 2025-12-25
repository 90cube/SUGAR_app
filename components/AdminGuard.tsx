
import React from 'react';
import { useApp } from '../state/AppContext';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * AdminGuard: 관리자(admin) 권한이 있는 사용자에게만 자식 요소를 노출합니다.
 */
const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { isAdmin } = useApp();

  if (!isAdmin) return null;

  return <>{children}</>;
};

export default AdminGuard;
