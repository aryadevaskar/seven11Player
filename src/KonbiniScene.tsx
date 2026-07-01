import { motion } from 'framer-motion';
import baseStoreImg from './assets/base-store.png';
import { type PalettePreset } from './App';

interface KonbiniProps {
    palette: PalettePreset;
    audio: {
        bass: number;
        mid: number;
        treble: number;
    };
}

export default function KonbiniScene({ palette, audio }: KonbiniProps) {
    return (
        <div className="relative w-full aspect-[1.777] overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950">

            {/* LAYER 1: The Raw Image Asset */}
            <img
                src={baseStoreImg}
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                style={{ imageRendering: 'pixelated' }}
                alt="7-Eleven Konbini"
            />

            {/* LAYER 2: SHADOWS / BACKGROUND TINT (Python: pal[0]) */}
            <div
                className="absolute inset-0 pointer-events-none mix-blend-color-burn opacity-50"
                style={{ backgroundColor: palette.shadows }}
            />

            {/* LAYER 3: MAIN ROOF & TRIM SHIFT (Python: pal[1]) */}
            {/* Changes track colors and shakes gently with mid-range vocal frequencies */}
            <motion.div
                className="absolute inset-0 pointer-events-none mix-blend-hue"
                style={{ backgroundColor: palette.trim }}
                animate={{ opacity: 0.4 + audio.mid * 0.25 }}
                transition={{ ease: "linear", duration: 0.1 }}
            />

            {/* LAYER 4: THE DOOR EQUALIZER SCREEN FLICKER */}
            {/* Warps the specific screen zone over the sliding doors to flicker with the mids */}
            <motion.div
                className="absolute top-[37.8%] left-[27.6%] w-[21.2%] h-[5%] pointer-events-none mix-blend-color-dodge skew-y! -skew-y-[10.8deg] blur-[1px]"
                style={{ backgroundColor: palette.neonVisualizer }}
                animate={{
                    opacity: 0.1 + audio.mid * 0.6
                }}
                transition={{ ease: "linear", duration: 0.08 }}
            />

            {/* LAYER 5: THE SIDE CORNER SCREEN FLICKER */}
            {/* Warps the right-side wall electronic wave patch to flash with high-hats/treble */}
            <motion.div
                className="absolute top-[22.2%] right-[38.8%] w-[25.2%] h-[7.2%] pointer-events-none mix-blend-screen skew-y! skew-y-[14deg] blur-[1px]"
                style={{ backgroundColor: palette.accentStripes }}
                animate={{
                    opacity: 0.1 + audio.treble * 0.7
                }}
                transition={{ ease: "linear", duration: 0.05 }}
            />

            {/* LAYER 6: INTERIOR ROOM GLOW (Python: pal[2]) */}
            {/* Floods the shelves and counters, glowing brightly on heavy bass hits */}
            <motion.div
                className="absolute top-[48%] right-[24.5%] w-[25.5%] h-[32%] pointer-events-none mix-blend-screen skew-y! skew-y-[14deg] blur-[4px]"
                style={{ backgroundColor: palette.interiorGlow }}
                animate={{
                    opacity: 0.15 + audio.bass * 0.55
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />

        </div>
    );
}