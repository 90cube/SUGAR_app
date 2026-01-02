
import { GoogleGenAI, Type } from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "../constants";
import { UserProfile, RecapStats, ModeStat } from "../types";

export interface ComparativeStats {
    dateStat: ModeStat;
    overallStat: ModeStat;
    details: string; // Formatted detailed logs
}

export class GeminiService {
  /**
   * 가이드라인에 따라 API 호출 직전에 인스턴스를 생성합니다.
   * process가 정의되지 않은 환경(순수 브라우저 등)에서의 크래시를 방지합니다.
   */
  private createClient() {
    // 안전하게 process.env 접근
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
    return new GoogleGenAI({ apiKey: apiKey });
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
      throw error;
    }
  }

  public async analyzeDailyRecap(data: ComparativeStats, matchType: string, matchMode: string): Promise<string> {
      const ai = this.createClient();
      
      const { dateStat, overallStat, details } = data;
      let systemPersona = "";
      
      // Basic Persona Setup
      const isBombMission = matchType.includes("폭파미션");
      const isRanked = matchMode.includes("랭크");

      if (isRanked && isBombMission) {
          systemPersona = "당신은 서든어택 랭크전(폭파미션) 전문 수석 코치입니다.";
      } else if (isRanked) {
          systemPersona = "당신은 서든어택 랭크전 전담 분석관입니다.";
      } else {
          systemPersona = "당신은 서든어택 전술 교관입니다.";
      }

      const prompt = `
        ${systemPersona}
        다음은 플레이어의 선택한 날짜 기록과 전체 평균 기록을 비교한 데이터, 그리고 상세 경기 로그입니다.
        이를 종합하여 정밀한 피드백을 제공하십시오.

        [설정]
        - 타입: ${matchType}
        - 모드: ${matchMode}

        [1. 선택 날짜(${dateStat.matchCount}판) 성과]
        - 승률: ${dateStat.winRate}%
        - K/D: ${dateStat.kd}%
        - 킬/데스: ${dateStat.kills}K / ${dateStat.deaths}D

        [2. 전체 평균(${overallStat.matchCount}판) 성과 - Baseline]
        - 승률: ${overallStat.winRate}%
        - K/D: ${overallStat.kd}%
        
        [3. 상세 매치 로그 (최근 순)]
        ${details}

        [작성 규칙]
        1. **가장 먼저 맨 위에 [한줄평] 섹션을 작성하십시오.** 오늘 플레이를 관통하는 핵심을 20자 이내로 임팩트 있게 요약하십시오. (예: "**압도적인 피지컬로 전장을 지배했습니다.**")
        2. **서식 활용**: 중요한 수치(K/D, 승률), 핵심 조언, 맵 이름 등은 반드시 **굵게(Bold)** 처리하여 가독성을 높이십시오.
        3. **비교 분석**: 오늘 성과가 평소(Baseline)보다 좋았는지 나빴는지 명확히 명시하십시오.
        4. **상세 피드백**: 로그를 분석하여 특정 맵에서의 강세/약세, 연승/연패 흐름을 짚어내십시오.
        5. **전술 제언**: 단순 격려가 아닌, 실질적인 운영(세이브, 오더, 에임 집중 등) 조언을 하십시오.
        6. 어조: 전문가다운 단정적인 어조 ("~합니다.", "~하십시오.")
      `;

      try {
        const response = await ai.models.generateContent({
            model: DEFAULT_GEMINI_MODEL,
            contents: prompt,
        });
        return response.text || "데이터 분석 중 오류 발생";
      } catch (e) {
          throw e;
      }
  }

  /**
   * 공식 공지사항을 요약합니다. 
   */
  public async summarizeGameUpdate(source: string, masterPrompt: string, useSearch: boolean = false): Promise<{ title: string; content: string; sources?: {uri: string, title: string}[] }> {
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
          const config = useSearch ? { tools: [{ googleSearch: {} }] } : undefined;

          const response = await ai.models.generateContent({
              model: DEFAULT_GEMINI_MODEL,
              contents: prompt,
              config: config
          });
          
          const text = response.text || "";
          
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
          throw e;
      }
  }

  public async generateFormalRejection(rawReason: string): Promise<string> {
    const ai = this.createClient();
    const prompt = `Su-Lab 커뮤니티 운영자로서 정중한 반려 사유를 작성하십시오: "${rawReason}"`;
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
