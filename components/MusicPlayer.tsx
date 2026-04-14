import React, { useState, useEffect } from 'react';
import { useAudio, RepeatMode } from '../state/AudioContext';

export const MusicPlayer: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const [show, setShow] = useState(false);
  const [animate, setAnimate] = useState(false);
  const audio = useAudio();

  useEffect(() => {
    if (visible) {
      audio.loadTracks();
      setShow(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.handleSeek(ratio);
  };

  const repeatLabel: Record<RepeatMode, string> = {
    none: 'RPT:OFF', one: 'RPT:ONE', all: 'RPT:ALL', checked: 'RPT:SEL',
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!show) return null;

  const { tracks, current, isPlaying, repeatMode, checkedIds, progress, duration, volume, loading } = audio;

  return (
    <div
      className="w-full bg-black border-b-4 border-acid-green overflow-hidden"
      style={{
        maxHeight: animate ? '600px' : '0px',
        opacity: animate ? 1 : 0,
        transition: 'max-height 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease',
      }}
    >
      {/* 윈도우 타이틀 바 */}
      <div className="bg-metal-silver border-b-2 border-black px-3 py-1 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="font-pixel text-black text-[10px]">SUDDENLAB_RADIO.EXE</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 bg-gray-300 border border-gray-500 text-[10px] font-bold flex items-center justify-center hover:bg-red-400">X</button>
      </div>

      <div className="px-3 py-3 md:p-4 max-w-4xl mx-auto">
        {/* NOW PLAYING — 항상 풀폭 */}
        <div className="border border-acid-green bg-black p-2.5 md:p-3 mb-3">
          <div className="text-acid-green font-screen text-[10px] md:text-xs mb-0.5 opacity-60">NOW PLAYING:</div>
          <div className="text-acid-green font-screen text-lg md:text-xl truncate leading-tight">
            {current >= 0 ? tracks[current]?.title : 'NO_TRACK_SELECTED'}
          </div>
          <div className="text-acid-pink font-code text-[11px] md:text-xs truncate">
            {current >= 0 ? (tracks[current]?.artist || 'UNKNOWN') : '---'}
          </div>
        </div>

        {/* 프로그레스 바 — 풀폭 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-acid-green font-screen text-xs md:text-sm w-10 md:w-12 text-right shrink-0">{fmt(progress)}</span>
          <div className="flex-1 h-2.5 md:h-3 bg-gray-900 border border-acid-green cursor-pointer relative" onClick={handleSeek}>
            <div
              className="h-full bg-acid-green transition-none"
              style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
          </div>
          <span className="text-acid-green font-screen text-xs md:text-sm w-10 md:w-12 shrink-0">{fmt(duration)}</span>
        </div>

        {/* 컨트롤 + 볼륨 — 한 줄로 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 md:gap-2">
            <button onClick={audio.handlePrev} className="bg-metal-silver border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black text-black font-screen text-base md:text-lg px-2 md:px-3 py-0.5 md:py-1 active:border-t-black active:border-l-black">
              |◀
            </button>
            <button onClick={audio.handlePlayPause} className="bg-acid-green text-black font-pixel text-[10px] md:text-xs px-4 md:px-5 py-1.5 md:py-2 border-3 md:border-4 border-black shadow-hard hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
              {isPlaying ? '■ STOP' : '▶ PLAY'}
            </button>
            <button onClick={audio.handleNext} className="bg-metal-silver border-t-2 border-l-2 border-white border-b-2 border-r-2 border-black text-black font-screen text-base md:text-lg px-2 md:px-3 py-0.5 md:py-1 active:border-t-black active:border-l-black">
              ▶|
            </button>
            <button onClick={audio.cycleRepeat} className={`font-pixel text-[9px] md:text-[10px] px-2 md:px-3 py-1.5 md:py-2 border-2 transition-colors ${
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
          </div>

          {/* 볼륨 — 오른쪽 정렬 */}
          <div className="flex items-center gap-1">
            <span className="text-acid-green font-screen text-xs md:text-sm">VOL</span>
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={volume}
              onChange={(e) => audio.setVolume(parseFloat(e.target.value))}
              className="w-14 md:w-16 accent-[#ccff00]"
            />
          </div>
        </div>

        {/* 재생목록 — 풀폭 */}
        <div className="border border-acid-green bg-black">
          <div className="bg-acid-green text-black px-2 py-1 font-pixel text-[10px] flex justify-between items-center">
            <span>PLAYLIST [{tracks.length} TRACKS]</span>
            {repeatMode === 'checked' && <span className="text-red-800">SEL_MODE</span>}
          </div>
          <div className="max-h-36 md:max-h-48 overflow-y-auto">
            {loading ? (
              <div className="text-acid-green font-screen text-sm p-3 animate-blink">LOADING...</div>
            ) : tracks.length === 0 ? (
              <div className="text-gray-500 font-screen text-sm p-3">NO_TRACKS_FOUND</div>
            ) : tracks.map((track, i) => (
              <div
                key={track.id}
                className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer border-b border-gray-800 hover:bg-acid-green/10 transition-colors ${
                  i === current ? 'bg-acid-green/20 text-acid-green' : 'text-gray-400'
                }`}
              >
                {repeatMode === 'checked' && (
                  <input
                    type="checkbox"
                    checked={checkedIds.has(track.id)}
                    onChange={() => audio.toggleCheck(track.id)}
                    className="accent-[#ccff00] w-3 h-3 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 truncate" onClick={() => audio.playTrack(i)}>
                  <span className="font-screen text-sm">
                    {i === current && isPlaying ? '▶ ' : ''}{track.title}
                  </span>
                </div>
                <span className="text-[10px] font-code opacity-50 shrink-0">
                  {track.artist || ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
