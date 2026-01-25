
// Global constants for Su-Lab
export const APP_NAME = "Su-Lab";
export const API_VERSION = "v1";

/**
 * [Su-Lab Configuration]
 */

// Cloudflare Worker Base URL (배포 후 URL로 변경 필요)
export const WORKER_BASE_URL = (import.meta as any).env?.VITE_WORKER_URL || "http://localhost:8787";

// Nexon API Configuration
export const NEXON_API_BASE_URL = "https://open.api.nexon.com/suddenattack/v1";

// Logo URL
export const NEXON_SA_LOGO_URL = "https://rs.nxfs.nexon.com/common/logo/logo_suddenattack.png";

// Default Gemini Model
export const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

// Google OAuth Config
export const GOOGLE_CLIENT_ID = "770615003528-nbag5q4n1d8vcpnsjkuqqa0t57csbjm3.apps.googleusercontent.com";

/**
 * Supabase Config
 */
export const SUPABASE_URL = "https://uwjjnncbpyhwslnipons.supabase.co";
export const SUPABASE_ANON_KEY = ""; // 워커 또는 환경 변수에서 처리됨

// Storage Bucket Config
export const IMAGE_BUCKET = "common-images"; // Default bucket

// 게시판별 전용 버킷 맵핑 (지침 준수)
export const BUCKET_MAP: Record<string, string> = {
  update: 'common-images',
  kukkuk: 'kukkuk-images',
  balance: 'balance-images',
  streaming: 'streaming-thumbnails',
  temp: 'common-images'
};

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
