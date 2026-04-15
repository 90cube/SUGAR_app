import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const API = (import.meta as any).env?.VITE_WORKER_URL || 'https://sugarbackend.dudgh4141.workers.dev';

export interface Track {
  id: number;
  title: string;
  artist: string;
  filename: string;
  r2_key: string;
  duration: number;
  uploaded_at: string;
}

export type RepeatMode = 'none' | 'one' | 'all' | 'checked';

function fisherYates(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface AudioState {
  tracks: Track[];
  current: number;
  isPlaying: boolean;
  repeatMode: RepeatMode;
  checkedIds: Set<number>;
  shuffle: boolean;
  progress: number;
  duration: number;
  volume: number;
  loading: boolean;
  loaded: boolean;
  playTrack: (index: number) => void;
  handlePlayPause: () => void;
  handleNext: () => void;
  handlePrev: () => void;
  handleSeek: (ratio: number) => void;
  setVolume: (v: number) => void;
  cycleRepeat: () => void;
  toggleCheck: (id: number) => void;
  toggleShuffle: () => void;
  loadTracks: () => void;
}

const AudioContext = createContext<AudioState | null>(null);

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be inside AudioProvider');
  return ctx;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [shuffle, setShuffle] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shuffleQueueRef = useRef<number[]>([]);
  const shufflePosRef = useRef<number>(-1);

  // 오디오 엘리먼트 한 번만 생성 (절대 언마운트 안 됨)
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = 0.7;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  // 오디오 이벤트 바인딩
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => nextRef.current();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // 트랙 목록 로드
  const loadTracks = useCallback(async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/music`);
      const data = await res.json();
      if (data.tracks?.length > 0) {
        setTracks(data.tracks);
        setCheckedIds(new Set(data.tracks.map((t: Track) => t.id)));
        setLoaded(true);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [loaded, loading]);

  const playTrack = useCallback((index: number) => {
    if (index < 0 || index >= tracks.length) return;
    setCurrent(index);
    const audio = audioRef.current;
    if (audio) {
      audio.src = `${API}/api/music/${tracks[index].id}/stream`;
      audio.volume = volume;
      audio.play().catch(() => {});
    }
  }, [tracks, volume]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (current === -1 && tracks.length > 0) {
      playTrack(0);
      return;
    }
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  }, [current, tracks, isPlaying, playTrack]);

  const getPlayableIndices = useCallback(() => {
    if (repeatMode === 'checked') {
      return tracks.map((t, i) => checkedIds.has(t.id) ? i : -1).filter(i => i >= 0);
    }
    return tracks.map((_, i) => i);
  }, [tracks, checkedIds, repeatMode]);

  const handleNext = useCallback(() => {
    if (repeatMode === 'one') {
      const audio = audioRef.current;
      if (audio) { audio.currentTime = 0; audio.play().catch(() => {}); }
      return;
    }
    if (shuffle) {
      const queue = shuffleQueueRef.current;
      if (queue.length === 0) return;
      let nextPos = shufflePosRef.current + 1;
      if (nextPos >= queue.length) {
        // 한 바퀴 완료 → 다시 셔플
        const newQueue = fisherYates(getPlayableIndices());
        shuffleQueueRef.current = newQueue;
        nextPos = 0;
      }
      shufflePosRef.current = nextPos;
      playTrack(shuffleQueueRef.current[nextPos]);
      return;
    }
    const indices = getPlayableIndices();
    if (indices.length === 0) return;
    const curPos = indices.indexOf(current);
    const nextPos = (curPos + 1) % indices.length;
    if (nextPos === 0 && repeatMode === 'none') {
      setIsPlaying(false);
      return;
    }
    playTrack(indices[nextPos]);
  }, [current, repeatMode, shuffle, getPlayableIndices, playTrack]);

  // ref로 최신 handleNext를 참조 (ended 이벤트에서 사용)
  const nextRef = useRef(handleNext);
  useEffect(() => { nextRef.current = handleNext; }, [handleNext]);

  const handlePrev = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    if (shuffle) {
      const prevPos = Math.max(0, shufflePosRef.current - 1);
      shufflePosRef.current = prevPos;
      playTrack(shuffleQueueRef.current[prevPos]);
      return;
    }
    const indices = getPlayableIndices();
    if (indices.length === 0) return;
    const curPos = indices.indexOf(current);
    const prevPos = curPos <= 0 ? indices.length - 1 : curPos - 1;
    playTrack(indices[prevPos]);
  }, [current, shuffle, getPlayableIndices, playTrack]);

  const handleSeek = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (audio && duration) audio.currentTime = ratio * duration;
  }, [duration]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const cycleRepeat = useCallback(() => {
    const modes: RepeatMode[] = ['none', 'all', 'one', 'checked'];
    setRepeatMode(prev => {
      const idx = modes.indexOf(prev);
      return modes[(idx + 1) % modes.length];
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => {
      const next = !prev;
      if (next) {
        const indices = getPlayableIndices();
        const queue = fisherYates(indices);
        shuffleQueueRef.current = queue;
        // 현재 곡을 큐의 시작에 배치하거나 0번으로 설정
        const pos = queue.indexOf(current);
        shufflePosRef.current = pos >= 0 ? pos : 0;
      }
      return next;
    });
  }, [current, getPlayableIndices]);

  const toggleCheck = useCallback((id: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return (
    <AudioContext.Provider value={{
      tracks, current, isPlaying, repeatMode, checkedIds, shuffle,
      progress, duration, volume, loading, loaded,
      playTrack, handlePlayPause, handleNext, handlePrev,
      handleSeek, setVolume, cycleRepeat, toggleCheck, toggleShuffle, loadTracks,
    }}>
      {children}
    </AudioContext.Provider>
  );
};
