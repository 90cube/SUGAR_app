
import React, { useState, useEffect, useCallback } from 'react';
import { useUI } from '../state/UIContext';
import { updatesService } from '../services/updatesService';
import { GameUpdate, UpdateSearchResult } from '../types';
import { marked } from 'marked';

type SourceFilter = 'all' | 'dcinside' | 'nexon' | 'shorts';

// ─── 감정 이모지 반응 시스템 ───
const REACTION_CONFIG = [
  { key: 'cheer',   emoji: '🎉', label: '환호성',     color: '#FF6B9D' },
  { key: 'good',    emoji: '👍', label: '좋음',       color: '#00E5A0' },
  { key: 'meh',     emoji: '😐', label: '그냥 그럼',  color: '#88889A' },
  { key: 'so_what', emoji: '🤷', label: '어쩌라고?',  color: '#FFB800' },
  { key: 'dislike', emoji: '👎', label: '싫다',       color: '#FF6633' },
  { key: 'worst',   emoji: '💀', label: '최악이야!',  color: '#FF2244' },
] as const;

const ReactionBar: React.FC<{
  updateId: number;
  reactions: Record<string, number>;
  onReact: (updateId: number, reaction: string) => void;
}> = ({ updateId, reactions, onReact }) => {
  const total = Object.values(reactions).reduce((a, b) => a + b, 0);

  return (
    <div className="px-3 py-1.5 border-t border-gray-800/50">
      {/* 이모지 버튼 */}
      <div className="flex gap-0.5 mb-1">
        {REACTION_CONFIG.map(r => {
          const count = reactions[r.key] || 0;
          return (
            <button
              key={r.key}
              onClick={(e) => { e.stopPropagation(); onReact(updateId, r.key); }}
              className="flex-1 flex flex-col items-center py-0.5 active:scale-95 transition-transform"
              style={{ backgroundColor: count > 0 ? `${r.color}15` : 'transparent' }}
              title={r.label}
            >
              <span className="text-xs leading-none">{r.emoji}</span>
              <span className="font-code text-[8px]" style={{ color: count > 0 ? r.color : '#555' }}>
                {count > 0 ? count : ''}
              </span>
            </button>
          );
        })}
      </div>

      {/* 비율 바 */}
      {total > 0 && (
        <div className="h-[2px] flex overflow-hidden bg-gray-800/50">
          {REACTION_CONFIG.map(r => {
            const count = reactions[r.key] || 0;
            if (count === 0) return null;
            const pct = (count / total) * 100;
            return (
              <div
                key={r.key}
                style={{ width: `${pct}%`, backgroundColor: r.color }}
                className="h-full transition-all duration-300"
                title={`${r.label}: ${count} (${pct.toFixed(0)}%)`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── 감정 뱃지 ───
const SentimentBadge: React.FC<{ sentiment: string }> = ({ sentiment }) => {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    positive: { label: '호평', bg: 'bg-emerald-900/60', text: 'text-emerald-400' },
    negative: { label: '비판', bg: 'bg-red-900/60', text: 'text-red-400' },
    neutral:  { label: '중립', bg: 'bg-gray-800/60', text: 'text-gray-400' },
    mixed:    { label: '혼재', bg: 'bg-amber-900/60', text: 'text-amber-400' },
  };
  const s = map[sentiment] || map.neutral;
  return (
    <span className={`${s.bg} ${s.text} px-2 py-0.5 rounded-sm font-code text-[10px] font-bold`}>
      {s.label}
    </span>
  );
};

// ─── 소스 뱃지 ───
const SourceBadge: React.FC<{ source: string }> = ({ source }) => {
  const styles: Record<string, { bg: string; label: string }> = {
    nexon:     { bg: 'bg-blue-600',    label: 'NEXON' },
    dcinside:  { bg: 'bg-orange-500',  label: 'DC' },
    poll:      { bg: 'bg-purple-600',  label: '🗳️ POLL' },
    editorial: { bg: 'bg-emerald-600', label: 'EDIT' },
  };
  const s = styles[source] || styles.dcinside;
  return (
    <span className={`px-1.5 py-0.5 font-pixel text-[9px] text-white ${s.bg}`}>
      {s.label}
    </span>
  );
};

// ─── 숏츠 데이터 (서든어택 꿀팁) ───
interface ShortVideo {
  id: string; title: string; creator: string;
  types: string[]; maps: string[];
}

const SHORTS_DATA: ShortVideo[] = [
  // 위폭연구소장
  { id: '6eF-3adI5s0', title: 'B2연구소 딱 1분만 집중해서 배워봐!!', creator: '위폭연구소장', types: ['꿀팁'], maps: [] },
  { id: 'A90yX1GuZck', title: '총 안쏘고 토너먼트 우승하는 법', creator: '위폭연구소장', types: ['꿀팁'], maps: [] },
  { id: 'd4Thxenc9Oc', title: '서든 방패들면 뭐하냐고~', creator: '위폭연구소장', types: ['하이라이트'], maps: [] },
  { id: 'nkNGRlCpkVU', title: '머리에서 숏녹 폭 쉽게 던지는 법', creator: '위폭연구소장', types: ['위폭'], maps: ['머리'] },
  { id: '0kEVBxAPdRE', title: '서든 혼자서 6초만에 게임 끝내기', creator: '위폭연구소장', types: ['하이라이트'], maps: [] },
  { id: 'fGcqr_M7Wa8', title: '녹위 혼자서 쉽게 올라가는 방법', creator: '위폭연구소장', types: ['꿀팁'], maps: ['녹위'] },
  { id: 'mM-z0DYE2Mc', title: '랭크전 4800구간 모두가 놀란 세이브', creator: '위폭연구소장', types: ['세이브', '랭크전'], maps: [] },
  { id: 'k9cYXNY4rR8', title: '랭크전 4400구간 올킬세이브', creator: '위폭연구소장', types: ['세이브', '랭크전'], maps: [] },
  { id: 'RjIU2lc6DmE', title: '나만의 감도를 쉽게 찾는 법', creator: '위폭연구소장', types: ['꿀팁'], maps: [] },
  { id: 'g_KhqQyYlSA', title: '패스폭 대기 자리 쉽게 잡는 법', creator: '위폭연구소장', types: ['위폭', '꿀팁'], maps: [] },
  { id: 'B_XufHs8hRE', title: '랭크전 랭킹 1·2등 유지하는 법', creator: '위폭연구소장', types: ['꿀팁', '랭크전'], maps: [] },
  { id: 'fsAddYtSVgc', title: '머리에서 쓰리깡 폭 쉽게 던지는 법', creator: '위폭연구소장', types: ['위폭'], maps: ['머리'] },
  { id: '6LfwsTyR3Ys', title: '컨 사이 폭 쉽게 던지는 법', creator: '위폭연구소장', types: ['위폭'], maps: [] },
  { id: 'NwI6wJm6uf4', title: '삼박 개구리 쉽게 잡는법 (카운터)', creator: '위폭연구소장', types: ['꿀팁'], maps: ['삼박자'] },
  { id: 'lv19AI3RhXE', title: '녹뒤폭 쉽게 던지는법', creator: '위폭연구소장', types: ['위폭'], maps: ['녹위'] },
  { id: 'jJTGPw3KmeU', title: '3미리 쉽게 잡는법', creator: '위폭연구소장', types: ['꿀팁'], maps: ['삼박자'] },
  { id: 'BTUU0o71MjY', title: '삼박 개구리 쉽게 잡는법', creator: '위폭연구소장', types: ['꿀팁'], maps: ['삼박자'] },
  { id: 'pC8tV2MtS2E', title: '머리폭 쉽게 던지는법', creator: '위폭연구소장', types: ['위폭'], maps: ['머리'] },
  { id: 'k6bWXw_-E2Y', title: '레드 옥상 쉽게 가는법 (1탄)', creator: '위폭연구소장', types: ['꿀팁'], maps: ['레드'] },
  { id: 'BcZfY6_riMI', title: '3깡 버닝 쉽게 하는법', creator: '위폭연구소장', types: ['꿀팁'], maps: ['삼박자'] },
  { id: 'lUkyI0ebFWE', title: '랭커구간 정확신속 카이팅', creator: '위폭연구소장', types: ['꿀팁', '랭크전'], maps: [] },
  { id: 'rBtyuhkUk9A', title: '랭킹1등 내 설 내가 지켜', creator: '위폭연구소장', types: ['하이라이트', '랭크전'], maps: [] },
  // 강혜준
  { id: 'lszJvS51PTI', title: '챔스 맴버들 사이에서 세이브', creator: '강혜준', types: ['세이브'], maps: [] },
  { id: 'rAFNm7zwUw0', title: '시티캣 A설대 다이나', creator: '강혜준', types: ['하이라이트'], maps: ['시티캣'] },
  { id: 'kWkxteQ1eJM', title: '4vs1 세이브 10초면 충분해', creator: '강혜준', types: ['세이브'], maps: [] },
  { id: 'XypI4v75rnI', title: '팀원들 모두가 외쳤다. 유하~', creator: '강혜준', types: ['하이라이트', '랭크전'], maps: [] },
  { id: '-4DFC4flSOs', title: '클랜간판전 16킬 캐리', creator: '강혜준', types: ['하이라이트'], maps: [] },
  // 텐시
  { id: 'SNuRr7aIctg', title: '올킬 세이브', creator: '텐시', types: ['세이브'], maps: [] },
  { id: 'JRskqhGqQ3o', title: '5보급 필승전략 위폭', creator: '텐시', types: ['위폭'], maps: ['5보급'] },
  { id: 'AKYkXjDGWvA', title: '이게 텐시다!!', creator: '텐시', types: ['하이라이트'], maps: [] },
  { id: '_WaC1BFhDWk', title: '짧고 강렬한 세이브', creator: '텐시', types: ['세이브'], maps: [] },
  { id: 'BpzPlxhTTMw', title: '프로즌시티 월샷', creator: '텐시', types: ['월샷'], maps: ['프로즌시티'] },
  { id: 'QfyDfMMDNvc', title: '시작하자마자 올킬 가능? 가능.', creator: '텐시', types: ['하이라이트'], maps: [] },
  // 샷오바장인
  { id: 'axL6JsEPk28', title: '시티켓 다이나', creator: '샷오바장인', types: ['위폭'], maps: ['시티캣'] },
  { id: 'fZ9X3ZG3VgA', title: '크포 개방 작업폭', creator: '샷오바장인', types: ['위폭'], maps: ['크로스파이어'] },
  { id: 'bDxTUJUrCVo', title: '이탈리아 머나먼 월샷(막힘)', creator: '샷오바장인', types: ['월샷'], maps: ['이탈리아'] },
  { id: 'NO_vQK_n4M8', title: '마베 스위치 2층 폭 대기', creator: '샷오바장인', types: ['위폭'], maps: ['마베'] },
  { id: 'YsDrNNMaep0', title: '트리오 삼거리 버그폭', creator: '샷오바장인', types: ['위폭'], maps: ['트리오'] },
  { id: 'XAIZy9S2bHY', title: '5보급 B 입구 폭', creator: '샷오바장인', types: ['위폭'], maps: ['5보급'] },
  { id: 'elGOArrjUws', title: '프방 A/B 빠른 백업폭', creator: '샷오바장인', types: ['위폭'], maps: ['프로방스'] },
  { id: 'BPp5FCIDhlQ', title: '데저트 쌍문 레베 / A숏 야자 위폭', creator: '샷오바장인', types: ['위폭'], maps: ['데저트'] },
  { id: 'GAGuh5CX7zU', title: '프방 블베 / A숏아래 위폭', creator: '샷오바장인', types: ['위폭'], maps: ['프로방스'] },
  { id: 'ofMRZDogyVw', title: '데저트 A숏 야자 뒤 위폭', creator: '샷오바장인', types: ['위폭'], maps: ['데저트'] },
  { id: 'bX33_Lxy7yE', title: '펠리스 B부대 앞/뒤 폭', creator: '샷오바장인', types: ['위폭'], maps: ['펠리스'] },
  { id: '0Bh6rsMjDaw', title: '화콜 A설대 위폭 모음', creator: '샷오바장인', types: ['위폭'], maps: ['화콜'] },
  { id: 'NIEajozElMY', title: '화콜 천막 밑 멸망폭', creator: '샷오바장인', types: ['위폭'], maps: ['화콜'] },
  { id: 'FUCxi_1QbZc', title: '화콜 센숏 버그폭', creator: '샷오바장인', types: ['위폭'], maps: ['화콜'] },
  { id: 'g5mOUjQcl1g', title: '프방 B설대에서 위폭 2개', creator: '샷오바장인', types: ['위폭'], maps: ['프로방스'] },
  { id: 'nSip6fjK2vY', title: '화콜 물방 입구 폭 5개', creator: '샷오바장인', types: ['위폭'], maps: ['화콜'] },
  { id: '-6HOY19Tu3E', title: '크포 위치 체크 2(혈흔)', creator: '샷오바장인', types: ['꿀팁'], maps: ['크로스파이어'] },
  { id: 'rNDvcnM163w', title: '데저트 A센스나 박스 위폭', creator: '샷오바장인', types: ['위폭'], maps: ['데저트'] },
  { id: 'P5eE52HfCVg', title: '데저트2 신전 1층 폭', creator: '샷오바장인', types: ['위폭'], maps: ['데저트'] },
  { id: 'wfVaBn1hqWY', title: '펠리스 B롱 섬광 2가지', creator: '샷오바장인', types: ['위폭'], maps: ['펠리스'] },
  { id: 'np-vEonfEtQ', title: '프방 A 광역 섬광', creator: '샷오바장인', types: ['위폭'], maps: ['프로방스'] },
  { id: 'yrs8WU8Fqw4', title: '올드타운 언더 위폭', creator: '샷오바장인', types: ['위폭'], maps: ['올드타운'] },
  { id: 'Ec4PlfFaE6M', title: '프로방스 우유통 위폭', creator: '샷오바장인', types: ['위폭'], maps: ['프로방스'] },
  { id: 'rKY2CZTP-nU', title: '이탈리아 발코니 폭 2개', creator: '샷오바장인', types: ['위폭'], maps: ['이탈리아'] },
  { id: 'PRcgawpZMYw', title: '올타 B진입로 위폭(레베)', creator: '샷오바장인', types: ['위폭'], maps: ['올드타운'] },
  { id: 'ZLCcSKBHXGU', title: '말릴 때 이렇게 해보세요', creator: '샷오바장인', types: ['꿀팁'], maps: [] },
  { id: 'mrMujlDWmh8', title: '런어인의 폭탄 해체 방법', creator: '샷오바장인', types: ['꿀팁'], maps: [] },
  // victor
  { id: 'QALfTdfqu0s', title: '우유통 틈', creator: 'victor', types: ['하이라이트'], maps: ['프로방스'] },
  { id: 'LV7qd_bb2gI', title: '양각 처리', creator: 'victor', types: ['꿀팁'], maps: [] },
  { id: 'su4GPZ7P7Bs', title: '순서가 있어', creator: 'victor', types: ['꿀팁'], maps: [] },
  { id: 'T-jYXbSp4ps', title: '데저트 A백업', creator: 'victor', types: ['꿀팁'], maps: ['데저트'] },
  { id: '1BNat9Alw3g', title: 'A뚫', creator: 'victor', types: ['하이라이트'], maps: [] },
  { id: 'uLKj8VjY1Hk', title: '클랭 올킬', creator: 'victor', types: ['하이라이트'], maps: [] },
  { id: 'SSw7PlKnYtk', title: '통했나', creator: 'victor', types: ['하이라이트'], maps: [] },
  { id: 'dnRdeIuNQiA', title: '아다리 낚시', creator: 'victor', types: ['꿀팁'], maps: [] },
  { id: 'e-k1za-Php8', title: '심리전', creator: 'victor', types: ['꿀팁'], maps: [] },
  { id: 'EZT8moYcDEE', title: 'DRT', creator: 'victor', types: ['하이라이트'], maps: [] },
  { id: 'NGLWCeW58G8', title: '어택중에도 미니맵', creator: 'victor', types: ['꿀팁'], maps: [] },
  { id: 'IIVCPIYzERg', title: '좋은 브리핑', creator: 'victor', types: ['꿀팁'], maps: [] },
  // lafo
  { id: '74nhcfoZwis', title: '10년동안 위폭 연구만 했던 유저', creator: 'lafo', types: ['위폭'], maps: [] },
  { id: 'guAoiNvulvE', title: '월샷만 15년째 쏘는 유저의 플레이', creator: 'lafo', types: ['월샷'], maps: [] },
  { id: '844mRXORHqw', title: '무빙없어도 다 잡는 유저', creator: 'lafo', types: ['하이라이트'], maps: [] },
  { id: 'b-tAFaS0Zpw', title: '절대 안 보이는 엇각 자리에서 킬하기', creator: 'lafo', types: ['꿀팁'], maps: [] },
  { id: 'xtLkmigGr2A', title: '빼꼼하면서 잡는 꿀팁 3가지', creator: 'lafo', types: ['꿀팁'], maps: [] },
  { id: 'XaTPMFxKmCs', title: '100년만에 나온 매드무비', creator: 'lafo', types: ['하이라이트'], maps: [] },
  { id: 'VpunnvQ4Iv0', title: '말 그대로 벽을 보는중인 적 팀', creator: 'lafo', types: ['하이라이트'], maps: [] },
  { id: 'N83Iasw38HY', title: '한 번쯤은 만나본 랭크전 빌런', creator: 'lafo', types: ['랭크전'], maps: [] },
  { id: 'lGYxiPc_mrQ', title: '월샷으로 게임하는 1인칭 시점', creator: 'lafo', types: ['월샷'], maps: [] },
  // 라포
  { id: 'Qq957mNHkVw', title: '1티어 라플 스카 소음기 vs 노소음기', creator: '라포', types: ['무기리뷰'], maps: [] },
  { id: '7NGjY5zDz_g', title: '랭크전에 써먹기 좋은 1티어 샵건', creator: '라포', types: ['무기리뷰', '랭크전'], maps: [] },
  { id: 'MwqRJizfdpU', title: '서든어택의 근본, 스나는 아직도 좋은가?', creator: '라포', types: ['무기리뷰'], maps: [] },
  { id: 'TZdUfz125Qs', title: '손 풀고 첫 라운드에 나온 깔끔한 플레이', creator: '라포', types: ['하이라이트'], maps: [] },
  { id: 'gGR2vwdKFTg', title: '넓은 맵에서 줌만 쏘면 핵공격 되는 1티어 라플', creator: '라포', types: ['무기리뷰'], maps: [] },
  { id: 'IesXH-K8tkA', title: '현 시점 전구간에서 쓰는 1티어 라플', creator: '라포', types: ['무기리뷰'], maps: [] },
  { id: '_g3BRfgbWKQ', title: '사기 신규 12세트 동글이 AWX', creator: '라포', types: ['무기리뷰'], maps: [] },
  { id: '4N1c69HgPYc', title: '제일 비싼 윈체 써봤습니다', creator: '라포', types: ['무기리뷰'], maps: [] },
  { id: '0S_ysfbvcDY', title: '앞만 보면 안되는 이유 ㅋㅋ', creator: '라포', types: ['꿀팁'], maps: [] },
  { id: 'I2dcZWawVBs', title: '뛰어다니면서 B 혼자 막아주는 스나', creator: '라포', types: ['월샷'], maps: [] },
  { id: 'tjFk9E1Oc1o', title: '쓰기 어렵지만 잘쓰면 사기 총', creator: '라포', types: ['무기리뷰'], maps: [] },
  { id: 'Sy2RdDfZMQo', title: '핵처럼 보이는 관통 샷', creator: '라포', types: ['월샷'], maps: [] },
  { id: '2tjSgp4Es1w', title: '한번씩 쓰면 무조건 통하는 기술', creator: '라포', types: ['꿀팁'], maps: [] },
  { id: 'hLZv6wx2TWM', title: '랭크전 고스트폭이 1티어인 이유', creator: '라포', types: ['위폭', '랭크전'], maps: [] },
  { id: 'nRxKbNpDpDE', title: '해체할때만 쓸 수 있는 스네이크 기술', creator: '라포', types: ['꿀팁'], maps: [] },
  { id: 'P8ntFZqlf4Q', title: '생존모드 무조건 챙겨야 할 총 1위', creator: '라포', types: ['무기리뷰'], maps: [] },
  { id: 'a617o8qZ4QE', title: '스프레이 활용하기', creator: '라포', types: ['꿀팁'], maps: [] },
  { id: 'zLcd0YB6VgM', title: '공격수 세이브', creator: '라포', types: ['세이브'], maps: [] },
  { id: 'JUvMk9Anz5k', title: '반샷의 장점', creator: '라포', types: ['꿀팁'], maps: [] },
];

const TYPE_TAGS = ['전체', '위폭', '꿀팁', '세이브', '월샷', '무기리뷰', '하이라이트', '랭크전'] as const;
const MAP_TAGS = ['전체', '프로방스', '데저트', '화콜', '삼박자', '이탈리아', '올드타운', '크로스파이어', '펠리스', '5보급', '시티캣', '머리', '녹위', '레드', '프로즌시티', '트리오', '마베'] as const;

const ShortsGrid: React.FC<{ searchQuery?: string }> = ({ searchQuery = '' }) => {
  const [typeFilter, setTypeFilter] = useState('전체');
  const [mapFilter, setMapFilter] = useState('전체');

  const q = searchQuery.trim().toLowerCase();
  const filtered = SHORTS_DATA.filter(v => {
    const typeOk = typeFilter === '전체' || v.types.includes(typeFilter);
    const mapOk = mapFilter === '전체' || v.maps.includes(mapFilter);
    const queryOk = !q || v.title.toLowerCase().includes(q) || v.creator.toLowerCase().includes(q);
    return typeOk && mapOk && queryOk;
  });

  // 맵 탭에서 실제 영상이 있는 맵만 표시
  const activeMaps = MAP_TAGS.filter(m => m === '전체' || SHORTS_DATA.some(v => v.maps.includes(m)));

  return (
    <div>
      {/* 유형 필터 */}
      <div className="px-2 pt-2 pb-1">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {TYPE_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setTypeFilter(tag)}
              className={`shrink-0 px-2.5 py-1 font-code text-[11px] border transition-colors ${
                typeFilter === tag
                  ? 'bg-acid-pink text-white border-acid-pink'
                  : 'bg-transparent text-gray-500 border-gray-700 active:border-gray-500'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 맵 필터 */}
      <div className="px-2 pb-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {activeMaps.map(tag => (
            <button
              key={tag}
              onClick={() => setMapFilter(tag)}
              className={`shrink-0 px-2.5 py-1 font-code text-[11px] border transition-colors ${
                mapFilter === tag
                  ? 'bg-acid-cyan text-black border-acid-cyan'
                  : 'bg-transparent text-gray-500 border-gray-700 active:border-gray-500'
              }`}
            >
              {tag === '전체' ? '맵 전체' : tag}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 카운트 */}
      <div className="px-3 pb-2">
        <span className="font-code text-gray-600 text-[10px]">
          {filtered.length}건{[typeFilter !== '전체' ? typeFilter : '', mapFilter !== '전체' ? mapFilter : '', q ? `"${searchQuery}"` : ''].filter(Boolean).length > 0 ? ` (필터: ${[typeFilter !== '전체' ? typeFilter : '', mapFilter !== '전체' ? mapFilter : '', q ? `"${searchQuery}"` : ''].filter(Boolean).join(' + ')})` : ''}
        </span>
      </div>

      {/* 그리드 */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <span className="font-pixel text-gray-600 text-xs">NO_MATCH</span>
          <p className="font-code text-gray-700 text-[10px] mt-2">필터 조합에 맞는 영상이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 px-1.5 pb-4">
          {filtered.map(v => (
            <a
              key={v.id}
              href={`https://www.youtube.com/shorts/${v.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-950 border border-gray-800 overflow-hidden active:border-acid-green transition-colors"
            >
              <div className="relative w-full" style={{ paddingBottom: '177%' }}>
                <img
                  src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`}
                  alt={v.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  onLoad={(e) => {
                    // YouTube는 없는 썸네일을 404 대신 120×90 회색 placeholder(200 OK)로 반환하는 경우가 있음
                    const img = e.currentTarget;
                    if (img.naturalWidth === 120 && img.naturalHeight === 90 && img.src.includes('hqdefault')) {
                      img.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
                    }
                  }}
                  onError={(e) => {
                    // 실제 404인 경우 mqdefault.jpg로 fallback
                    const img = e.currentTarget;
                    if (img.src.includes('hqdefault')) {
                      img.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
                    }
                  }}
                />
                {/* 크리에이터 뱃지 */}
                <div className="absolute top-1 right-1 bg-black/70 px-1 py-0.5">
                  <span className="font-code text-acid-green text-[7px]">{v.creator}</span>
                </div>
              </div>
              <div className="px-1.5 py-1">
                <p className="font-code text-white text-[9px] line-clamp-2 leading-tight">{v.title}</p>
                <div className="flex gap-0.5 mt-0.5 flex-wrap">
                  {v.types.map(t => (
                    <span key={t} className="bg-acid-pink/20 text-acid-pink font-code text-[7px] px-0.5">{t}</span>
                  ))}
                  {v.maps.map(m => (
                    <span key={m} className="bg-acid-cyan/20 text-acid-cyan font-code text-[7px] px-0.5">{m}</span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── 피드 카드 ───
const FeedCard: React.FC<{
  update: GameUpdate;
  score?: number;
  onOpen: (u: GameUpdate) => void;
  reactions: Record<string, number>;
  onReact: (updateId: number, reaction: string) => void;
}> = ({ update, score, onOpen, reactions, onReact }) => {
  const dateStr = formatPublishedDate(update.published_at);

  return (
    <button
      onClick={() => onOpen(update)}
      className="w-full text-left bg-black border-b border-gray-800 border-l-4 border-l-acid-green active:border-l-acid-pink active:bg-gray-900 transition-colors"
    >
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <SourceBadge source={update.source} />
        {dateStr && <span className="text-gray-500 font-code text-[11px]">{dateStr}</span>}
        {update.analysis && <SentimentBadge sentiment={update.analysis.sentiment} />}
        {score !== undefined && (
          <span className="ml-auto text-acid-cyan font-code text-[10px]">{(score * 100).toFixed(0)}%</span>
        )}
      </div>
      <div className="px-4 pb-1">
        <h3 className="font-code text-white text-[15px] leading-snug line-clamp-2">{update.title}</h3>
      </div>
      {update.analysis && (
        <div className="px-4 pb-2">
          <p className="text-gray-500 font-code text-[12px] leading-relaxed line-clamp-2">
            {update.analysis.summary}
          </p>
        </div>
      )}
      <ReactionBar updateId={update.id} reactions={reactions} onReact={onReact} />
    </button>
  );
};

// ─── 상세 뷰 ───
const DetailView: React.FC<{
  update: GameUpdate;
  reactions: Record<string, number>;
  onReact: (updateId: number, reaction: string) => void;
}> = ({ update, reactions, onReact }) => {
  const dateStr = formatPublishedDate(update.published_at);

  return (
    <div className="max-w-2xl mx-auto h-full overflow-y-auto">
      {/* 터미널 헤더 */}
      <div className="bg-acid-green text-black px-4 py-1 font-pixel font-bold text-[9px] flex justify-between items-center">
        <span>C:\SUDDENLAB\ARTICLE.TXT</span>
        {update.source && <span>{update.source.toUpperCase()}</span>}
      </div>
      {/* Article Header */}
      <div className="px-4 pt-4 pb-3 border-b-2 border-acid-green/30">
        <div className="flex items-center gap-2 mb-3">
          <SourceBadge source={update.source} />
          {dateStr && <span className="text-gray-500 font-code text-[11px]">게시날짜 {dateStr}</span>}
        </div>
        <h1 className="font-code text-white text-lg font-bold leading-snug">{update.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          {update.url && (
            <a href={update.url} target="_blank" rel="noopener noreferrer" className="text-acid-cyan font-code text-xs active:underline">
              원문 보기 &gt;
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <div
          className="font-code text-gray-300 text-[13px] leading-relaxed [&_p]:mb-3 [&_ul]:ml-4 [&_ul]:mb-3 [&_li]:list-disc [&_h1]:text-white [&_h1]:text-sm [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-white [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-gray-300 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:mb-1 [&_strong]:text-white [&_a]:text-acid-cyan"
          dangerouslySetInnerHTML={{ __html: marked.parse(update.content.slice(0, 8000)) as string }}
        />
      </div>

      {/* Reaction Bar */}
      <ReactionBar updateId={update.id} reactions={reactions} onReact={onReact} />

      <div className="h-20" />
    </div>
  );
};

// ─── 메인 커뮤니티 페이지 ───
export const CommunityPage: React.FC = () => {
  const { isCommunityOpen, closeCommunity } = useUI();

  const [source, setSource] = useState<SourceFilter>('all');
  const [updates, setUpdates] = useState<GameUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UpdateSearchResult[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedUpdate, setSelectedUpdate] = useState<GameUpdate | null>(null);
  const [stats, setStats] = useState<{ totalUpdates: number; totalAnalyzed: number } | null>(null);
  const [allReactions, setAllReactions] = useState<Record<number, Record<string, number>>>({});

  // 상세 뷰 열기 → history push
  const openDetail = useCallback((update: GameUpdate) => {
    setSelectedUpdate(update);
    window.history.pushState({ page: 'community-detail', id: update.id }, '', `#community/${update.id}`);
  }, []);

  // 상세 뷰 닫기 → 리스트로 (history push하지 않음, popstate에서 호출됨)
  const closeDetail = useCallback(() => {
    setSelectedUpdate(null);
  }, []);

  // 브라우저 뒤로가기로 상세 → 리스트 전환
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash === '#community' || hash === '#community/') {
        // 리스트로 돌아가기
        setSelectedUpdate(null);
      } else if (hash.startsWith('#community/')) {
        // 상세로 (앞으로가기)
        // 이미 데이터가 있으면 유지, 없으면 무시
      }
      // #community가 아예 없으면 UIContext의 popstate가 처리
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isCommunityOpen) {
      loadUpdates(1, true);
      loadStats();
    }
  }, [isCommunityOpen, source]);

  const loadUpdates = async (p: number, reset = false) => {
    setLoading(true);
    try {
      const src = source === 'all' ? undefined : source;
      const result = await updatesService.fetchUpdates(p, src);
      if (reset) {
        setUpdates(result.updates);
      } else {
        setUpdates(prev => [...prev, ...result.updates]);
      }
      // 반응 데이터도 함께 로드
      const ids = result.updates.map((u: GameUpdate) => u.id);
      loadReactions(ids);
      setPage(p);
      setHasMore(p < result.pagination.totalPages);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const s = await updatesService.fetchStats();
      setStats(s);
    } catch {}
  };

  // 반응 데이터 로드
  const loadReactions = useCallback(async (ids: number[]) => {
    if (ids.length === 0) return;
    try {
      const data = await updatesService.fetchBatchReactions(ids);
      setAllReactions(prev => ({ ...prev, ...data }));
    } catch {}
  }, []);

  // 반응 클릭 핸들러
  const handleReact = useCallback(async (updateId: number, reaction: string) => {
    try {
      const result = await updatesService.react(updateId, reaction);
      setAllReactions(prev => ({ ...prev, [updateId]: result.reactions }));
    } catch {}
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (source === 'shorts') return; // 숏츠는 searchQuery prop으로 실시간 필터링
    if (!searchQuery.trim()) {
      setIsSearchMode(false);
      return;
    }
    setIsSearching(true);
    setIsSearchMode(true);
    try {
      const src = source === 'all' ? undefined : source;
      const result = await updatesService.searchUpdates(searchQuery, src, 15);
      setSearchResults(result.results);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    setSearchResults([]);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) loadUpdates(page + 1);
  };

  if (!isCommunityOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* ─── Top Bar ─── */}
      <div className="shrink-0 bg-black">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between px-3 py-2">
            {/* 로고 — 클릭 시 전적검색으로 이동 */}
            <button
              onClick={closeCommunity}
              className="flex items-center gap-2 active:opacity-70 transition-opacity"
            >
              <div className="w-7 h-7 bg-acid-pink border-2 border-white flex items-center justify-center font-pixel text-white text-sm font-bold shadow-hard">
                S
              </div>
              <span className="font-pixel text-acid-green text-xs tracking-wider">COMMUNITY.DAT</span>
            </button>

            <div className="flex items-center gap-3">
              {stats && (
                <span className="font-pixel text-gray-600 text-[9px]">
                  {stats.totalUpdates}_POSTS
                </span>
              )}
              <button
                onClick={closeCommunity}
                className="font-pixel text-[10px] text-acid-cyan active:text-white transition-colors tracking-wider cursor-pointer border border-acid-cyan px-2 py-0.5"
              >
                &lt; BACK
              </button>
            </div>
          </div>

          {/* Search Bar - 리스트 모드일 때만 */}
          {!selectedUpdate && (
            <>
              <div className="px-3 pb-2.5">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={source === 'shorts' ? '제목/크리에이터 검색...' : '검색 (예: 밸런스 패치, 신규 무기...)'}
                      className="w-full h-9 bg-black border-2 border-gray-700 text-acid-green font-code text-sm px-3 pr-8 focus:outline-none focus:border-acid-green placeholder:text-gray-600 placeholder:text-xs"
                    />
                    {isSearchMode && (
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 active:text-white text-lg font-code"
                      >
                        x
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="h-9 px-4 bg-acid-green text-black font-pixel text-[10px] font-bold border-2 border-black shadow-hard active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
                  >
                    {isSearching ? '...' : 'GO'}
                  </button>
                </form>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-t-2 border-acid-green/40">
                {([
                  { key: 'all', label: 'ALL' },
                  { key: 'nexon', label: 'NEXON' },
                  { key: 'dcinside', label: 'HOT ISSUE' },
                  { key: 'shorts', label: 'SHORTS' },
                ] as { key: SourceFilter; label: string }[]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setSource(tab.key); clearSearch(); }}
                    className={`flex-1 py-2 font-pixel text-[10px] text-center border-b-2 transition-colors ${
                      source === tab.key
                        ? 'border-acid-green text-acid-green'
                        : 'border-transparent text-gray-500 active:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 상세 모드일 때 뒤로가기 바 */}
          {selectedUpdate && (
            <div className="border-t-2 border-acid-green/40">
              <button
                onClick={() => window.history.back()}
                className="w-full px-3 py-2 flex items-center gap-2 active:bg-gray-900"
              >
                <span className="text-acid-green font-pixel text-[10px]">&lt; LIST</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
        {selectedUpdate ? (
          <DetailView update={selectedUpdate} reactions={allReactions[selectedUpdate.id] || {}} onReact={handleReact} />
        ) : (
          <div className="max-w-2xl mx-auto w-full pb-safe">
            {/* 터미널 섹션 헤더 */}
            {!isSearchMode && (
              <div className="bg-acid-green text-black px-4 py-1 font-pixel font-bold text-[9px] flex justify-between items-center">
                <span>C:\SUDDENLAB\{source === 'shorts' ? 'SHORTS' : source === 'nexon' ? 'NEXON' : source === 'dcinside' ? 'HOT_ISSUE' : 'ALL'}.LOG</span>
                {stats && source !== 'shorts' && <span>{stats.totalAnalyzed}_ANALYZED</span>}
              </div>
            )}

            {isSearchMode && (
              <div className="px-3 py-1.5 bg-acid-green/10 border-b-2 border-acid-green">
                <span className="font-pixel text-acid-green text-[9px]">
                  SEARCH: {searchResults.length}건 &quot;{searchQuery}&quot;
                </span>
              </div>
            )}

            {loading && updates.length === 0 && (
              <div className="space-y-px">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-black border-b border-gray-800 border-l-4 border-l-gray-700 px-4 py-4 animate-pulse">
                    <div className="flex gap-2 mb-3">
                      <div className="w-12 h-4 bg-gray-800" />
                      <div className="w-16 h-4 bg-gray-800" />
                    </div>
                    <div className="w-3/4 h-4 bg-gray-800 mb-2" />
                    <div className="w-full h-3 bg-gray-900" />
                  </div>
                ))}
              </div>
            )}

            {!isSearchMode && !loading && updates.length === 0 && source !== 'shorts' && (
              <div className="flex flex-col items-center justify-center py-20 px-6">
                <span className="font-pixel text-gray-600 text-sm mb-2">NO_DATA</span>
                <p className="font-code text-gray-700 text-xs text-center">
                  N8N 크롤링 워크플로우가 데이터를 수집하면 여기에 표시됩니다
                </p>
              </div>
            )}

            {source === 'shorts' ? (
              <ShortsGrid searchQuery={searchQuery} />
            ) : (
              <div className="divide-y divide-gray-800/50">
                {isSearchMode
                  ? searchResults.map(r => (
                      <FeedCard key={r.update.id} update={r.update} score={r.score} onOpen={openDetail} reactions={allReactions[r.update.id] || {}} onReact={handleReact} />
                    ))
                  : updates.map(u => (
                      <FeedCard key={u.id} update={u} onOpen={openDetail} reactions={allReactions[u.id] || {}} onReact={handleReact} />
                    ))
                }
              </div>
            )}

            {!isSearchMode && hasMore && updates.length > 0 && (
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="w-full py-3 text-center font-pixel text-gray-600 text-[9px] active:text-acid-green active:bg-gray-900 disabled:opacity-50 border-t border-gray-800"
              >
                {loading ? 'LOADING...' : 'LOAD_MORE.EXE'}
              </button>
            )}

            <div className="h-8" />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 유틸리티 ───
function formatPublishedDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    // "14:30" 같은 시간만 있는 경우 → 오늘 날짜 붙임
    if (/^\d{1,2}:\d{2}$/.test(dateStr.trim())) {
      const today = new Date();
      return `${today.getMonth() + 1}/${today.getDate()} ${dateStr}`;
    }
    // "2026.03.19" 또는 ISO 포맷
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
