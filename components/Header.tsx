
import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { useUI } from '../state/UIContext';

export const Header: React.FC = () => {
  const { openVirtualMatchingModal } = useUI();
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="sticky top-0 z-[140] w-full bg-black border-b-4 border-white shadow-hard">
      <div className="container max-w-6xl mx-auto h-16 flex items-center justify-between px-4">

        {/* Logo Section */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center group active:translate-y-1 transition-transform"
        >
          {!logoError ? (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-acid-pink border-2 border-white flex items-center justify-center font-pixel text-white text-2xl font-bold shadow-hard-cyan group-hover:shadow-none transition-shadow">
                S
              </div>
              <span className="font-pixel text-xl text-white tracking-tighter">SULAB_OS</span>
            </div>
          ) : (
            <span className="font-pixel text-red-500">IMG_ERR</span>
          )}
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={openVirtualMatchingModal}
            className="px-4 py-1 bg-acid-green text-black font-screen font-bold border-2 border-black shadow-hard-pink hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all uppercase text-sm"
          >
            V_MATCHING.EXE
          </button>

          <a
            href="https://buymeacoffee.com/dudgh41410"
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center bg-yellow-400 text-black border-2 border-black shadow-hard hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            title="DONATE_COFFEE"
          >
            <span className="font-pixel text-xl">☕</span>
          </a>
        </div>
      </div>
    </header>
  );
};
