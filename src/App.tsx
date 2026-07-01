import { useState, useEffect, useRef } from 'react';
import KonbiniScene from './KonbiniScene';
import { redirectToAuthCodeFlow, getAccessToken, spotifyApi } from './spotify';
import { getPaletteSync } from 'colorthief';

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

const DEFAULT_PALETTE: PalettePreset = {
  trackName: "Waiting for Spotify...",
  artistName: "Play a track on your device",
  albumArtUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=60",
  shadows: "#120e23",
  trim: "#461937",
  interiorGlow: "rgba(30, 70, 75, 0.4)",
  neonVisualizer: "#ec4899",
  accentStripes: "#3b82f6",
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [palette, setPalette] = useState<PalettePreset>(DEFAULT_PALETTE);
  
  const [audioFeatures, setAudioFeatures] = useState({ energy: 0.5, tempo: 120 });
  const [audio, setAudio] = useState({ bass: 0.5, mid: 0.5, treble: 0.5 });
  const audioFeaturesRef = useRef(audioFeatures);

  // Keep a ref of audio features for the fast setInterval loop
  useEffect(() => {
    audioFeaturesRef.current = audioFeatures;
  }, [audioFeatures]);

  // Auth Effect for PKCE flow
  useEffect(() => {
    const savedToken = localStorage.getItem('spotify_access_token');
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      // We have a code from redirect, let's exchange it for a token
      window.history.replaceState({}, document.title, window.location.pathname); // clear code from url
      getAccessToken(code).then((newToken) => {
        if (newToken) {
          setToken(newToken);
          spotifyApi.setAccessToken(newToken);
        }
      });
    } else if (savedToken) {
      // Use existing saved token
      setToken(savedToken);
      spotifyApi.setAccessToken(savedToken);
    }
  }, []);

  // Polling Effect
  useEffect(() => {
    if (!token) return;

    const fetchTrack = async () => {
      try {
        const currentPlaying = await spotifyApi.getMyCurrentPlayingTrack();
        
        if (currentPlaying && currentPlaying.item) {
          // Check if it's a valid track
          if (currentPlaying.item.type === "track") {
            const track = currentPlaying.item as SpotifyApi.TrackObjectFull;
            
            if (track.id !== currentTrackId) {
              setCurrentTrackId(track.id);
              
              // Get album art
              const albumArtUrl = track.album.images[0]?.url || DEFAULT_PALETTE.albumArtUrl;
              
              // Partially update the palette with new text and art right away
              setPalette(prev => ({
                ...prev,
                trackName: track.name,
                artistName: track.artists.map(a => a.name).join(", "),
                albumArtUrl,
              }));

              // Extract colours
              extractColors(albumArtUrl);

              // Fetch Audio Features
              const features = await spotifyApi.getAudioFeaturesForTrack(track.id);
              if (features) {
                setAudioFeatures({
                  energy: features.energy,
                  tempo: features.tempo,
                });
              }
            } else {
               // Even if ID is same, make sure it updates the name just in case
               setPalette(prev => ({
                 ...prev,
                 trackName: track.name,
                 artistName: track.artists.map(a => a.name).join(", "),
               }));
            }
          }
        }
      } catch (err: any) {
        console.error("Error fetching Spotify data", err);
        // Basic token expiration fallback: if 401, clear token to trigger re-login
        if (err.status === 401) {
            localStorage.removeItem('spotify_access_token');
            setToken(null);
        }
      }
    };

    fetchTrack();
    const interval = setInterval(fetchTrack, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, [token, currentTrackId]);

  const extractColors = (url: string) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const rawPalette = getPaletteSync(img, { colorCount: 5 });
        if (rawPalette && rawPalette.length > 0) {
          const c0 = rawPalette[0].hex();
          const c1 = rawPalette[1]?.hex() || c0;
          const c2 = rawPalette[2]?.hex() || c1;
          const c3 = rawPalette[3]?.hex() || c2;
          const c4 = rawPalette[4]?.hex() || c3;

          setPalette(prev => ({
            ...prev,
            shadows: c0,
            trim: c1,
            interiorGlow: `${c2}80`,
            neonVisualizer: c3,
            accentStripes: c4,
          }));
        }
      } catch (e) {
        console.error("ColorThief failed", e);
      }
    };
    img.src = url + (url.includes('?') ? '&' : '?') + "not-from-cache";
  };

  // Audio Simulation Effect (driven by Spotify Audio Features)
  useEffect(() => {
    const loop = setInterval(() => {
      const { energy, tempo } = audioFeaturesRef.current;
      
      // Calculate a dynamic bounce based on energy and tempo
      // A faster tempo means a faster wave for the mid frequencies
      const beatDurationMs = (60 / Math.max(tempo, 1)) * 1000;
      const phase = (Date.now() % beatDurationMs) / beatDurationMs; 
      
      // Scale visualizer intensity by track energy
      const intensityScale = Math.max(0.2, energy * 1.5); 

      setAudio({
        bass: (Math.random() * 0.5 + 0.5) * intensityScale,
        mid: (Math.sin(phase * Math.PI * 2) * 0.25 + 0.6) * intensityScale,
        treble: (Math.random() * 0.6 + 0.3) * intensityScale,
      });
    }, 80); // run slightly faster for smoother updates

    return () => clearInterval(loop);
  }, []);

  const skipTrack = async () => {
    if (!token) return;
    try {
      await spotifyApi.skipToNext();
      // Wait a moment for Spotify to switch tracks, then clear the ID to force a full refresh of features and colours
      setTimeout(() => {
        setCurrentTrackId(null);
      }, 500);
    } catch (e) {
      console.error("Failed to skip track", e);
    }
  };

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center p-6 text-slate-100 overflow-hidden bg-[#020617]">
      <div className="w-full max-w-4xl flex flex-col gap-6 relative">
        <header className="flex justify-between items-center px-2">
          <div className="font-mono text-xs tracking-widest text-slate-400 uppercase">Convenience Neon System</div>
          <div className="text-xs font-mono flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${token ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} /> 
            <span className={token ? 'text-emerald-400' : 'text-rose-500'}>
              {token ? (currentTrackId ? 'SYNCHRONIZED' : 'LISTENING...') : 'OFFLINE (LOGIN REQUIRED)'}
            </span>
          </div>
        </header>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-emerald-900/20">
          {/* Always render the scene so it can be seen in the background */}
          <KonbiniScene palette={palette} audio={audio} />
          
          {/* Overlay login button if not authenticated */}
          {!token && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm transition-all duration-500">
              <h1 className="text-3xl font-bold mb-8 tracking-widest text-emerald-400 drop-shadow-lg text-center px-4">KONBINI<br/>VISUALIZER</h1>
              <button 
                onClick={() => redirectToAuthCodeFlow()}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                LOGIN WITH SPOTIFY
              </button>
            </div>
          )}
        </div>

        <footer className={`w-full bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between backdrop-blur-xl transition-opacity duration-500 ${token ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="flex items-center gap-4">
            <img src={palette.albumArtUrl} className="w-14 h-14 rounded-lg object-cover" alt="Art" crossOrigin="anonymous" />
            <div>
              <div className="font-bold text-sm">{palette.trackName}</div>
              <div className="font-mono text-xs text-slate-400">{palette.artistName}</div>
            </div>
          </div>
          <button
            onClick={skipTrack}
            className="px-5 py-2.5 text-xs bg-white text-slate-950 font-medium rounded-xl active:scale-95 transition"
          >
            Skip Track ✦
          </button>
        </footer>
      </div>
    </div>
  );
}