
// Global constants

export const APP_NAME = "SUGAR";
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
 * 여기에 본인이 사용할 이메일 주소를 입력하세요.
 * 구글 로그인 또는 일반 회원가입 시 이 목록에 있는 이메일은 'admin' 권한을 갖게 됩니다.
 */
export const ADMIN_EMAILS = [
    "admin@sugar.com",
    "your_real_email@gmail.com", // <-- 여기에 본인 이메일을 넣으세요!
    "test@test.com"
];

// Supabase Config
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
