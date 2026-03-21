
import React, { useState } from 'react';
import { useUI } from '../state/UIContext';

export const Header: React.FC = () => {
  const { openCommunity, openUpdatesModal } = useUI();
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="sticky top-0 z-[140] w-full bg-black border-b-4 border-white shadow-hard">
      <div className="container max-w-6xl mx-auto h-14 md:h-16 flex items-center justify-between px-3 md:px-4">

        {/* Logo Section */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center group active:translate-y-1 transition-transform"
        >
          {!logoError ? (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 md:w-10 md:h-10 bg-acid-pink border-2 border-white flex items-center justify-center font-pixel text-white text-xl md:text-2xl font-bold shadow-hard-cyan group-hover:shadow-none transition-shadow">
                S
              </div>
              <span className="font-pixel text-lg md:text-xl text-white tracking-tighter hidden sm:block">서든랩_OS</span>
            </div>
          ) : (
            <span className="font-pixel text-red-500">IMG_ERR</span>
          )}
        </button>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={openCommunity}
            className="px-3 md:px-4 py-1.5 md:py-1 bg-acid-green text-black font-screen font-bold border-2 border-black shadow-hard-pink hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-base md:text-sm"
          >
            COMMUNITY
          </button>

          <a
            href="https://buymeacoffee.com/dudgh41410"
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-yellow-400 text-black border-2 border-black shadow-hard hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            title="DONATE_COFFEE"
          >
            <span className="font-pixel text-lg md:text-xl">☕</span>
          </a>
        </div>
      </div>
    </header>
  );
};
