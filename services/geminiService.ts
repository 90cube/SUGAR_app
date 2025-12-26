
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "../constants";
import { UserProfile, RecapStats } from "../types";

export class GeminiService {
  private get ai() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async generateText(prompt: string): Promise<string> {
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

  private masterPlayerData(profile: UserProfile): string {
    const s = profile.recentStats || { kd: 0, winRate: 0, sniperRate: 0, assaultRate: 0 };
    let style = "Flex";
    if (s.sniperRate > 50) style = "Sniper Main";
    else if (s.assaultRate > 60) style = "Rifler (Rusher)";
    else if (s.assaultRate > 40) style = "Rifler (Support)";

    return `
      - ID: ${profile.nickname}
      - Tier: ${profile.soloTier.tierName} (${profile.soloTier.score} RP)
      - Main Role: ${style}
      - K/D: ${s.kd}% | WinRate: ${s.winRate}%
      - Weapon Usage: Sniper(${s.sniperRate}%) / Assault(${s.assaultRate}%)
    `.trim();
  }

  public async analyzeTeamMatchup(teamA: UserProfile[], teamB: UserProfile[]): Promise<string> {
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
      1. **빅데이터 기반 심층 분석**: 단순히 제공된 수치를 나열하지 마십시오. 결과물에 직접적인 숫자 데이터(%, 점수 등)를 절대 포함하지 마십시오.
      2. **최신 트렌드 반영**: 현재 서든어택의 랭크전 메타를 반영하여 팀의 조합 완성도를 평가하십시오.
      3. **맵 상성 분석**: 유리한 맵과 불리한 맵을 구체적으로 지목하십시오.
      4. **어조**: 전문가답게 간결하고 단정적인 어체를 사용하십시오.
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
      const prompt = `
        당신은 서든어택 전문 개인 코치입니다. 플레이어의 데이터를 분석하여 피드백하세요.
        [오늘의 데이터] - 승률: ${stats.winRate}% (평소: ${stats.comparison.restWinRate}%) - K/D: ${stats.kd}%
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

  public async summarizeGameUpdate(rawText: string, masterPrompt: string): Promise<{ title: string; content: string }> {
      const prompt = `
        ${masterPrompt}

        **Strict Output Rules**:
        1. Title Format: Always start with [YY.MM.DD] based on the notice date.
        2. Content Formatting: 
           - Use standard Markdown only. 
           - For lists of items, rewards, or specs, YOU MUST USE REAL MARKDOWN TABLES (e.g., | Header | Header | \n |---|---| \n | Cell | Cell |).
           - DO NOT use double backslashes for newlines. Use actual single newline characters.
           - Ensure each section header (e.g., ### 1. 점검 정보) is followed by an actual newline.

        [Target Raw Data to Summarize]
        ${rawText}
      `;

      try {
          const response = await this.ai.models.generateContent({
              model: DEFAULT_GEMINI_MODEL,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: {
                      type: Type.STRING,
                      description: 'Date-prefixed summary title.',
                    },
                    content: {
                      type: Type.STRING,
                      description: 'Summary body in clean Markdown. Must include Tables.',
                    },
                  },
                  required: ["title", "content"],
                }
              }
          });
          
          let jsonStr = response.text || "{}";
          const parsed = JSON.parse(jsonStr);

          // Sanitization: Fix double-escaped newlines that Gemini often sends in JSON strings
          if (parsed.content) {
            parsed.content = parsed.content
              .replace(/\\n/g, '\n') // Replace literal \n string with actual newline
              .replace(/\n{3,}/g, '\n\n'); // Normalize excessive newlines
          }

          return parsed;
      } catch (e) {
          console.error("Update Summary Error", e);
          return {
              title: "업데이트 요약 실패",
              content: "AI가 데이터를 분석하는 데 실패했습니다. 원문을 직접 확인하시거나 다시 시도해주세요."
          };
      }
  }

  public async generateFormalRejection(rawReason: string): Promise<string> {
    const prompt = `
      당신은 서든어택 전적 연구소 'Su-Lab'의 운영 AI입니다. 
      사용자가 신청한 스트리밍 홍보 게시 요청을 반려해야 합니다.
      관리자가 작성한 투박한 반려 사유를 정중하고 격식 있는 '연구소 프로토콜' 말투로 다듬어주세요.
      
      [조건]
      1. '반려 사유: ' 로 시작하지 말고 바로 본론을 말하세요.
      2. 연구소, 데이터, 적합성, 가이드라인 등의 단어를 적절히 섞으세요.
      3. 정중하지만 단호한 어조를 유지하세요.
      4. 200자 이내로 작성하세요.

      [관리자의 원문 사유]
      "${rawReason}"
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
      });
      return response.text || "연구소 내부 기준 미달로 인해 요청이 반려되었습니다.";
    } catch (e) {
      return `요청이 반려되었습니다. 사유: ${rawReason}`;
    }
  }
}

export const geminiService = new GeminiService();
