
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "../constants";
import { UserProfile, RecapStats } from "../types";

export class GeminiService {
  private get ai() {
    // Create new instance every call to ensure up-to-date environment variables
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async generateText(prompt: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        return response.text || "분석을 불러올 수 없습니다.";
      } catch (e) {
          console.error("Recap Analysis Error", e);
          return "AI 분석 중 오류가 발생했습니다.";
      }
  }

  /**
   * 공식 공지사항을 요약하여 제목과 본문을 생성합니다.
   * @param rawText 원문 텍스트
   * @param masterPrompt 관리자가 설정한 요약 지침
   */
  public async summarizeGameUpdate(rawText: string, masterPrompt: string): Promise<{ title: string; content: string }> {
      const today = new Date();
      const yy = today.getFullYear().toString().slice(2);
      const mm = (today.getMonth() + 1).toString().padStart(2, '0');
      const dd = today.getDate().toString().padStart(2, '0');
      const dateTag = `[${yy}.${mm}.${dd}]`;

      const prompt = `
        ${masterPrompt}

        **추가 강제 프로토콜**:
        1. 결과 제목(Title)에는 반드시 오늘 날짜 태그인 "${dateTag}"를 포함시키십시오.
        2. 모든 정보는 마크다운(Markdown) 형식을 사용하며, 특히 아이템 목록이나 보상 정보는 반드시 마크다운 표(Table)로 정규화하십시오.
        3. 본문의 마지막 문장은 반드시 "Su-Lab 매니저 "CUBE" 였습니다." 로 정확히 끝맺음하십시오.

        [데이터 소스 (원문)]
        ${rawText}
      `;

      try {
          const response = await this.ai.models.generateContent({
              model: DEFAULT_GEMINI_MODEL,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Today's summary title with date tag" },
                    content: { type: Type.STRING, description: "Full report in markdown including tables and CUBE signature" },
                  },
                  required: ["title", "content"],
                }
              }
          });
          
          let jsonStr = response.text || "{}";
          const parsed = JSON.parse(jsonStr);

          // 개행 문자 정규화
          if (parsed.content) {
            parsed.content = parsed.content.replace(/\\n/g, '\n').trim();
          }

          return parsed;
      } catch (e: any) {
          console.error("Update Summary Error", e);
          // Return structured error so the UI stays consistent
          return {
              title: `${dateTag} AI 서비스 연동 오류`,
              content: `분석 도중 시스템 오류가 발생했습니다. (사유: ${e.message || 'API_KEY_INVALID'})\n\n관리자라면 터미널 상단의 'RE-SYNC' 버튼을 통해 연결을 복구하십시오.\n\nSu-Lab 매니저 "CUBE" 였습니다.`
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
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      return response.text || "연구소 내부 기준 미달로 인해 요청이 반려되었습니다.";
    } catch (e) {
      return `요청이 반려되었습니다. 사유: ${rawReason}`;
    }
  }
}

export const geminiService = new GeminiService();
