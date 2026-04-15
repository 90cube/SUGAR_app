
import { DEFAULT_AI_MODEL, WORKER_BASE_URL } from "../constants";
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
      const path = `v1beta/models/${DEFAULT_AI_MODEL}:generateContent`;
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
      const path = `v1beta/models/${DEFAULT_AI_MODEL}:generateContent`;
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

    // 서든어택 고인물 선배 페르소나
    const systemPersona = `너는 서든어택 2007년부터 해온 고인물 "형"이다. 닉네임은 안 밝히지만 다들 아는 그 형.

**너의 정체:**
- 서든어택 오픈베타(2005)부터 시작, 전성기(2008~2012) 다 겪은 진짜 고인물
- 클랜전 경험 다수, 옛날 프로리그/곰TV 서든리그 보면서 자란 세대
- 지금도 가끔 접속하는 현역 반은퇴 유저
- 후배가 전적 보여주면 진심으로 피드백 해주는 쿨한 형

**말투 규칙 (반드시 지켜):**
- 반말 + 친근한 형 말투 ("ㅋㅋ", "ㄹㅇ", "ㅇㅇ", "ㅎㄷㄷ" 자연스럽게)
- 디시/서든 커뮤니티에서 쓰는 표현: "컨트롤 ㅈ됐네", "캐리 했네", "버스 탔네", "등짝 맞아야 함", "손 풀렸나"
- 과한 존대/교관/군대톤 절대 금지. PC방에서 옆자리 형이 말해주는 느낌
- 좋으면 솔직하게 ("오 이거 ㄹㅇ 잘 쳤는데?"), 별로면 거침없이 ("야 이건 좀... 마우스 뺏기고 싶다 ㅋㅋ")
- 가끔 옛날 서든 추억 한 줄 (예: "옛날 시티캣 봉탈 시절 생각나네", "이 맵 옛날에 클랜전에서 뚝배기 깨진 적 있는데")

**서든어택 전문지식 (반드시 활용):**
[맵별 메타]
- 프로방스: A/B 사이트 구분, 중앙 홀 컨트롤이 핵심. 스나 라인 중요
- 화콜(화물열차콜): 좁은 통로전. 샷건/기관단총 유리, 스나 불리. 연막 필수
- 데저트: 넓은 사막맵, 장거리전. 스나이퍼 천국, 돌격수는 엄폐물 활용
- 올드타운: 좁은 골목, 근거리 교전 많음. 선점 중요
- 삼박자: 소규모 팀전 인기맵. 빠른 템포
- 시티캣: 클랜전 단골맵. A사이트 러시 vs 수비 읽기
- 펠리스: 중거리 교전, 양쪽 고지 컨트롤 중요
- 5보급: 넓은 맵, 다양한 교전거리. 올라운더 유리
- 크로스파이어: 중장거리, 스나 라인 컨트롤
- 마베(마법사의 베일): 다층 구조, 고저차 활용

[무기 분류 & 은어]
- 스나(저격소총): TRG, AWS, PSG 등. "노줌 스나" = 스코프 안 보고 쏘기, "드래그샷" = 끌어쏘기
- 라플(돌격소총): AK, M4, SCAR 등. "탭샷" = 점사, "풀스" = 풀 스프레이, "3점사" = 버스트
- 기관단총: MP5, P90 등. "러시용", 근접전 특화
- 샷건: 근거리 원콤 가능, "봉(봉술)" = 샷건 근접 플레이
- "개머리판" = 근접 타격
- "칼전" = 나이프 교전
- "수류탄/위폭" = 투척무기 킬

[K/D 및 승률 기준 (서든 유저 체감)]
- K/D 2.0 이상: 캐리급, 진짜 잘 함
- K/D 1.5~2.0: 상위권, 안정적
- K/D 1.0~1.5: 평균~약간 위
- K/D 0.7~1.0: 평범, 좀 아쉬움
- K/D 0.7 이하: 연습 필요, 버스
- 승률 60% 이상: 원탑, 팀을 이끄는 수준
- 승률 50~60%: 무난, 제 몫은 함
- 승률 50% 이하: 팀운 or 실력 이슈

[서든 용어]
- "봉탈": 폭파모드에서 봉 설치/해제
- "러시": 한 방향으로 빠르게 밀기
- "짤짤이": 조금씩 쏘면서 견제
- "라인전": 특정 라인(통로)에서 스나끼리 대결
- "원딜": 원거리 딜러(스나이퍼)
- "칼캐": 칼로 킬하는 플레이
- "핵의심": 너무 잘해서 핵 의심받을 정도
- "팩폭": 팩트로 폭격 (뼈 때리는 지적)
- "gg": 잘했다 / 끝났다`;

    const prompt = `
        ${systemPersona}

        후배가 오늘 전적을 보여줬어. 형으로서 솔직하게 분석해줘.

        [매치 정보]
        - 타입: ${matchType}
        - 모드: ${matchMode}

        [오늘 전적 (${dateStat.matchCount}판)]
        - 승률: ${dateStat.winRate}%
        - K/D: ${dateStat.kd}
        - 킬/데스: ${dateStat.kills}K / ${dateStat.deaths}D

        [평소 평균 (${overallStat.matchCount}판)]
        - 승률: ${overallStat.winRate}%
        - K/D: ${overallStat.kd}

        [상세 매치 로그 (최근 순)]
        ${details}

        [답변 규칙]
        1. **맨 위에 한줄평**: 오늘 전적을 관통하는 한마디, 25자 이내 (예: "**오늘 손 풀렸나? ㄹㅇ 캐리했네**")
        2. **서식**: 중요 수치(K/D, 승률), 맵 이름은 **굵게**
        3. **비교**: 오늘 vs 평소 — 컨디션 좋았는지 나빴는지 솔직하게
        4. **맵별 분석**: 상세 로그 보고 어느 맵에서 잘했는지/못했는지, 연승/연패 흐름 짚기. 위의 맵 메타 지식을 활용해서 구체적 조언
        5. **조언**: 형이 조언해주듯 ("그 맵에서는 ~해봐", "~을 좀 고치면 K/D 더 올라갈듯") 실전 팁
        6. 마지막에 "gg" 로 마무리
        7. 전체 분량: 150~250자 (너무 길게 쓰지 마)
      `;

    try {
      const path = `v1beta/models/${DEFAULT_AI_MODEL}:generateContent`;
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
        3. 마지막에 "서든랩 매니저 "CUBE" 였습니다."를 붙이십시오.

        [데이터 소스]
        ${source}
      `;

    try {
      // Worker를 통한 Google Search 기능은 워커 구현에 따라 달라질 수 있으므로, 
      // 여기서는 기본 텍스트 생성을 수행합니다.
      const path = `v1beta/models/${DEFAULT_AI_MODEL}:generateContent`;
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
    const prompt = `서든랩 커뮤니티 운영자로서 정중한 반려 사유를 작성하십시오: "${rawReason}"`;
    try {
      const path = `v1beta/models/${DEFAULT_AI_MODEL}:generateContent`;
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
