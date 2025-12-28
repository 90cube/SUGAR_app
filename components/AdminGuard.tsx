
import React from 'react';
import { useApp } from '../state/AppContext';
import { AppStatus } from '../types';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * AdminGuard: 관리자(admin) 권한이 있는 사용자에게만 자식 요소를 노출합니다.
 * 로딩 중일 경우 렌더링을 유보하여 권한 체크 전 정보 유출을 방지합니다.
 */
const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { isAdmin, status } = useApp();

  // 앱이 초기 로딩 중이거나 프로필을 가져오는 중이면 아무것도 렌더링하지 않음
  if (status === AppStatus.LOADING) {
    return null;
  }

  // 관리자가 아니면 차단
  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default AdminGuard;
