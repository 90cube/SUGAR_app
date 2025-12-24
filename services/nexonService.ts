
import { NEXON_API_KEY, NEXON_API_BASE_URL } from '../constants';
import { Match, MatchDetail, MatchResult, RankMatchState, RecentStats, UserProfile, AnomalyReport } from '../types';

// Use distinct proxies for API (needs headers) and Static Content (public, no headers)
const API_PROXY = "https://corsproxy.io/?";
const STATIC_PROXY = "https://api.allorigins.win/raw?url=";

const ERROR_CODES: Record<string, string> = {
  "OPENAPI00001": "서버 내부 오류 (500)",
  "OPENAPI00002": "API 키 권한이 없거나 만료되었습니다.", 
  "OPENAPI00003": "잘못된 식별자입니다 (400)",
  "OPENAPI00004": "잘못된 파라미터입니다 (400)",
  "OPENAPI00005": "유효하지 않은 API 키입니다 (400)",
  "OPENAPI00006": "지원하지 않는 게임 또는 경로입니다 (400)",
  "OPENAPI00007": "API 호출 한도를 초과했습니다 (429)",
  "OPENAPI00009": "데이터 준비 중입니다 (400)",
  "OPENAPI00010": "게임 점검 중입니다 (400)",
  "OPENAPI00011": "API 점검 중입니다 (503)"
};

interface TierMeta {
  tier: string;
  tier_image: string;
}

interface FetchOptions {
  skipAuth?: boolean;
}

class NexonService {
  private tierCache: Map<string, string> = new Map();
  
  // The specific game modes required by the API as match_mode
  private readonly TARGET_MODES = ["개인전", "데스매치", "폭파미션", "진짜를 모아라"];

  private getHeaders() {
    return {
      'x-nxopen-api-key': NEXON_API_KEY,
      'accept': 'application/json'
    };
  }

  // Helper: Delay to prevent rate limiting
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper to fetch API Data (Authenticated)
  private async fetchApiWithProxy(endpoint: string) {
    const targetUrl = endpoint;
    const proxyUrl = `${API_PROXY}${encodeURIComponent(targetUrl)}`;
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: this.getHeaders()
      });

      let data;
      const text = await response.text();
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        if (response.status === 403) {
           console.warn(`[NexonService] 403 Forbidden on API call.`);
        }
      }

      if (!response.ok) {
        if (data && data.error) {
          const errorCode = data.error.name; 
          const errorMessage = data.error.message;
          
          if (errorCode === "OPENAPI00004") {
             throw new Error("잘못된 파라미터");
          }
          if (errorCode === "OPENAPI00007") {
             throw new Error("요청 한도 초과");
          }

          const mappedError = ERROR_CODES[errorCode] || errorMessage || "알 수 없는 API 오류";
          console.error(`[NexonService] API Error: ${errorCode} - ${errorMessage}`);
          throw new Error(mappedError);
        }
        
        if (response.status === 403) throw new Error("접근 권한이 없습니다 (403)");
        if (response.status === 404) throw new Error("리소스를 찾을 수 없습니다 (404)");
        if (response.status === 429) throw new Error("요청이 너무 많습니다 (429)");
        
        throw new Error(`HTTP 오류: ${response.status}`);
      }

      return data;
    } catch (error: any) {
      if (error.message !== "잘못된 파라미터") {
        console.error(`[NexonService] API Request failed for ${endpoint}:`, error.message);
      }
      throw error;
    }
  }

  // Helper to fetch Static Data (Public, No Auth)
  private async fetchStaticWithProxy(endpoint: string) {
    const targetUrl = endpoint;
    const proxyUrl = `${STATIC_PROXY}${encodeURIComponent(targetUrl)}`;
    
    // console.log(`[NexonService] Static Fetch: ${targetUrl}`);

    try {
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return data;
      } catch (e) {
        // If the proxy returns XML or HTML error page, ignore it
        console.warn(`[NexonService] Failed to parse JSON from static endpoint. Response might be XML/HTML error.`);
        return null;
      }
    } catch (error: any) {
      console.warn(`[NexonService] Static Request failed for ${endpoint}:`, error.message);
      return null;
    }
  }

  // --- Metadata Handling ---
  
  async ensureMetadata(): Promise<void> {
    // Only fetching tier meta. Match types are not strictly needed as we use hardcoded strings.
    await this.ensureTierMeta();
  }

  async ensureTierMeta(): Promise<void> {
    if (this.tierCache.size > 0) return;

    try {
      const metaUrl = `https://open.api.nexon.com/static/suddenattack/meta/tier`;
      const data = await this.fetchStaticWithProxy(metaUrl);
      
      if (Array.isArray(data)) {
        data.forEach((item: TierMeta) => {
           this.tierCache.set(item.tier, item.tier_image);
        });
        console.log(`[NexonService] Cached ${this.tierCache.size} tier images.`);
      }
    } catch (e) {
      console.warn("[NexonService] Tier metadata load failed, using placeholders.");
    }
  }

  private resolveTierImage(tierName: string): string {
    if (!tierName || tierName === "UNRANK") {
      return "https://placehold.co/60x60/e2e8f0/94a3b8?text=UN"; 
    }
    return this.tierCache.get(tierName) || "https://placehold.co/60x60/e2e8f0/94a3b8?text=??";
  }

  // --- Helper: Formatters ---
  private formatMatchResult(code: string): MatchResult {
    if (code === "1") return MatchResult.WIN;
    if (code === "2") return MatchResult.LOSE;
    if (code === "3") return MatchResult.DRAW;
    return MatchResult.NONE;
  }

  private formatKD(kill: number, death: number): string {
    if (death === 0) return `${kill * 100}%`;
    const rate = (kill / death) * 100;
    return `${rate.toFixed(0)}%`;
  }

  private formatDate(isoDate: string): string {
    try {
      const date = new Date(isoDate);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      return `${month}-${day} ${hours}:${mins}`;
    } catch {
      return isoDate;
    }
  }

  // --- Core API Methods ---

  // 1. Resolve OUID
  async getOuid(nickname: string): Promise<string | null> {
    try {
      const url = `${NEXON_API_BASE_URL}/id?user_name=${encodeURIComponent(nickname)}`;
      const data = await this.fetchApiWithProxy(url);
      
      if (!data || !data.ouid) {
        console.warn("[NexonService] OUID not found in response");
        return null;
      }

      return data.ouid;
    } catch (error) {
      console.error("Failed to fetch OUID:", error);
      return null;
    }
  }

  // 2. User Basic Info
  async getUserBasic(ouid: string) {
    return await this.fetchApiWithProxy(`${NEXON_API_BASE_URL}/user/basic?ouid=${ouid}`);
  }

  // 3. User Rank
  async getUserRank(ouid: string) {
    return await this.fetchApiWithProxy(`${NEXON_API_BASE_URL}/user/rank?ouid=${ouid}`);
  }

  // 4. User Tier
  async getUserTier(ouid: string) {
    return await this.fetchApiWithProxy(`${NEXON_API_BASE_URL}/user/tier?ouid=${ouid}`);
  }

  // 5. Recent Info
  async getUserRecentInfo(ouid: string) {
    return await this.fetchApiWithProxy(`${NEXON_API_BASE_URL}/user/recent-info?ouid=${ouid}`);
  }

  // 6. Match List
  async getMatchList(ouid: string): Promise<Match[]> {
    try {
      const allMatches: Match[] = [];
      
      // Sequential fetching to avoid Rate Limiting (429)
      for (const mode of this.TARGET_MODES) {
        try {
          const url = `${NEXON_API_BASE_URL}/match?ouid=${ouid}&match_mode=${encodeURIComponent(mode)}`;
          
          // Add a small delay between mode fetches
          await this.delay(200);
          
          const data = await this.fetchApiWithProxy(url);
          const processed = this.processMatchData(data);
          allMatches.push(...processed);
        } catch (e: any) {
          // Ignore invalid parameter errors (no data for mode)
          if (e.message !== "잘못된 파라미터") {
             console.warn(`[NexonService] Failed to fetch matches for mode ${mode}:`, e.message);
          }
        }
      }

      return allMatches.sort((a, b) => 
        new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );

    } catch (e: any) {
      console.error("[NexonService] Failed to fetch match list:", e);
      return [];
    }
  }

  private processMatchData(data: any): Match[] {
    if (data && data.match && Array.isArray(data.match)) {
      return data.match.map((m: any) => ({
        id: m.match_id,
        result: this.formatMatchResult(m.match_result),
        matchType: m.match_type,
        matchMode: m.match_mode,
        date: this.formatDate(m.date_match),
        rawDate: m.date_match, // Keep raw ISO/KST string
        kill: m.kill,
        death: m.death,
        assist: m.assist,
        kd: this.formatKD(m.kill, m.death)
      }));
    }
    return [];
  }

  // 7. Match Detail
  async getMatchDetail(matchId: string): Promise<any> {
    try {
       const data = await this.fetchApiWithProxy(`${NEXON_API_BASE_URL}/match-detail?match_id=${matchId}`);
       return data;
    } catch (e) {
      console.error("[NexonService] Failed to fetch match detail:", e);
      return null;
    }
  }

  // 8. Anomaly Detection
  async runAnomalyDetection(
    nickname: string, 
    selectedDateKST: string, 
    cachedMatches: Match[]
  ): Promise<AnomalyReport> {
    try {
      // 1. Resolve OUID (mandatory check)
      const ouid = await this.getOuid(nickname);
      if (!ouid) throw new Error("존재하지 않는 닉네임입니다.");

      // 2. Fetch Fresh Recent Info (Trend)
      const recentInfoRaw = await this.getUserRecentInfo(ouid);
      
      // 3. Last 10 Matches Guardrail
      // Sort cachedMatches by date desc just in case
      const sortedMatches = [...cachedMatches].sort((a, b) => 
          new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );
      const last10 = sortedMatches.slice(0, 10);
      
      let l10_kills = 0;
      let l10_deaths = 0;
      last10.forEach(m => {
          l10_kills += m.kill;
          l10_deaths += m.death;
      });
      
      // KD calculation: total_kills / max(1, total_deaths)
      const last10_kd_val = l10_kills / Math.max(1, l10_deaths);
      
      if (last10_kd_val <= 1.0) {
          return {
              status: "SKIPPED_LOW_IMPACT",
              label: "Normal",
              suspicion_score: 0,
              deviation_level: 0,
              message: "최근 10경기 K/D가 1 이하로 영향이 낮아 이상감지를 생략했습니다.",
              reasons: [],
              evidence: {
                  last10_kd: parseFloat(last10_kd_val.toFixed(2)),
                  today_kd: 0,
                  baseline_kd_mean: 0,
                  baseline_kd_std: 0,
                  today_match_count: 0
              }
          };
      }

      // 4. Split Baseline vs Today
      // "Today" is defined by selectedDateKST (e.g., '2023-10-27')
      const todayMatches = sortedMatches.filter(m => m.rawDate.startsWith(selectedDateKST));
      const baselineMatches = sortedMatches.filter(m => !m.rawDate.startsWith(selectedDateKST));

      if (baselineMatches.length < 5) {
        // Not enough history for anomaly detection
         return {
            status: "OK",
            label: "Normal",
            suspicion_score: 0,
            deviation_level: 0,
            message: "이전 기록이 부족하여 분석할 수 없습니다.",
            reasons: ["기록 부족 (Insufficient history)"],
            evidence: {
                last10_kd: parseFloat(last10_kd_val.toFixed(2)),
                today_kd: 0,
                baseline_kd_mean: 0,
                baseline_kd_std: 0,
                today_match_count: todayMatches.length
            }
         };
      }

      // 5. Compute Stats
      const calcMatchKD = (m: Match) => m.kill / Math.max(1, m.death);
      
      const baselineKDs = baselineMatches.map(calcMatchKD);
      const todayKDs = todayMatches.map(calcMatchKD);

      const sumBase = baselineKDs.reduce((a, b) => a + b, 0);
      const mean = sumBase / baselineKDs.length;
      
      const variance = baselineKDs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / baselineKDs.length;
      const std = Math.sqrt(variance) || 0.001; // Avoid zero div

      let today_total_kills = 0;
      let today_total_deaths = 0;
      todayMatches.forEach(m => {
          today_total_kills += m.kill;
          today_total_deaths += m.death;
      });
      const today_kd_agg = todayMatches.length > 0 ? today_total_kills / Math.max(1, today_total_deaths) : 0;

      // Signals
      let suspicion_score = 0;
      const reasons: string[] = [];

      // A. KD Z-Score
      // Using today's aggregate KD vs baseline mean
      const kd_z = (today_kd_agg - mean) / std;
      if (todayMatches.length > 0) {
        if (kd_z > 3.0) {
            suspicion_score += 40;
            reasons.push(`오늘 K/D가 평소보다 매우 높음 (${(kd_z).toFixed(1)}σ)`);
        } else if (kd_z > 2.0) {
            suspicion_score += 20;
            reasons.push(`높은 퍼포먼스 편차 감지`);
        }
      }

      // B. Consistency Anomaly (High KD consistency)
      // Check if many matches in today/last10 are consistently high (e.g., > mean + 1.5std)
      const high_matches = last10.filter(m => calcMatchKD(m) > (mean + 1.5 * std));
      if (high_matches.length >= 8) {
          suspicion_score += 30;
          reasons.push("비정상적으로 일정한 고득점");
      }

      // C. Recent Info Trend Shift (if available)
      if (recentInfoRaw && recentInfoRaw.recent_kill_death_rate) {
          const recent_kd_pct = recentInfoRaw.recent_kill_death_rate; // e.g. 55%
          const recent_kd_ratio = recent_kd_pct / 100; // 0.55
          
          // If today's KD is vastly higher than "recent" trend
          if (today_kd_agg > recent_kd_ratio * 2.0 && todayMatches.length > 3) {
              suspicion_score += 20;
              reasons.push("최근 동향 대비 급격한 실력 상승");
          }
      }

      // D. Volume Spike (optional simple check)
      if (today_kd_agg > 3.0 && mean < 1.5) {
          suspicion_score += 15; // Massive jump
      }

      // Clamp
      suspicion_score = Math.min(100, Math.max(0, suspicion_score));
      const deviation_level = parseFloat((suspicion_score / 100).toFixed(2));
      const label = suspicion_score >= 70 ? "Suspicious" : "Normal";

      return {
          status: "OK",
          label,
          suspicion_score,
          deviation_level,
          message: label === "Suspicious" ? "비정상적인 패턴이 감지되었습니다." : "특이사항이 발견되지 않았습니다.",
          reasons: reasons.slice(0, 3), // Top 3
          evidence: {
              last10_kd: parseFloat(last10_kd_val.toFixed(2)),
              today_kd: parseFloat(today_kd_agg.toFixed(2)),
              baseline_kd_mean: parseFloat(mean.toFixed(2)),
              baseline_kd_std: parseFloat(std.toFixed(2)),
              today_match_count: todayMatches.length,
              recent_win_rate: recentInfoRaw?.recent_win_rate || 0,
              recent_kill_death_rate: recentInfoRaw?.recent_kill_death_rate || 0
          }
      };

    } catch (e: any) {
        return {
             status: "ERROR",
             label: "Normal",
             suspicion_score: 0,
             deviation_level: 0,
             message: e.message || "알 수 없는 오류",
             reasons: [],
             evidence: { 
                 last10_kd: 0, today_kd: 0, baseline_kd_mean: 0, baseline_kd_std: 0, today_match_count: 0 
             }
        };
    }
  }

  // Orchestrator
  async fetchFullProfile(nickname: string): Promise<UserProfile | null> {
    const ouid = await this.getOuid(nickname);
    if (!ouid) return null;

    // Trigger metadata load in background (non-blocking if it fails)
    this.ensureMetadata().catch(err => console.warn("Metadata check failed", err));

    try {
      // SEQUENTIAL Fetching to prevent 429 Errors
      // 1. Basic
      const basic = await this.getUserBasic(ouid);
      if (!basic) {
        console.error("Basic info fetch failed");
        return null;
      }

      // 2. Rank
      await this.delay(150);
      const rank = await this.getUserRank(ouid).catch(e => null);

      // 3. Tier
      await this.delay(150);
      const tier = await this.getUserTier(ouid).catch(e => null);

      // 4. Recent Info
      await this.delay(150);
      const recent = await this.getUserRecentInfo(ouid).catch(e => null);

      // 5. Matches (Internal loop also has delays)
      await this.delay(150);
      const matches = await this.getMatchList(ouid).catch(e => []);

      const soloTier: RankMatchState = {
        tierName: tier?.solo_rank_match_tier || "UNRANK",
        tierImage: this.resolveTierImage(tier?.solo_rank_match_tier),
        score: tier?.solo_rank_match_score || 0
      };

      const partyTier: RankMatchState = {
        tierName: tier?.party_rank_match_tier || "UNRANK",
        tierImage: this.resolveTierImage(tier?.party_rank_match_tier),
        score: tier?.party_rank_match_score || 0
      };

      const recentStats: RecentStats | null = recent ? {
        winRate: parseFloat((recent.recent_win_rate || 0).toFixed(1)),
        kd: parseFloat((recent.recent_kill_death_rate || 0).toFixed(1)),
        assaultRate: parseFloat((recent.recent_assault_rate || 0).toFixed(1)),
        sniperRate: parseFloat((recent.recent_sniper_rate || 0).toFixed(1)),
        specialRate: parseFloat((recent.recent_special_rate || 0).toFixed(1))
      } : null;

      return {
        ouid: ouid, 
        nickname: basic.user_name,
        overallGrade: rank?.grade || "Unknown",
        overallExp: rank?.grade_exp || 0,
        overallRanking: rank?.grade_ranking || 0,
        seasonGrade: rank?.season_grade || "Unknown",
        seasonExp: rank?.season_grade_exp || 0,
        seasonRanking: rank?.season_grade_ranking || 0,
        clan: basic.clan_name,
        soloTier,
        partyTier,
        recentMatches: matches,
        recentStats
      };

    } catch (e) {
      console.error("Profile construction failed", e);
      return null;
    }
  }
}

export const nexonService = new NexonService();
