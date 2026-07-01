import { motion } from 'framer-motion';
import baseStoreImg from './assets/base-store.png';
import { type PalettePreset } from './App';
import { useMemo } from 'react';

interface KonbiniProps {
    palette: PalettePreset;
    audio: {
        bass: number;
        mid: number;
        treble: number;
    };
    valence: number; // 0 = sad/heavy rain, 1 = happy/clear
}

// Pre-generate raindrop data so it doesn't re-randomize on every render
function generateRaindrops(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        duration: 0.25 + Math.random() * 0.35, // faster fall
        opacity: 0.55 + Math.random() * 0.45,  // much more opaque
        height: 18 + Math.random() * 28,        // longer streaks
        width: 1.5 + Math.random() * 1,         // variable width
    }));
}

export default function KonbiniScene({ palette, audio, valence }: KonbiniProps) {
    // valence 0–0.35 = heavy rain, 0.35–0.6 = light drizzle, >0.6 = barely there
    // Clamp so we always have at least a light drizzle visible
    const rainIntensity = Math.max(0.3, 1 - valence * 1.4);
    const dropCount = Math.round(rainIntensity * 120); // up to 120 drops
    const raindrops = useMemo(() => generateRaindrops(130), []);
    const visibleDrops = raindrops.slice(0, dropCount);
    
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

            {/* LAYER 7: RAIN OVERLAY — driven by song valence */}
            {visibleDrops.length > 0 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">

                    {/* Blue atmospheric fog — intensifies in heavy rain */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(160deg, rgba(80,130,200,${rainIntensity * 0.13}) 0%, transparent 60%)`,
                        }}
                    />

                    {visibleDrops.map((drop) => (
                        <motion.div
                            key={drop.id}
                            className="absolute top-0"
                            style={{
                                left: `${drop.left}%`,
                                width: `${drop.width}px`,
                                height: `${drop.height}px`,
                                background: 'linear-gradient(to bottom, transparent, rgba(160,210,255,0.95))',
                                opacity: drop.opacity * rainIntensity,
                                borderRadius: '0 0 2px 2px',
                            }}
                            animate={{ y: [-30, 720] }}
                            transition={{
                                duration: drop.duration,
                                delay: drop.delay,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                        />
                    ))}

                    {/* Wet pavement glow at the bottom */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-[22%] pointer-events-none"
                        style={{
                            background: `linear-gradient(to top, rgba(80,150,230,${rainIntensity * 0.35}), transparent)`,
                        }}
                    />
                </div>
            )}

        </div>
    );
}