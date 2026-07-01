import { motion } from 'framer-motion';
import baseStoreImg from './assets/base-store.png';
// Add "type" right before PalettePreset 👇
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
    const frontBars = Array.from({ length: 14 });
    const sideBars = Array.from({ length: 20 });

    return (
        <div className="relative w-full aspect-[1.777] overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950">

            {/* LAYER 1: Clean, un-filtered base art asset */}
            <img
                src={baseStoreImg}
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                style={{ imageRendering: 'pixelated' }}
                alt="7-Eleven Konbini"
            />

            {/* LAYER 2: STRUCTURE COLOR TINT (Like pal[1] / trim logic) */}
            {/* This tints the roof fascia and structural walls while leaving shadows alone */}
            <motion.div
                className="absolute inset-0 pointer-events-none mix-blend-hue opacity-60"
                style={{ backgroundColor: palette.trim }}
                animate={{ opacity: 0.4 + audio.mid * 0.3 }}
            />

            {/* LAYER 3: NIGHT/SKY AMBIENCE TINT (Like pal[0] / shadows logic) */}
            {/* Adds deep environmental grading to the darker corners of the scene */}
            <div
                className="absolute inset-0 pointer-events-none mix-blend-color-burn opacity-40"
                style={{ backgroundColor: palette.shadows }}
            />

            {/* LAYER 4: INTERIOR GLASS BULB GLOW (Like pal[2] / interior logic) */}
            <motion.div
                className="absolute top-[48%] right-[24.5%] w-[25.5%] h-[32%] pointer-events-none mix-blend-screen skew-y-[14deg] blur-[4px]"
                style={{ backgroundColor: palette.interiorGlow }}
                animate={{ opacity: 0.1 + audio.bass * 0.5 }}
            />

            {/* LAYER 5: DANCING SOUNDWAVES (Above Front Sliding Doors) */}
            <div className="absolute top-[37.8%] left-[27.6%] w-[21.2%] h-[5%] flex items-end gap-[2px] pointer-events-none skew-y-[-10.8deg] z-20 px-0.5">
                {frontBars.map((_, i) => {
                    const patternMultiplier = 0.3 + Math.sin(i * (Math.PI / frontBars.length)) * 0.7;
                    return (
                        <motion.div
                            key={`front-bar-${i}`}
                            className="flex-1 rounded-t-[1px]"
                            style={{ backgroundColor: palette.neonVisualizer }}
                            animate={{
                                height: `${Math.min(100, Math.max(12, audio.mid * 100 * patternMultiplier))}%`
                            }}
                            transition={{ type: "spring", stiffness: 350, damping: 22 }}
                        />
                    );
                })}
            </div>

            {/* LAYER 6: DANCING SOUNDWAVES (Right Corner Electronic Screen) */}
            <div className="absolute top-[22.2%] right-[38.8%] w-[25.2%] h-[7.2%] flex items-end gap-[2px] pointer-events-none skew-y-[14deg] z-20 px-1">
                {sideBars.map((_, i) => {
                    const patternMultiplier = 0.2 + Math.cos(i * 0.3) * 0.6 + Math.random() * 0.2;
                    return (
                        <motion.div
                            key={`side-bar-${i}`}
                            className="flex-1 rounded-t-[1px]"
                            style={{ backgroundColor: palette.accentStripes }}
                            animate={{
                                height: `${Math.min(100, Math.max(10, audio.treble * 100 * patternMultiplier))}%`
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        />
                    );
                })}
            </div>

        </div>
    );
}