
// Global constants based on environment variables
// .env.local 파일에 아래와 같이 설정해야 합니다:
// VITE_NEXON_API_KEY=your_key
// VITE_SUPABASE_URL=your_url
// VITE_SUPABASE_ANON_KEY=your_key
// VITE_SITE_URL=http://localhost:5173 (또는 프로덕션 도메인)

export const APP_NAME = "Su-Lab";
export const API_VERSION = "v1";

// Safe helper to get environment variables across different environments (Vite vs Node/Standard)
const getEnv = (key: string): string => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv[key]) return metaEnv[key];
  
  const processEnv = (window as any).process?.env || (typeof process !== 'undefined' ? process.env : null);
  if (processEnv && processEnv[key]) return processEnv[key];
  
  return "";
};

// Nexon API Configuration
export const NEXON_API_KEY = getEnv("VITE_NEXON_API_KEY");
export const NEXON_API_BASE_URL = "https://open.api.nexon.com/suddenattack/v1";

// Logo URL
export const NEXON_SA_LOGO_URL = "https://rs.nxfs.nexon.com/common/logo/logo_suddenattack.png"; 

// Default Gemini Model
export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

// Google OAuth Config
export const GOOGLE_CLIENT_ID = "770615003528-nbag5q4n1d8vcpnsjkuqqa0t57csbjm3.apps.googleusercontent.com";

/**
 * [Security Note] 
 * 클라이언트 코드의 ADMIN_EMAILS는 보안상 의미가 없으므로 제거되었습니다.
 * 권한 관리는 Supabase DB의 'role' 컬럼을 통해서만 수행됩니다.
 */

// Supabase Config
export const SUPABASE_URL = getEnv("VITE_SUPABASE_URL"); 
export const SUPABASE_ANON_KEY = getEnv("VITE_SUPABASE_ANON_KEY");

// Storage Bucket Config
export const IMAGE_BUCKET = "images";

export const UI_STRINGS = {
  loading: "실험 데이터 로딩 중...",
  error: "피험자를 찾을 수 없습니다. (ID 확인 요망)",
  welcome: "전적 연구소",
  community: "공용 보관함",
  loginTitle: "Su-Lab Terminal Login",
  anomaly: "패턴 분석",
  search: "분석 시작",
  todayRecap: "일일 리포트"
};
