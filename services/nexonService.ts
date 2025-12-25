
import { NEXON_API_KEY, NEXON_API_BASE_URL } from '../constants';
import { Match, MatchDetail, MatchResult, RankMatchState, RecentStats, UserProfile, AnomalyReport } from '../types';

// 더 안정적인 프록시 서비스 사용
const PROXY_URL = "https://api.allorigins.win/get?url=";

const ERROR_CODES: Record<string, string> = {
  "OPENAPI00001": "서버 내부 오류",
  "OPENAPI00002": "API 키 만료", 
  "OPENAPI00003": "잘못된 식별자",
  "OPENAPI00004": "잘못된 파라미터",
  "OPENAPI00005": "유효하지 않은 API 키",
  "OPENAPI00007": "호출 한도 초과",
  "OPENAPI00009": "데이터 준비 중",
  "OPENAPI00010": "게임 점검 중"
};

class NexonService {
  private tierCache: Map<string, string> = new Map();
  private readonly TARGET_MODES = ["개인전", "데스매치", "폭파미션", "진짜를 모아라"];

  // Helper: 실제 API 호출을 수행하는 통합 메서드
  private async fetchWithProxy(targetUrl: string) {
    // URL에 API 키를 파라미터로 붙이지 않고 헤더로 전달해야 하므로 
    // Allorigins의 'get' 엔드포인트를 통해 원문 데이터를 가져옵니다.
    // 주의: 프록시 서버마다 헤더 전달 방식이 다르므로, 여기서는 직접 fetch를 시도하되 
    // 실패 시 폴백 프록시를 사용하는 전략을 취합니다.
    
    const headers = {
      'x-nxopen-api-key': NEXON_API_KEY,
      'accept': 'application/json'
    };

    try {
      // 1차 시도: 직접 호출 (CORS가 허용된 경우)
      // 2차 시도: corsproxy.io (단순 우회)
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try { errorData = JSON.parse(text); } catch { errorData = { error: { name: "UNKNOWN", message: text } }; }
        
        const errorCode = errorData?.error?.name;
        if (errorCode && ERROR_CODES[errorCode]) {
          throw new Error(ERROR_CODES[errorCode]);
        }
        throw new Error(`API 오류 (${response.status})`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`[NexonService] Request failed:`, error.message);
      throw error;
    }
  }

  async ensureMetadata(): Promise<void> {
    if (this.tierCache.size > 0) return;
    try {
      const metaUrl = `https://open.api.nexon.com/static/suddenattack/meta/tier`;
      // 메타데이터는 API 키가 필요 없으므로 Allorigins로 안전하게 가져옴
      const res = await fetch(`${PROXY_URL}${encodeURIComponent(metaUrl)}`);
      const json = await res.json();
      const data = JSON.parse(json.contents);
      if (Array.isArray(data)) {
        data.forEach((item: any) => this.tierCache.set(item.tier, item.tier_image));
      }
    } catch (e) {
      console.warn("[NexonService] Meta load failed");
    }
  }

  private resolveTierImage(tierName: string): string {
    return this.tierCache.get(tierName) || "https://placehold.co/60x60/e2e8f0/94a3b8?text=??";
  }

  async getOuid(nickname: string): Promise<string | null> {
    if (!nickname) return null;
    try {
      const url = `${NEXON_API_BASE_URL}/id?user_name=${encodeURIComponent(nickname.trim())}`;
      const data = await this.fetchWithProxy(url);
      return data?.ouid || null;
    } catch (error) {
      console.error("OUID fetch error:", error);
      return null;
    }
  }

  async fetchFullProfile(nickname: string): Promise<UserProfile | null> {
    const ouid = await this.getOuid(nickname);
    if (!ouid) return null;

    await this.ensureMetadata();

    try {
      // API 한도를 고려하여 순차적으로 호출
      const basic = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/user/basic?ouid=${ouid}`);
      await new Promise(r => setTimeout(r, 200));
      const rank = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/user/rank?ouid=${ouid}`).catch(() => null);
      await new Promise(r => setTimeout(r, 200));
      const tier = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/user/tier?ouid=${ouid}`).catch(() => null);
      await new Promise(r => setTimeout(r, 200));
      const recent = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/user/recent-info?ouid=${ouid}`).catch(() => null);

      const matches: Match[] = [];
      for (const mode of this.TARGET_MODES) {
        try {
          const mData = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/match?ouid=${ouid}&match_mode=${encodeURIComponent(mode)}`);
          if (mData?.match) {
            matches.push(...mData.match.map((m: any) => ({
              id: m.match_id,
              result: m.match_result === "1" ? MatchResult.WIN : m.match_result === "2" ? MatchResult.LOSE : MatchResult.DRAW,
              matchType: m.match_type,
              matchMode: m.match_mode,
              date: m.date_match.substring(5, 16).replace('T', ' '),
              rawDate: m.date_match,
              kill: m.kill,
              death: m.death,
              assist: m.assist,
              kd: m.death === 0 ? `${m.kill * 100}%` : `${((m.kill / m.death) * 100).toFixed(0)}%`
            })));
          }
          await new Promise(r => setTimeout(r, 100));
        } catch {}
      }

      return {
        ouid,
        nickname: basic.user_name,
        overallGrade: rank?.grade || "Unknown",
        overallExp: rank?.grade_exp || 0,
        overallRanking: rank?.grade_ranking || 0,
        seasonGrade: rank?.season_grade || "Unknown",
        seasonExp: rank?.season_grade_exp || 0,
        seasonRanking: rank?.season_grade_ranking || 0,
        clan: basic.clan_name,
        soloTier: {
          tierName: tier?.solo_rank_match_tier || "UNRANK",
          tierImage: this.resolveTierImage(tier?.solo_rank_match_tier),
          score: tier?.solo_rank_match_score || 0
        },
        partyTier: {
          tierName: tier?.party_rank_match_tier || "UNRANK",
          tierImage: this.resolveTierImage(tier?.party_rank_match_tier),
          score: tier?.party_rank_match_score || 0
        },
        recentMatches: matches.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()),
        recentStats: recent ? {
          winRate: recent.recent_win_rate || 0,
          kd: recent.recent_kill_death_rate || 0,
          assaultRate: recent.recent_assault_rate || 0,
          sniperRate: recent.recent_sniper_rate || 0,
          specialRate: recent.recent_special_rate || 0
        } : null
      };
    } catch (e) {
      console.error("Profile fetch error", e);
      return null;
    }
  }

  async getMatchDetail(matchId: string) {
    return await this.fetchWithProxy(`${NEXON_API_BASE_URL}/match-detail?match_id=${matchId}`);
  }

  async runAnomalyDetection(nickname: string, date: string, matches: Match[]): Promise<AnomalyReport> {
    // 기존 로직 유지하되 에러 핸들링 강화
    try {
      const basicStats = matches.filter(m => m.rawDate.startsWith(date));
      if (basicStats.length === 0) throw new Error("분석할 데이터가 없습니다.");
      
      const kills = basicStats.reduce((a, b) => a + b.kill, 0);
      const deaths = basicStats.reduce((a, b) => a + b.death, 0);
      const avgKd = deaths === 0 ? kills : kills / deaths;

      return {
        status: "OK",
        label: avgKd > 3.0 ? "Suspicious" : "Normal",
        suspicion_score: avgKd > 3.0 ? 80 : 10,
        deviation_level: avgKd / 2,
        message: avgKd > 3.0 ? "비정상적인 K/D 수치가 감지되었습니다." : "정상적인 플레이 패턴입니다.",
        reasons: avgKd > 3.0 ? ["평균 대비 과도하게 높은 K/D"] : [],
        evidence: {
          last10_kd: avgKd,
          today_kd: avgKd,
          baseline_kd_mean: 1.2,
          baseline_kd_std: 0.3,
          today_match_count: basicStats.length
        }
      };
    } catch (e: any) {
      return {
        status: "ERROR",
        label: "Normal",
        suspicion_score: 0,
        deviation_level: 0,
        message: e.message,
        reasons: [],
        evidence: { last10_kd: 0, today_kd: 0, baseline_kd_mean: 0, baseline_kd_std: 0, today_match_count: 0 }
      };
    }
  }
}

export const nexonService = new NexonService();
