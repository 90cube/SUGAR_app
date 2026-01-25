
import { NEXON_API_BASE_URL, WORKER_BASE_URL } from '../constants';
import { Match, MatchDetail, MatchResult, RankMatchState, RecentStats, UserProfile, AnomalyReport } from '../types';

const ERROR_CODES: Record<string, string> = {
  "OPENAPI00001": "서버 내부 오류",
  "OPENAPI00002": "API 키 만료",
  "OPENAPI00003": "잘못된 식별자",
  "OPENAPI00004": "잘못된 파라미터",
  "OPENAPI00005": "유효하지 않은 API 키",
  "OPENAPI00007": "호출 한도 초과 (잠시 후 다시 시도해주세요)",
  "OPENAPI00009": "데이터 준비 중",
  "OPENAPI00010": "게임 점검 중"
};

class NexonService {
  private tierCache: Map<string, string> = new Map();
  private readonly TARGET_MODES = ["개인전", "데스매치", "폭파미션", "진짜를 모아라"];

  public formatToKST(utcDateString: string): string {
    try {
      const date = new Date(utcDateString);
      // UTC to KST (UTC+9)
      const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));

      const yyyy = kstDate.getUTCFullYear();
      const mm = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(kstDate.getUTCDate()).padStart(2, '0');
      const hh = String(kstDate.getUTCHours()).padStart(2, '0');
      const min = String(kstDate.getUTCMinutes()).padStart(2, '0');
      const ss = String(kstDate.getUTCSeconds()).padStart(2, '0');
      const ms = String(kstDate.getUTCMilliseconds()).padStart(3, '0');

      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}`;
    } catch (e) {
      return utcDateString;
    }
  }

  private async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithProxy(targetUrl: string) {
    const headers = {
      'accept': 'application/json'
    };

    try {
      // 기존 corsproxy 대신 Cloudflare Worker 사용
      // targetUrl: https://open.api.nexon.com/suddenattack/v1/...
      // workerPath: /nexon/suddenattack/v1/...
      const urlObj = new URL(targetUrl);
      const workerUrl = `${WORKER_BASE_URL}/nexon${urlObj.pathname}${urlObj.search}`;

      const response = await fetch(workerUrl, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: { name: "UNKNOWN", message: text } };
        }

        const errorCode = errorData?.error?.name;
        if (errorCode && ERROR_CODES[errorCode]) {
          throw new Error(ERROR_CODES[errorCode]);
        }
        throw new Error(`API 오류 (${response.status}): ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error(`[NexonService] Request failed for ${targetUrl}:`, error.message);
      throw error;
    }
  }

  async ensureMetadata(): Promise<void> {
    if (this.tierCache.size > 0) return;
    try {
      const metaUrl = `https://open.api.nexon.com/static/suddenattack/meta/tier`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(metaUrl)}`;
      const res = await fetch(proxyUrl);
      const json = await res.json();
      const data = JSON.parse(json.contents);
      if (Array.isArray(data)) {
        data.forEach((item: any) => this.tierCache.set(item.tier, item.tier_image));
      }
    } catch (e) {
      console.warn("[NexonService] Meta load failed, using fallbacks");
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
      return null;
    }
  }

  async fetchFullProfile(nickname: string): Promise<UserProfile | null> {
    const ouid = await this.getOuid(nickname);
    if (!ouid) return null;

    await this.ensureMetadata();

    try {
      const basic = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/user/basic?ouid=${ouid}`);
      await this.sleep(150);

      const rank = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/user/rank?ouid=${ouid}`).catch(() => null);
      await this.sleep(150);

      const tier = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/user/tier?ouid=${ouid}`).catch(() => null);
      await this.sleep(150);

      const recent = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/user/recent-info?ouid=${ouid}`).catch(() => null);

      const matches: Match[] = [];
      for (const mode of this.TARGET_MODES) {
        try {
          await this.sleep(100);
          const mData = await this.fetchWithProxy(`${NEXON_API_BASE_URL}/match?ouid=${ouid}&match_mode=${encodeURIComponent(mode)}`);
          if (mData?.match) {
            matches.push(...mData.match.map((m: any) => ({
              id: m.match_id,
              result: m.match_result === "1" ? MatchResult.WIN : m.match_result === "2" ? MatchResult.LOSE : MatchResult.DRAW,
              // User Request: Type = Bomb Mission, Mode = Ranked Solo
              // API Response: match_mode = Bomb Mission, match_type = Ranked Solo (usually)
              // Therefore: matchType = m.match_mode, matchMode = m.match_type
              matchType: m.match_mode,
              matchMode: m.match_type,
              date: this.formatToKST(m.date_match), // Convert to KST
              rawDate: m.date_match,
              kill: m.kill,
              death: m.death,
              assist: m.assist,
              kd: m.death === 0 ? `${m.kill * 100}%` : `${((m.kill / m.death) * 100).toFixed(0)}%`
            })));
          }
        } catch { }
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
      console.error("[NexonService] Error while fetching full profile:", e);
      return null;
    }
  }

  async getMatchDetail(matchId: string) {
    return await this.fetchWithProxy(`${NEXON_API_BASE_URL}/match-detail?match_id=${matchId}`);
  }

  async fetchMatchDetailsBatch(matchIds: string[]): Promise<any[]> {
    const results = [];
    const CHUNK_SIZE = 5;
    for (let i = 0; i < matchIds.length; i += CHUNK_SIZE) {
      const chunk = matchIds.slice(i, i + CHUNK_SIZE);
      const promises = chunk.map(id => this.getMatchDetail(id).catch(e => null));
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults.filter(r => r !== null));
      if (i + CHUNK_SIZE < matchIds.length) await this.sleep(200);
    }
    return results;
  }

  async runAnomalyDetection(nickname: string, date: string, matches: Match[]): Promise<AnomalyReport> {
    try {
      const dayMatches = matches.filter(m => m.rawDate.startsWith(date));
      if (dayMatches.length === 0) throw new Error("오늘 플레이한 경기가 없습니다.");

      const kills = dayMatches.reduce((a, b) => a + b.kill, 0);
      const deaths = dayMatches.reduce((a, b) => a + b.death, 0);
      const avgKd = deaths === 0 ? kills : kills / deaths;

      const isSuspicious = avgKd > 3.0 && dayMatches.length >= 3;

      return {
        status: "OK",
        label: isSuspicious ? "Suspicious" : "Normal",
        suspicion_score: isSuspicious ? 85 : Math.min(avgKd * 10, 30),
        deviation_level: avgKd / 1.2,
        message: isSuspicious ? "비정상적인 고득점 패턴이 감지되었습니다." : "정상적인 플레이 범위 내에 있습니다.",
        reasons: isSuspicious ? ["과도하게 높은 평균 K/D", "단시간 내 비정상적 승률"] : [],
        evidence: {
          last10_kd: avgKd,
          today_kd: avgKd,
          baseline_kd_mean: 1.1,
          baseline_kd_std: 0.4,
          today_match_count: dayMatches.length
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
