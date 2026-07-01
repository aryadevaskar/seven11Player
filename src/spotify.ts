import SpotifyWebApi from 'spotify-web-api-js';

const clientId = "af2960b28dcf42419dfc623e1f1acb72";
const redirectUri = "http://127.0.0.1:5173/callback";
const scopes = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
];

const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
}

const base64encode = (input: ArrayBuffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export const redirectToAuthCodeFlow = async () => {
  const codeVerifier = generateRandomString(64);
  window.localStorage.setItem('code_verifier', codeVerifier);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  const authUrl = new URL("https://accounts.spotify.com/authorize")

  const params = {
    response_type: 'code',
    client_id: clientId,
    scope: scopes.join(" "),
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  }

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
}

export const getAccessToken = async (code: string) => {
  const codeVerifier = localStorage.getItem('code_verifier');
  if (!codeVerifier) return null;

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", payload);
    const data = await response.json();

    if (data.access_token) {
      localStorage.setItem('spotify_access_token', data.access_token);
      if (data.refresh_token) {
          localStorage.setItem('spotify_refresh_token', data.refresh_token);
      }
      return data.access_token;
    }
  } catch (err) {
    console.error("Token fetch error:", err);
  }
  return null;
}

export const spotifyApi = new SpotifyWebApi();
