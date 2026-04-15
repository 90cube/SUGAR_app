
// Global constants for 서든랩
export const APP_NAME = "서든랩";
export const API_VERSION = "v1";

/**
 * [서든랩 Configuration]
 */

// Cloudflare Worker Base URL
export const WORKER_BASE_URL = (import.meta as any).env?.VITE_WORKER_URL || "https://sugarbackend.dudgh4141.workers.dev";

// Nexon API Configuration
export const NEXON_API_BASE_URL = "https://open.api.nexon.com/suddenattack/v1";

// Logo URL
export const NEXON_SA_LOGO_URL = "https://rs.nxfs.nexon.com/common/logo/logo_suddenattack.png";

// AI Model (Workers AI — 프론트에서는 경로용으로만 사용, 실제 모델은 백엔드에서 결정)
export const DEFAULT_AI_MODEL = "gemma-4-26b-a4b-it";

export const UI_STRINGS = {
  loading: "실험 데이터 로딩 중...",
  error: "피험자를 찾을 수 없습니다. (ID 확인 요망)",
  welcome: "전적 연구소",
  anomaly: "패턴 분석",
  search: "분석 시작",
  todayRecap: "일일 리포트"
};
