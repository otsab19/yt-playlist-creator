# PlaylistAI — YouTube Playlist Creator

Build and save YouTube playlists five ways: AI-generated, discover by artist/genre, from your liked videos, from a concert setlist, or by manual search.

**Live:** https://yt-playlist-creator.vercel.app

---

## Features

### AI Playlist
Describe a mood, genre, era, or artist. Your chosen LLM suggests 15-20 songs. Includes live autocomplete for artists, songs, and genres powered by Last.fm.

### Discover
Search any artist, song, or genre with live autocomplete. See similar artists, explore genre top artists, and generate playlists with one click.

### My Music
Browse your YouTube liked videos and playlists. Select songs you love, then get AI-powered recommendations based on your taste. Save results back to YouTube.

### Concert Setlist
Paste a setlist per band (one song per line). Parses all tracks, searches YouTube, and generates per-band and full-night playlists.

### Manual Search
Search YouTube directly, pick results, and assemble your own queue.

### Save to YouTube
Sign in with Google OAuth and save any generated playlist directly to your YouTube account. Playlists are created as private with all songs added.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 — dark + light mode |
| UI | Radix UI, Lucide React, shadcn-style components |
| AI | Pluggable provider system (Gemini, OpenAI, Anthropic, Ollama) |
| YouTube | YouTube Data API v3 + OAuth (search, save, liked, playlists) |
| Music Data | Last.fm API (artist/track/genre autocomplete, similar artists) |
| Auth | NextAuth.js with Google OAuth + automatic token refresh |

---

## Getting Started

```bash
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

Create `.env.local` with:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-string>
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
LASTFM_API_KEY=<your-lastfm-api-key>
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`
4. Enable **YouTube Data API v3** in APIs & Services

### Last.fm API Key

1. Create account at https://www.last.fm/api/account/create
2. Free, no OAuth needed — just paste the key

### AI Provider Keys

Set in the **Settings** dialog (stored in browser localStorage):

| Provider | Where to get key | Notes |
|---|---|---|
| Google Gemini | https://aistudio.google.com/app/apikey | Free tier available |
| OpenAI | https://platform.openai.com/api-keys | GPT-4o Mini is cheapest |
| Anthropic Claude | https://console.anthropic.com/settings/keys | Haiku is cheapest |
| Ollama | No key — set base URL | Run locally; free |

---

## Project Structure

```
app/
  page.tsx                  AI Playlist (with music autocomplete)
  discover/page.tsx         Discover — artist/song/genre explorer
  my-music/page.tsx         My Music — liked videos + AI recommendations
  setlist/page.tsx          Concert Setlist
  search/page.tsx           Manual Search
  api/
    llm-playlist/           POST - LLM playlist generation
    youtube-search/         POST - YouTube search (OAuth or API key)
    youtube-save-playlist/  POST - Save playlist to YouTube
    youtube-library/        GET  - Liked videos, user playlists
    music-search/           GET  - Last.fm artist/track/tag search
    music-similar/          GET  - Similar artists, genre top artists
    auth/[...nextauth]/     NextAuth Google OAuth + token refresh
    list-models/            POST - List Gemini models
components/
  nav.tsx                   Navigation bar
  music-autocomplete.tsx    Live search with tabbed results
  sign-in-banner.tsx        Prompt to sign in when not authenticated
  playlist-output.tsx       Playlist URL + save to YouTube button
  song-row.tsx              Per-song row with status + manual override
  settings-dialog.tsx       Provider picker, model selector, key fields
  settings-context.tsx      API keys context (localStorage)
  session-provider.tsx      NextAuth session wrapper
  theme-provider.tsx        next-themes wrapper
  theme-toggle.tsx          Sun/Moon toggle
  toast.tsx                 Snackbar toast system
  ui/                       button, input, textarea, badge
lib/
  llm/                      Provider interface + factory
    types.ts                LLMProvider interface, ProviderKey
    prompt.ts               System prompt + parseSongs()
    factory.ts              createProvider() + generatePlaylist()
    models.ts               PROVIDER_REGISTRY
    providers/              gemini, openai, anthropic, ollama
  types.ts                  SongEntry, ApiKeys
  utils.ts                  cn(), buildYouTubePlaylistUrl(), extractVideoId()
types/
  next-auth.d.ts            Session/JWT type augmentation
```

---

## Adding a New LLM Provider

1. Create `lib/llm/providers/myprovider.ts` implementing `LLMProvider`
2. Register in `lib/llm/factory.ts` → `PROVIDERS` map
3. Add metadata in `lib/llm/models.ts` → `PROVIDER_REGISTRY`

---

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel
3. Set environment variables (see above)
4. Add production redirect URI in Google Cloud Console

---

## Ollama (Local AI)

```bash
brew install ollama
ollama pull llama3.2
ollama serve
```

In Settings, select Ollama and set base URL to `http://localhost:11434/v1`.
