import { useState, useEffect, useRef } from 'react';
import KonbiniScene from './KonbiniScene';
import { redirectToAuthCodeFlow, getAccessToken, spotifyApi } from './spotify';
import { getPaletteSync } from 'colorthief';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { database } from './firebase';
import { ref, onValue, set, remove } from 'firebase/database';

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

  // Session state for QR Login
  const [sessionId, setSessionId] = useState<string>('');
  const [isMobileLogin, setIsMobileLogin] = useState<boolean>(false);
  const [mobileConnected, setMobileConnected] = useState<boolean>(false);

  // Keep a ref of audio features for the fast setInterval loop
  useEffect(() => {
    audioFeaturesRef.current = audioFeatures;
  }, [audioFeatures]);

  // Auth & Session Effect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const paramMobile = params.get("mobileLogin") === 'true';
    const paramSession = params.get("sessionId");
    
    // Restore from localStorage in case we are returning from Spotify redirect
    const savedMobile = localStorage.getItem('isMobileLogin') === 'true';
    const savedSession = localStorage.getItem('mobileSessionId');
    const isMobileContext = paramMobile || savedMobile;
    const activeSessionId = paramSession || savedSession;

    setIsMobileLogin(isMobileContext);

    if (code) {
      // Clear code from URL
      window.history.replaceState({}, document.title, window.location.pathname); 
      getAccessToken(code).then((newToken) => {
        if (newToken) {
          if (isMobileContext && activeSessionId) {
             // We are on mobile: Send token to Firebase Database
             set(ref(database, `sessions/${activeSessionId}`), {
                token: newToken
             }).then(() => {
                setMobileConnected(true);
                // Clean up local mobile state so it doesn't loop next time
                localStorage.removeItem('isMobileLogin');
                localStorage.removeItem('mobileSessionId');
             });
          } else {
             // We are on desktop: Standard direct login
             setToken(newToken);
             spotifyApi.setAccessToken(newToken);
          }
        }
      });
    } else {
      const savedToken = localStorage.getItem('spotify_access_token');
      if (savedToken && !isMobileContext) {
        setToken(savedToken);
        spotifyApi.setAccessToken(savedToken);
      } else if (!isMobileContext) {
        // Desktop Mode: Generate a session ID and listen to Firebase
        const newSessionId = uuidv4();
        setSessionId(newSessionId);

        const sessionRef = ref(database, `sessions/${newSessionId}`);
        const unsubscribe = onValue(sessionRef, (snapshot) => {
           const data = snapshot.val();
           if (data && data.token) {
              setToken(data.token);
              spotifyApi.setAccessToken(data.token);
              localStorage.setItem('spotify_access_token', data.token);
              // Clean up the token from DB for security
              remove(sessionRef);
           }
        });
        return () => unsubscribe(); // Cleanup listener on unmount
      } else if (isMobileContext && activeSessionId) {
        // Mobile Mode: Prepare to redirect
        setSessionId(activeSessionId);
      }
    }
  }, []);

  const handleMobileLoginRedirect = () => {
    localStorage.setItem('isMobileLogin', 'true');
    localStorage.setItem('mobileSessionId', sessionId);
    redirectToAuthCodeFlow();
  };

  // Polling Effect
  useEffect(() => {
    if (!token || isMobileLogin) return; // Don't poll on mobile helper view

    const fetchTrack = async () => {
      try {
        const currentPlaying = await spotifyApi.getMyCurrentPlayingTrack();
        
        if (currentPlaying && currentPlaying.item) {
          if (currentPlaying.item.type === "track") {
            const track = currentPlaying.item as SpotifyApi.TrackObjectFull;
            
            if (track.id !== currentTrackId) {
              setCurrentTrackId(track.id);
              const albumArtUrl = track.album.images[0]?.url || DEFAULT_PALETTE.albumArtUrl;
              
              setPalette(prev => ({
                ...prev,
                trackName: track.name,
                artistName: track.artists.map(a => a.name).join(", "),
                albumArtUrl,
              }));

              extractColors(albumArtUrl);

              const features = await spotifyApi.getAudioFeaturesForTrack(track.id);
              if (features) {
                setAudioFeatures({
                  energy: features.energy,
                  tempo: features.tempo,
                });
              }
            } else {
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
        if (err.status === 401) {
            logout();
        }
      }
    };

    fetchTrack();
    const interval = setInterval(fetchTrack, 3000);
    return () => clearInterval(interval);
  }, [token, currentTrackId, isMobileLogin]);

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

  useEffect(() => {
    if (isMobileLogin) return;
    const loop = setInterval(() => {
      const { energy, tempo } = audioFeaturesRef.current;
      const beatDurationMs = (60 / Math.max(tempo, 1)) * 1000;
      const phase = (Date.now() % beatDurationMs) / beatDurationMs; 
      const intensityScale = Math.max(0.2, energy * 1.5); 

      setAudio({
        bass: (Math.random() * 0.5 + 0.5) * intensityScale,
        mid: (Math.sin(phase * Math.PI * 2) * 0.25 + 0.6) * intensityScale,
        treble: (Math.random() * 0.6 + 0.3) * intensityScale,
      });
    }, 80);
    return () => clearInterval(loop);
  }, [isMobileLogin]);

  const skipTrack = async () => {
    if (!token) return;
    try {
      await spotifyApi.skipToNext();
      setTimeout(() => {
        setCurrentTrackId(null);
      }, 500);
    } catch (e) {
      console.error("Failed to skip track", e);
    }
  };

  const logout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('code_verifier');
    setToken(null);
    setCurrentTrackId(null);
    setPalette(DEFAULT_PALETTE);
    spotifyApi.setAccessToken('');
  };

  // ================= MOBILE VIEW =================
  if (isMobileLogin) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-[#020617] text-white p-6">
         {mobileConnected ? (
            <div className="text-center animate-pulse">
              <h2 className="text-3xl font-bold text-emerald-400 mb-4">Connected!</h2>
              <p className="text-slate-400">Your Konbini is now synchronized.</p>
              <p className="text-slate-500 mt-2 text-sm">You can safely close this window.</p>
            </div>
         ) : (
            <div className="text-center flex flex-col items-center">
              <h1 className="text-2xl font-bold mb-8 tracking-widest text-emerald-400 drop-shadow-md">KONBINI REMOTE</h1>
              <p className="mb-10 text-slate-400 font-mono text-sm max-w-[250px]">Link your phone to synchronize the visualizer instantly.</p>
              <button 
                onClick={handleMobileLoginRedirect}
                className="px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-xl transition hover:scale-105 active:scale-95"
              >
                CONNECT SPOTIFY
              </button>
            </div>
         )}
      </div>
    );
  }

  // ================= DESKTOP VIEW =================
  
  // QR code MUST always point to the live Vercel URL so phones can reach it
  // (window.location.origin would be 127.0.0.1 on local dev — unreachable by phone)
  const VERCEL_URL = "https://konbiniplayer.vercel.app";
  const qrUrl = `${VERCEL_URL}/?mobileLogin=true&sessionId=${sessionId}`;

  return (
    <div className="relative w-screen h-screen flex flex-col items-center justify-center p-6 text-slate-100 overflow-hidden bg-[#020617]">
      <div className="w-full max-w-4xl flex flex-col gap-6 relative">
        <header className="flex justify-between items-center px-2">
          <div className="font-mono text-xs tracking-widest text-slate-400 uppercase">Convenience Neon System</div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-mono flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${token ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} /> 
              <span className={token ? 'text-emerald-400' : 'text-rose-500'}>
                {token ? (currentTrackId ? 'SYNCHRONIZED' : 'LISTENING...') : 'OFFLINE (LOGIN REQUIRED)'}
              </span>
            </div>
            {token && (
              <button 
                onClick={logout}
                className="text-xs font-mono text-slate-500 hover:text-rose-400 transition"
              >
                [LOGOUT]
              </button>
            )}
          </div>
        </header>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-emerald-900/20">
          <KonbiniScene palette={palette} audio={audio} />
          
          {!token && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-500">
              <h1 className="text-3xl font-bold mb-8 tracking-widest text-emerald-400 drop-shadow-lg text-center px-4">KONBINI<br/>VISUALIZER</h1>
              
              {/* QR Code Frame */}
              <div className="bg-white p-5 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] mb-4 flex flex-col items-center transition-transform hover:scale-105">
                 <QRCodeSVG value={qrUrl} size={180} fgColor="#020617" />
              </div>
              
              <p className="text-emerald-400 font-mono text-xs mb-8 tracking-widest uppercase">Scan to Connect</p>

              <button 
                onClick={() => redirectToAuthCodeFlow()}
                className="text-xs text-slate-400 hover:text-emerald-400 transition underline underline-offset-4 font-mono"
              >
                [ Or login on this device ]
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