
// Global constants

export const APP_NAME = "SUGAR";
export const API_VERSION = "v1";

// Corrected API Key from prompt
export const NEXON_API_KEY = "test_93beb7a0e000d7813a59226b7cc14b6334bd53cbcdcae5b7bf30cbb05817015befe8d04e6d233bd35cf2fabdeb93fb0d";

// Corrected Base URL: open.api.nexon.com instead of openapi.nexon.com
export const NEXON_API_BASE_URL = "https://open.api.nexon.com/suddenattack/v1";

// Using a placeholder for the Nexon Sudden Attack logo
export const NEXON_SA_LOGO_URL = "https://rs.nxfs.nexon.com/common/logo/logo_suddenattack.png"; 

// Default model for Gemini Service
export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

// --- Supabase Config (DB) ---
// Supabase 프로젝트 설정 후 아래 값을 채워넣으세요.
// 값이 비어있으면 자동으로 Mock(가상) 모드로 동작합니다.
export const SUPABASE_URL = "https://uwjjnncbpyhwslnipons.supabase.co"; 
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3ampubmNicHlod3Nsbmlwb25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1Mjc2MjUsImV4cCI6MjA4MjEwMzYyNX0.CGahTXEhj1kPCnU389xrquf_TMd7q1XLvnNmAEqxGqc";

export const UI_STRINGS = {
  loading: "병영수첩 조회 중...",
  error: "플레이어를 찾을 수 없습니다. 닉네임을 확인해주세요.",
  welcome: "전적 검색",
  community: "커뮤니티",
  loginTitle: "SUGAR 로그인",
  anomaly: "어뷰징 탐지",
  search: "검색",
  todayRecap: "오늘의 요약"
};
