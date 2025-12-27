
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "../constants";
import { UserProfile, RecapStats } from "../types";

export class GeminiService {
  /**
   * 가이드라인에 따라 API 호출 직전에 인스턴스를 생성합니다.
   * API_KEY는 반드시 process.env.API_KEY에서 가져옵니다.
   */
  private createClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async generateText(prompt: string): Promise<string> {
    const ai = this.createClient();
    try {
      const response = await ai.models.generateContent({
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
    const ai = this.createClient();
    const teamAData = teamA.map(p => this.masterPlayerData(p)).join('\n');
    const teamBData = teamB.map(p => this.masterPlayerData(p)).join('\n');

    const prompt = `
      당신은 대한민국 No.1 FPS 게임 '서든어택'의 전문 AI 전력 분석관입니다.
      Team A(블루팀)와 Team B(레드팀)의 매치업을 분석하십시오.
      결과물에 숫자 데이터(%, 점수 등)를 직접 나열하지 말고 실전 전략 위주로 단정적인 어체를 사용하십시오.

      [Team A 명단]
      ${teamAData}

      [Team B 명단]
      ${teamBData}
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });
      return response.text || "분석 실패";
    } catch (error) {
      console.error("Team Analysis Error:", error);
      return "분석 엔진 연동 오류";
    }
  }

  public async analyzeDailyRecap(stats: RecapStats): Promise<string> {
      const ai = this.createClient();
      const prompt = `
        서든어택 전문 코치로서 다음 데이터를 분석해 플레이어에게 피드백하세요.
        [오늘의 데이터] 승률: ${stats.winRate}%, K/D: ${stats.kd}% (평소: ${stats.comparison.restWinRate}%)
      `;

      try {
        const response = await ai.models.generateContent({
            model: DEFAULT_GEMINI_MODEL,
            contents: prompt,
        });
        return response.text || "데이터 분석 중";
      } catch (e) {
          return "AI 분석 일시 중단";
      }
  }

  /**
   * 공식 공지사항을 요약하고 검색 접지를 활용합니다.
   */
  public async summarizeGameUpdate(source: string, masterPrompt: string): Promise<{ title: string; content: string; sources?: {uri: string, title: string}[] }> {
      const ai = this.createClient();
      const today = new Date();
      const dateTag = `[${today.getFullYear().toString().slice(2)}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}]`;

      const prompt = `
        ${masterPrompt}
        
        **출력 규칙**:
        1. TITLE: [제목] / CONTENT: [마크다운 본문] 형식을 유지하십시오.
        2. 제목에 "${dateTag}"를 포함하십시오.
        3. 마지막에 "Su-Lab 매니저 "CUBE" 였습니다."를 붙이십시오.

        [데이터 소스]
        ${source}
      `;

      try {
          const response = await ai.models.generateContent({
              model: DEFAULT_GEMINI_MODEL,
              contents: prompt,
              config: {
                tools: [{ googleSearch: {} }],
              }
          });
          
          const text = response.text || "";
          
          // 가이드라인에 따라 groundingChunks에서 URL 추출
          const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          const sources: {uri: string, title: string}[] = [];
          
          if (groundingChunks) {
            groundingChunks.forEach((chunk: any) => {
              if (chunk.web && chunk.web.uri) {
                sources.push({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri });
              }
            });
          }

          let title = `${dateTag} 업데이트 요약`;
          let content = text;

          const titleMatch = text.match(/TITLE:\s*(.*)/i);
          const contentMatch = text.match(/CONTENT:\s*([\s\S]*)/i);

          if (titleMatch && contentMatch) {
            title = titleMatch[1].trim();
            content = contentMatch[1].trim();
          }

          return { title, content, sources: sources.length > 0 ? sources : undefined };
      } catch (e: any) {
          console.error("Summary Error", e);
          return {
              title: `${dateTag} 시스템 연결 대기 중`,
              content: `분석 도중 API 인증 오류가 발생했습니다. (Reason: ${e.message})\n도메인 환경변수에 API_KEY가 정상 등록되었는지 확인하십시오.`
          };
      }
  }

  public async generateFormalRejection(rawReason: string): Promise<string> {
    const ai = this.createClient();
    const prompt = `연구소 운영자로서 정중한 반려 사유를 작성하십시오: "${rawReason}"`;
    try {
      const response = await ai.models.generateContent({
        model: DEFAULT_GEMINI_MODEL,
        contents: prompt,
      });
      return response.text || "내부 기준 미달로 반려되었습니다.";
    } catch (e) {
      return rawReason;
    }
  }
}

export const geminiService = new GeminiService();
