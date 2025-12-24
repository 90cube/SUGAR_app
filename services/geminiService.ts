
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "../constants";
import { UserProfile, RecapStats } from "../types";

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    } else if (process.env.API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
  }

  public initialize(apiKey: string): void {
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async generateText(prompt: string): Promise<string> {
    if (!this.ai) {
      console.warn("Gemini Service: API Key not found. Returning mock response for scaffold.");
      return "Gemini service is not initialized with an API key yet.";
    }

    try {
      const response = await this.ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
      });
      
      return response.text || "";
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }

  /**
   * Data Mastering Helper
   * Extracts only critical combat data from the full profile to save tokens and improve LLM focus.
   */
  private masterPlayerData(profile: UserProfile): string {
    const s = profile.recentStats || { kd: 0, winRate: 0, sniperRate: 0, assaultRate: 0 };
    
    // Determine Playstyle based on weapon usage
    let style = "Flex";
    if (s.sniperRate > 50) style = "Sniper Main";
    else if (s.assaultRate > 60) style = "Rifler (Rusher)";
    else if (s.assaultRate > 40) style = "Rifler (Support)";

    // Note: We provide numbers to the LLM for calculation, but instruct it not to output them.
    return `
      - ID: ${profile.nickname}
      - Tier: ${profile.soloTier.tierName} (${profile.soloTier.score} RP)
      - Main Role: ${style}
      - K/D: ${s.kd}% | WinRate: ${s.winRate}%
      - Weapon Usage: Sniper(${s.sniperRate}%) / Assault(${s.assaultRate}%)
    `.trim();
  }

  public async analyzeMatchup(myProfile: UserProfile, opponentProfile: UserProfile): Promise<string> {
    // Legacy method wrapper for backward compatibility if needed, redirects to team analysis
    return this.analyzeTeamMatchup([myProfile], [opponentProfile]);
  }

  public async analyzeTeamMatchup(teamA: UserProfile[], teamB: UserProfile[]): Promise<string> {
    if (!this.ai) return "Gemini API Key is missing. Cannot perform analysis.";

    // 1. Master the data (Summarize)
    const teamAData = teamA.map(p => this.masterPlayerData(p)).join('\n');
    const teamBData = teamB.map(p => this.masterPlayerData(p)).join('\n');

    const prompt = `
      당신은 대한민국 No.1 FPS 게임 '서든어택'의 전문 AI 전력 분석관입니다.
      서든어택의 방대한 빅데이터와 최신 랭크전 메타(Meta)를 기반으로 Team A(블루팀)와 Team B(레드팀)의 매치업을 분석하십시오.

      [Team A 선수 명단]
      ${teamAData}

      [Team B 선수 명단]
      ${teamBData}

      **분석 지침 (필수 준수):**
      1. **빅데이터 기반 심층 분석**: 단순히 제공된 수치를 나열하지 마십시오. (예: "KD 55%다" (X) -> "압도적인 샷발을 보유했다" (O)). **결과물에 직접적인 숫자 데이터(%, 점수 등)를 절대 포함하지 마십시오.**
      2. **최신 트렌드 반영**: 현재 서든어택의 랭크전 메타(스나이퍼의 영향력, 돌격 소총의 밸런스 등)를 반영하여 팀의 조합 완성도를 평가하십시오.
      3. **맵 상성 분석**: 각 팀의 성향(스나이퍼 비중, 러쉬 성향 등)을 분석하여, **유리한 맵**과 **불리한 맵**을 구체적으로 지목하십시오. (예: 제3보급창고, 드래곤로드, 크로스카운터 등)
      4. **어조**: 전문가답게 **간결하고 단정적인 어체**를 사용하십시오. (~함, ~임, ~것으로 판단됨).

      **출력 양식:**
      
      ## 1. 승부 예측
      * **예상 승리팀**: [팀 이름] (승률 높음/비등함/낮음 등 정성적 표현)
      * **핵심 근거**: [빅데이터 패턴 분석 결과 요약]

      ## 2. 전력 비교 (메타 분석)
      * **Team A**: [장점 및 플레이 스타일 분석]
      * **Team B**: [장점 및 플레이 스타일 분석]
      
      ## 3. 전장 분석 (Map Prediction)
      * **Team A 유리**: [맵 이름] - [이유: 예) 스나이퍼 라인 장악 유리]
      * **Team B 유리**: [맵 이름] - [이유: 예) 난전 및 백업 속도 우위]

      ## 4. 승리 시나리오
      * **Team A**: [승리를 위한 행동 지침]
      * **Team B**: [승리를 위한 행동 지침]
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
      });
      return response.text || "Analysis failed.";
    } catch (error) {
      console.error("Team Analysis Error:", error);
      return "Failed to generate analysis due to an API error.";
    }
  }

  public async analyzeDailyRecap(stats: RecapStats): Promise<string> {
      if (!this.ai) return "AI Service not initialized.";

      const prompt = `
        당신은 서든어택 전문 개인 코치입니다.
        아래는 플레이어의 '오늘의 경기 요약' 통계입니다. 이 데이터를 바탕으로 오늘의 퍼포먼스를 피드백해주세요.

        [오늘의 데이터]
        - 날짜: ${stats.date}
        - 총 경기 수: ${stats.totalMatches}판
        - 승률: ${stats.winRate}% (평소: ${stats.comparison.restWinRate}%)
        - 킬/데스(K/D): ${stats.kd}% (평소: ${stats.comparison.restKd}%)

        **지침:**
        1. **수치 언급 최소화**: 정확한 숫자보다는 "평소보다 기량이 올랐다", "승률이 저조하다" 등 흐름을 분석하세요.
        2. **상관관계 분석**: K/D는 높은데 승률이 낮다면 "영양가 없는 킬(Empty Frags)"을 지적하고, 반대라면 "희생적인 플레이"를 칭찬하세요.
        3. **코칭 톤**: 격려하면서도 날카로운 조언을 짧게(3~4문장) 제공하세요.
        4. **한국어**로 작성하세요.
      `;

      try {
        const response = await this.ai.models.generateContent({
            model: DEFAULT_GEMINI_MODEL,
            contents: prompt
        });
        return response.text || "분석을 불러올 수 없습니다.";
      } catch (e) {
          console.error("Recap Analysis Error", e);
          return "AI 분석 중 오류가 발생했습니다.";
      }
  }

  // --- New Method for Admin Update Notices ---
  public async summarizeGameUpdate(rawText: string, masterPrompt: string): Promise<{ title: string; content: string }> {
      if (!this.ai) throw new Error("AI Service Not Initialized");

      const prompt = `
        ${masterPrompt}

        [Raw Update Text]
        ${rawText}

        OUTPUT FORMAT:
        You must return a valid JSON object string. Do not use Markdown code blocks.
        JSON Structure:
        {
          "title": "A short, catchy title summarizing the main update (Max 20 chars)",
          "content": "HTML formatted body content. Use <br/> for line breaks, NOT </br>. Use <h3>, <ul>, <li>, <p>, <strong>."
        }
      `;

      try {
          const response = await this.ai.models.generateContent({
              model: DEFAULT_GEMINI_MODEL,
              contents: prompt,
              config: {
                responseMimeType: "application/json" 
              }
          });
          
          let jsonStr = response.text || "{}";
          
          // Cleanup: Remove markdown code blocks if present (Gemini sometimes adds them despite JSON mode)
          jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

          let result = JSON.parse(jsonStr);

          // Post-processing: Fix common HTML tag errors from LLM
          if (result.content) {
            result.content = result.content
                .replace(/<\/br>/gi, '<br/>')
                .replace(/<br>/gi, '<br/>')
                .replace(/<br >/gi, '<br/>');
          }

          return result;
      } catch (e) {
          console.error("Update Summary Error", e);
          
          // Fallback: Return raw text wrapped in paragraph if JSON parsing fails
          return {
              title: "업데이트 공지 (자동 생성 실패)",
              content: `<p>${rawText.substring(0, 300)}...</p><p>(AI 요약 실패 - 원문을 확인하세요)</p>`
          };
      }
  }
}

export const geminiService = new GeminiService();
