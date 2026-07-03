# PlaylistAI — YouTube Playlist Creator

Build YouTube playlists three ways: AI-generated via your choice of LLM, from a concert setlist, or by manually searching songs.

---

## Features

- **AI Playlist** — Describe a mood, genre, era, or artist. Your chosen LLM suggests 15-20 songs, the app searches YouTube for each, and generates a shareable playlist URL.
- **Concert Setlist** — Paste a setlist per band (one song per line). Parses all tracks, searches YouTube, and outputs per-band and full-night playlist URLs.
- **Manual Search** — Search YouTube directly, pick results, and assemble your own queue.

All modes output a `youtube.com/watch_videos?video_ids=...` URL — opens as a YouTube queue instantly, no account required.

---

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 — dark + light mode |
| UI | Radix UI, Lucide React, shadcn-style components |
| AI | Pluggable provider system (Gemini, OpenAI, Anthropic, Ollama) |
| YouTube | YouTube Data API v3 |

---

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## API Keys

Keys are entered in the **Settings** dialog (top right) and stored in `localStorage`. Nothing is sent anywhere except the chosen provider and Google APIs.

### AI Provider

Select your provider in Settings > AI Provider tab:

| Provider | Where to get key | Notes |
|---|---|---|
| Google Gemini | https://aistudio.google.com/app/apikey | Free tier available |
| OpenAI | https://platform.openai.com/api-keys | Pay-per-use; GPT-4o Mini is cheapest |
| Anthropic Claude | https://console.anthropic.com/settings/keys | Pay-per-use; Haiku is cheapest |
| Ollama | No key — set base URL | Run locally; free |

### YouTube

Enable **YouTube Data API v3** in Google Cloud Console and create an API key.
Around 10,000 free units/day — each search costs roughly 100 units.

---

## LLM Provider Architecture

The AI layer is fully abstracted behind a provider interface — easy to extend.

```
lib/llm/
  types.ts          LLMProvider interface, LLMConfig, ProviderKey
  prompt.ts         Shared system prompt + parseSongs()
  factory.ts        createProvider() factory + generatePlaylist()
  models.ts         PROVIDER_REGISTRY — metadata, models, icons, key links
  providers/
    gemini.ts       GeminiProvider
    openai.ts       OpenAIProvider
    anthropic.ts    AnthropicProvider
    ollama.ts       OllamaProvider (OpenAI-compatible /v1)
```

### Adding a new provider

1. Create `lib/llm/providers/myprovider.ts` implementing `LLMProvider`
2. Register it in `lib/llm/factory.ts` in the `PROVIDERS` map
3. Add metadata in `lib/llm/models.ts` in `PROVIDER_REGISTRY`

---

## Project Structure

```
app/
  page.tsx                  AI Playlist page
  setlist/page.tsx          Concert Setlist page
  search/page.tsx           Manual Search page
  api/
    llm-playlist/           POST - LLM generation via factory
    youtube-search/         POST - YouTube Data API v3 search
    list-models/            POST - List Gemini models for a key
components/
  nav.tsx                   Navigation + theme toggle
  settings-dialog.tsx       Provider picker, model selector, key fields
  settings-context.tsx      API keys context (localStorage)
  theme-provider.tsx        next-themes wrapper
  theme-toggle.tsx          Sun/Moon toggle button
  toast.tsx                 Bottom-center snackbar toast system
  song-row.tsx              Per-song row with status + manual override
  playlist-output.tsx       Playlist URL — copy and open
  ui/                       button, input, textarea, badge
lib/
  llm/                      Provider interface + factory (see above)
  types.ts                  SongEntry, ApiKeys
  utils.ts                  cn(), buildYouTubePlaylistUrl(), extractVideoId()
```

---

## Ollama (local)

```bash
brew install ollama
ollama pull llama3.2
ollama serve
```

In Settings, select Ollama, pick a model, and set base URL to `http://localhost:11434/v1`.
