
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
      const today = new Date();
      const yy = today.getFullYear().toString().slice(2);
      const mm = (today.getMonth() + 1).toString().padStart(2, '0');
      const dd = today.getDate().toString().padStart(2, '0');
      const dateTag = `[${yy}.${mm}.${dd}]`;

      const prompt = `
        ${masterPrompt}

        **추가 강제 지침**:
        1. 제목에는 반드시 오늘 날짜 태그인 "${dateTag}"를 포함시키십시오.
        2. 모든 정보는 마크다운(Markdown) 형식을 사용하며, 특히 표(Table)가 필요한 부분은 반드시 표로 작성하십시오.
        3. 본문의 마지막 문장은 반드시 "Su-Lab 매니저 "CUBE" 였습니다." 로 끝나야 합니다.

        [분석할 원문 데이터]
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
                    title: { type: Type.STRING, description: "The summary title with date tag" },
                    content: { type: Type.STRING, description: "The summarized report in markdown including CUBE signature" },
                  },
                  required: ["title", "content"],
                }
              }
          });
          
          let jsonStr = response.text || "{}";
          const parsed = JSON.parse(jsonStr);

          // Ensure proper line breaks in the content
          if (parsed.content) {
            parsed.content = parsed.content.replace(/\\n/g, '\n').trim();
          }

          return parsed;
      } catch (e) {
          console.error("Update Summary Error", e);
          return {
              title: `${dateTag} 업데이트 데이터 마스터링 실패`,
              content: "원문 분석 중 기술적 오류가 발생했습니다. 직접 내용을 입력해 주십시오.\n\nSu-Lab 매니저 \"CUBE\" 였습니다."
          };
      }
  }

  public async generateFormalRejection(rawReason: string): Promise<string> {
    const prompt = `
      당신은 서든어택 전적 연구소 'Su-Lab'의 운영 AI입니다. 
      사용자가 신청한 스트리밍 홍보 게시 요청을 반려해야 합니다.
      관리자가 작성한 투박한 반려 사유를 정중하고 격식 있는 '연구소 프로토콜' 말투로 다듬어주세요.
      
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
