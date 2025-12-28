
// Global constants for Su-Lab
export const APP_NAME = "Su-Lab";
export const API_VERSION = "v1";

/**
 * [Su-Lab Configuration]
 * 아래 값들은 직접 하드코딩되어 있으며, 환경 변수 없이도 작동합니다.
 */

// Nexon API Configuration (Nexon API Key는 보안상 가급적 환경 변수를 권장하나, 없을 경우 ""에 직접 넣으셔도 됩니다)
export const NEXON_API_KEY = (import.meta as any).env?.VITE_NEXON_API_KEY || "";
export const NEXON_API_BASE_URL = "https://open.api.nexon.com/suddenattack/v1";

// Logo URL
export const NEXON_SA_LOGO_URL = "https://rs.nxfs.nexon.com/common/logo/logo_suddenattack.png"; 

// Default Gemini Model
export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

// Google OAuth Config (Hardcoded)
export const GOOGLE_CLIENT_ID = "770615003528-nbag5q4n1d8vcpnsjkuqqa0t57csbjm3.apps.googleusercontent.com";

/**
 * Supabase Config
 * 사용자님이 제공해주신 실제 접속 정보를 직접 할당합니다.
 */
export const SUPABASE_URL = "https://uwjjnncbpyhwslnipons.supabase.co"; 
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ampubmNicHlod3Nsbmlwb25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1Mjc2MjUsImV4cCI6MjA4MjEwMzYyNX0.CGahTXEhj1kPCnU389xrquf_TMd7q1XLvnNmAEqxGqc";

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
