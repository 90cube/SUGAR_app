
// Global constants

export const APP_NAME = "Su-Lab";
export const API_VERSION = "v1";

// Nexon API Key
export const NEXON_API_KEY = "test_93beb7a0e000d7813a59226b7cc14b6334bd53cbcdcae5b7bf30cbb05817015befe8d04e6d233bd35cf2fabdeb93fb0d";

// Nexon API Base URL
export const NEXON_API_BASE_URL = "https://open.api.nexon.com/suddenattack/v1";

// Logo URL
export const NEXON_SA_LOGO_URL = "https://rs.nxfs.nexon.com/common/logo/logo_suddenattack.png"; 

// Default Gemini Model
export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

// Google OAuth Config
export const GOOGLE_CLIENT_ID = "770615003528-nbag5q4n1d8vcpnsjkuqqa0t57csbjm3.apps.googleusercontent.com";

/**
 * [중요] 관리자 권한 설정
 */
export const ADMIN_EMAILS = [
    "admin@sugar.com",
    "your_real_email@gmail.com", 
    "test@test.com"
];

// Supabase Config (Updated to current instance)
export const SUPABASE_URL = "https://uwjjnncbpyhwslnipons.supabase.co"; 
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ampubmNicHlod3Nsbmlwb25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1Mjc2MjUsImV4cCI6MjA4MjEwMzYyNX0.CGahTXEhj1kPCnU389xrquf_TMd7q1XLvnNmAEqxGqc";

// Storage Bucket Config
export const STREAMING_BUCKET = "streaming-thumbnails";
export const COMMUNITY_BUCKET = "kukkuk-images";

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
