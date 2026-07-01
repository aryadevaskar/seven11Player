import { useState, useEffect } from 'react';
import KonbiniScene from './KonbiniScene';

export interface PalettePreset {
  trackName: string;
  artistName: string;
  albumArtUrl: string;
  shadows: string;       // pal[0] style (Dark background tints)
  trim: string;          // pal[1] style (Roof structure/frames)
  interiorGlow: string;  // pal[2] style (Backlit windows/shelves)
  neonVisualizer: string;// pal[3] style (Door soundwaves)
  accentStripes: string; // pal[4] style (Right soundwaves / neon logos)
}

const SONG_PRESETS: PalettePreset[] = [
  {
    trackName: "Midnight In Shibuya",
    artistName: "Lofi Tokyo Beats",
    albumArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=60",
    shadows: "#120e23",
    trim: "#461937",
    interiorGlow: "rgba(30, 70, 75, 0.4)",
    neonVisualizer: "#ec4899", // Magenta door waves
    accentStripes: "#3b82f6",  // Cyber blue side waves
  },
  {
    trackName: "Rainy Konbini Run",
    artistName: "Sora & The Cloud",
    albumArtUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=60",
    shadows: "#081c24",
    trim: "#0d47a1",
    interiorGlow: "rgba(16, 185, 129, 0.3)",
    neonVisualizer: "#06b6d4", // Cyan door waves
    accentStripes: "#10b981",  // Emerald side waves
  },
  {
    trackName: "Matcha Latte Dreams",
    artistName: "Neon Shinjuku",
    albumArtUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=60",
    shadows: "#1c1408",
    trim: "#7c2d12",
    interiorGlow: "rgba(245, 158, 11, 0.3)",
    neonVisualizer: "#f59e0b", // Amber door waves
    accentStripes: "#ef4444",  // Crimson side waves
  }
];

export default function App() {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [audio, setAudio] = useState({ bass: 0.5, mid: 0.5, treble: 0.5 });

  useEffect(() => {
    const loop = setInterval(() => {
      setAudio({
        bass: Math.random() * 0.5 + 0.5,
        mid: Math.sin(Date.now() / 300) * 0.25 + 0.6,
        treble: Math.random() * 0.6 + 0.3,
      });
    }, 100);
    return () => clearInterval(loop);
  }, []);

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center p-6 text-slate-100 overflow-hidden bg-[#020617]">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <header className="flex justify-between items-center px-2">
          <div className="font-mono text-xs tracking-widest text-slate-400 uppercase">Convenience Neon System</div>
          <div className="text-xs font-mono text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> SYNCHRONIZED
          </div>
        </header>

        <KonbiniScene palette={SONG_PRESETS[currentSongIndex]} audio={audio} />

        <footer className="w-full bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <img src={SONG_PRESETS[currentSongIndex].albumArtUrl} className="w-14 h-14 rounded-lg object-cover" alt="Art" />
            <div>
              <div className="font-bold text-sm">{SONG_PRESETS[currentSongIndex].trackName}</div>
              <div className="font-mono text-xs text-slate-400">{SONG_PRESETS[currentSongIndex].artistName}</div>
            </div>
          </div>
          <button
            onClick={() => setCurrentSongIndex((prev) => (prev + 1) % SONG_PRESETS.length)}
            className="px-5 py-2.5 text-xs bg-white text-slate-950 font-medium rounded-xl active:scale-95 transition"
          >
            Skip Track ✦
          </button>
        </footer>
      </div>
    </div>
  );
}