import React, { useState, useRef, useEffect, useCallback } from 'react';

const API = (import.meta as any).env?.VITE_WORKER_URL || 'https://sugarbackend.dudgh4141.workers.dev';

interface Track {
  id: number;
  title: string;
  artist: string;
  filename: string;
  r2_key: string;
  duration: number;
  uploaded_at: string;
}

type RepeatMode = 'none' | 'one' | 'all' | 'checked';

export const MusicPlayer: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [current, setCurrent] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 트랙 목록 로드
  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/music`);
        const data = await res.json();
        if (data.tracks?.length > 0) {
          setTracks(data.tracks);
          setCheckedIds(new Set(data.tracks.map((t: Track) => t.id)));
        }
      } catch { /* silent */ }
      finally { setLoading(false); }
    })();
  }, [visible]);

  // 오디오 이벤트
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => handleNext();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  });

  const playTrack = useCallback((index: number) => {
    if (index < 0 || index >= tracks.length) return;
    setCurrent(index);
    setIsPlaying(true);
    setTimeout(() => {
      const audio = audioRef.current;
      if (audio) {
        audio.src = `${API}/api/music/${tracks[index].id}/stream`;
        audio.volume = volume;
        audio.play().catch(() => {});
      }
    }, 50);
  }, [tracks, volume]);

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (current === -1 && tracks.length > 0) {
      playTrack(0);
      return;
    }
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  };

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
    const indices = getPlayableIndices();
    if (indices.length === 0) return;
    const curPos = indices.indexOf(current);
    const nextPos = (curPos + 1) % indices.length;
    if (nextPos === 0 && repeatMode === 'none') {
      setIsPlaying(false);
      return;
    }
    playTrack(indices[nextPos]);
  }, [current, repeatMode, getPlayableIndices, playTrack]);

  const handlePrev = () => {
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const indices = getPlayableIndices();
    if (indices.length === 0) return;
    const curPos = indices.indexOf(current);
    const prevPos = curPos <= 0 ? indices.length - 1 : curPos - 1;
    playTrack(indices[prevPos]);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const audio = audioRef.current;
    if (audio && duration) audio.currentTime = ratio * duration;
  };

  const toggleCheck = (id: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const cycleRepeat = () => {
    const modes: RepeatMode[] = ['none', 'all', 'one', 'checked'];
    const idx = modes.indexOf(repeatMode);
    setRepeatMode(modes[(idx + 1) % modes.length]);
  };

  const repeatLabel: Record<RepeatMode, string> = {
    none: 'RPT:OFF',
    one: 'RPT:ONE',
    all: 'RPT:ALL',
    checked: 'RPT:SEL',
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <div className="w-full bg-black border-b-4 border-acid-green animate-in slide-in-from-top duration-300">
      <audio ref={audioRef} preload="auto" crossOrigin="anonymous" />

      {/* 플레이어 헤더 */}
      <div className="bg-metal-silver border-b-2 border-black px-3 py-1 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="font-pixel text-black text-[10px]">SUDDENLAB_RADIO.EXE</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 bg-gray-300 border border-gray-500 text-[10px] font-bold flex items-center justify-center hover:bg-red-400">X</button>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4">

          {/* 좌: 컨트롤 + 현재 트랙 */}
          <div className="flex-1 min-w-0">
            {/* 현재 재생 중 */}
            <div className="border border-acid-green bg-black p-3 mb-3">
              <div className="text-acid-green font-screen text-xs mb-1 opacity-60">NOW PLAYING:</div>
              <div className="text-acid-green font-screen text-xl truncate">
                {current >= 0 ? tracks[current]?.title : 'NO_TRACK_SELECTED'}
              </div>
              <div className="text-acid-pink font-code text-xs truncate">
                {current >= 0 ? (tracks[current]?.artist || 'UNKNOWN') : '---'}
              </div>
            </div>

            {/* 프로그레스 바 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-acid-green font-screen text-sm w-12 text-right">{fmt(progress)}</span>
              <div className="flex-1 h-3 bg-gray-900 border border-acid-green cursor-pointer relative" onClick={handleSeek}>
                <div
                  className="h-full bg-acid-green transition-none"
                  style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              </div>
              <span className="text-acid-green font-screen text-sm w-12">{fmt(duration)}</span>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex items-center justify-center gap-2">
              <button onClick={handlePrev} className="bg-metal-silver border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black text-black font-screen text-lg px-3 py-1 active:border-t-black active:border-l-black">
                |◀
              </button>
              <button onClick={handlePlayPause} className="bg-acid-green text-black font-pixel text-xs px-5 py-2 border-4 border-black shadow-hard hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
                {isPlaying ? '■ STOP' : '▶ PLAY'}
              </button>
              <button onClick={handleNext} className="bg-metal-silver border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black text-black font-screen text-lg px-3 py-1 active:border-t-black active:border-l-black">
                ▶|
              </button>
              <button onClick={cycleRepeat} className={`font-pixel text-[10px] px-3 py-2 border-2 transition-colors ${
                repeatMode === 'none'
                  ? 'border-gray-600 text-gray-500 bg-black'
                  : repeatMode === 'one'
                  ? 'border-acid-pink text-acid-pink bg-black'
                  : repeatMode === 'checked'
                  ? 'border-acid-cyan text-acid-cyan bg-black'
                  : 'border-acid-green text-acid-green bg-black'
              }`}>
                {repeatLabel[repeatMode]}
              </button>

              {/* 볼륨 */}
              <div className="flex items-center gap-1 ml-2">
                <span className="text-acid-green font-screen text-sm">VOL</span>
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="w-16 accent-[#ccff00]"
                />
              </div>
            </div>
          </div>

          {/* 우: 재생목록 */}
          <div className="md:w-64 border border-acid-green bg-black">
            <div className="bg-acid-green text-black px-2 py-1 font-pixel text-[10px] flex justify-between">
              <span>PLAYLIST [{tracks.length} TRACKS]</span>
              {repeatMode === 'checked' && <span className="text-red-800">SEL_MODE</span>}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {loading ? (
                <div className="text-acid-green font-screen text-sm p-3 animate-blink">LOADING...</div>
              ) : tracks.length === 0 ? (
                <div className="text-gray-500 font-screen text-sm p-3">NO_TRACKS_FOUND</div>
              ) : tracks.map((track, i) => (
                <div
                  key={track.id}
                  className={`flex items-center gap-1 px-2 py-1 cursor-pointer border-b border-gray-800 hover:bg-acid-green/10 transition-colors ${
                    i === current ? 'bg-acid-green/20 text-acid-green' : 'text-gray-400'
                  }`}
                >
                  {repeatMode === 'checked' && (
                    <input
                      type="checkbox"
                      checked={checkedIds.has(track.id)}
                      onChange={() => toggleCheck(track.id)}
                      className="accent-[#ccff00] w-3 h-3 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 truncate" onClick={() => playTrack(i)}>
                    <span className="font-screen text-sm">
                      {i === current && isPlaying ? '▶ ' : ''}{track.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-code opacity-50 flex-shrink-0">
                    {track.artist || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
