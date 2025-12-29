
import React from 'react';
import { useApp } from '../state/AppContext';
import { useAuth } from '../state/AuthContext';
import { SearchStatus } from '../types';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * AdminGuard: 관리자(admin) 권한이 있는 사용자에게만 자식 요소를 노출합니다.
 */
const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { searchStatus } = useApp();
  const { isAdmin } = useAuth();

  // 앱이 초기 로딩 중이거나 프로필을 가져오는 중이면 아무것도 렌더링하지 않음
  if (searchStatus === SearchStatus.LOADING) {
    return null;
  }

  // 관리자가 아니면 차단
  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default AdminGuard;
