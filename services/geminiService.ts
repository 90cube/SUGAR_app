
import { DEFAULT_GEMINI_MODEL, WORKER_BASE_URL } from "../constants";
import { UserProfile, RecapStats, ModeStat } from "../types";

export interface ComparativeStats {
  dateStat: ModeStat;
  overallStat: ModeStat;
  details: string; // Formatted detailed logs
}

export class GeminiService {
  /**
   * Cloudflare Worker를 통해 Gemini API를 호출합니다.
   */
  private async callWorker(path: string, payload: any) {
    const url = `${WORKER_BASE_URL}/gemini/${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Worker Gemini Error: ${error}`);
    }

    return await response.json();
  }

  public async generateText(prompt: string): Promise<string> {
    try {
      const path = `v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      const result = await this.callWorker(path, payload);
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
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
      Team A(블루팀)와 Team B(레드팀)의 매치업을 분석하십시오.
      결과물에 숫자 데이터(%, 점수 등)를 직접 나열하지 말고 실전 전략 위주로 단정적인 어체를 사용하십시오.

      [Team A 명단]
      ${teamAData}

      [Team B 명단]
      ${teamBData}
    `;

    try {
      const path = `v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      const result = await this.callWorker(path, payload);
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "분석 실패";
    } catch (error) {
      console.error("Team Analysis Error:", error);
      throw error;
    }
  }

  public async analyzeDailyRecap(data: ComparativeStats, matchType: string, matchMode: string): Promise<string> {
    const { dateStat, overallStat, details } = data;

    // 1990년대 교관 페르소나 - 전장 훈련 + 서든어택 고수 + 레트로
    const systemPersona = `당신은 1990년대 대한민국 특수부대 출신 교관이자 서든어택 전설급 고수 "독수리 교관"입니다.
    
    **성격 및 말투 규칙:**
    - 군대식 단호하고 직설적인 어조를 사용합니다 ("~하시오!", "~하라!", "~해야 한다!")
    - 90년대 PC방 시절을 회상하며 추억을 언급합니다 (예: "옛날 486 시절...", "피시방 신무기 나왔을 때...")
    - 훈련 용어를 섞어 사용합니다 (예: "면회 불가", "PX 출입 금지급 플레이", "정신교육 필요")
    - 칭찬할 때도 군대식입니다 (예: "상병 진급감이다!", "모범 전사로다!", "이등병 티 벗었다!")
    - 비판할 때는 거칠게 (예: "이게 뭐야! 짬밥이 아까운 플레이!", "신병도 이것보단 낫겠다!")
    - 1990년대 유행어를 가끔 사용합니다 (예: "왕짜증", "대박", "쩐다", "이건 레알")
    - 서든어택 용어를 적극 활용합니다 (예: "스나 저격맛", "개머리판 맞을 플레이", "폭탄박스 냄새")
    
    **필수 규칙:**
    - 반드시 "교관"으로서 훈련 일지를 작성하듯 작성합니다
    - 모든 피드백을 훈련 관점에서 접근합니다
    - 마지막에 "- 독수리 교관 -" 서명으로 마무리합니다`;

    const prompt = `
        ${systemPersona}
        
        다음은 훈련병의 오늘 전장 기록과 전체 평균 기록 비교 데이터, 그리고 상세 교전 로그입니다.
        교관으로서 정밀한 훈련 피드백을 제공하시오!

        [훈련 설정]
        - 전장 타입: ${matchType}
        - 교전 모드: ${matchMode}

        [1. 오늘(${dateStat.matchCount}판) 전투 실적]
        - 승률: ${dateStat.winRate}%
        - K/D: ${dateStat.kd}%
        - 킬/데스: ${dateStat.kills}K / ${dateStat.deaths}D

        [2. 평소 실적 (${overallStat.matchCount}판) - 기준선]
        - 승률: ${overallStat.winRate}%
        - K/D: ${overallStat.kd}%
        
        [3. 상세 교전 로그 (최근 순)]
        ${details}

        [작성 규칙]
        1. **맨 위에 [한줄 총평]**: 오늘 훈련을 관통하는 핵심을 25자 이내 임팩트있게! (예: "**90년대 피카츄 수준 반응속도다!**")
        2. **서식 활용**: 중요 수치(K/D, 승률), 핵심 조언, 맵 이름은 **굵게** 처리
        3. **비교 분석**: 오늘이 평소보다 좋았는지 나빴는지 군대식으로 명확히!
        4. **상세 피드백**: 로그 분석하여 특정 맵 강세/약세, 연승/연패 흐름 짚어내기
        5. **훈련 지시**: "다음 훈련 때는 ~하시오!" 형태로 실질적 조언
        6. 마지막에 반드시 "- 독수리 교관 -" 서명
      `;

    try {
      const path = `v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      const result = await this.callWorker(path, payload);
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "데이터 분석 중 오류 발생";
    } catch (e) {
      throw e;
    }
  }

  /**
   * 공식 공지사항을 요약합니다. 
   */
  public async summarizeGameUpdate(source: string, masterPrompt: string, useSearch: boolean = false): Promise<{ title: string; content: string; sources?: { uri: string, title: string }[] }> {
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
      // Worker를 통한 Google Search 기능은 워커 구현에 따라 달라질 수 있으므로, 
      // 여기서는 기본 텍스트 생성을 수행합니다.
      const path = `v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };

      const result = await this.callWorker(path, payload);
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Grounding Metadata 처리 (워커에서 전달받는 경우)
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: { uri: string, title: string }[] = [];

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
    const prompt = `Su-Lab 커뮤니티 운영자로서 정중한 반려 사유를 작성하십시오: "${rawReason}"`;
    try {
      const path = `v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      const result = await this.callWorker(path, payload);
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "내부 기준 미달로 반려되었습니다.";
    } catch (e) {
      return rawReason;
    }
  }
}

export const geminiService = new GeminiService();
