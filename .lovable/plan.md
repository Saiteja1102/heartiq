

## Fix: AI Chatbot, Medicines & Messages

### Root cause

The user supplied a **Groq Cloud** API key (prefix `gsk_...`), but both edge functions are pointed at **xAI's** API (`api.x.ai`), which rejects Groq keys with `400 Incorrect API key`. That's why both the chatbot and medicines page return "stream failed". Messages itself is wired correctly — the section appears empty because no conversations have been created yet.

### What I'll change

**1. Switch both edge functions from xAI → Groq Cloud**

`supabase/functions/grok-chat/index.ts` (chatbot):
- Endpoint → `https://api.groq.com/openai/v1/chat/completions`
- Model → `llama-3.3-70b-versatile`
- Read key from `GROQ_API_KEY` (with `GROK_API_KEY` fallback so nothing breaks during the swap)
- Keep streaming SSE format (Groq is OpenAI-compatible — same delta format)
- Surface specific errors (401/429/402) to the client instead of generic "Stream failed"

`supabase/functions/groq-medicine/index.ts` (medicines):
- Same endpoint + model swap
- Keep `response_format: json_object`, temperature 0.3, max_tokens 1500
- Add robust JSON cleanup (strip code fences, trim) before parsing in case the model wraps output

**2. Improve Chatbot frontend error surfacing** (`src/components/Chatbot.tsx`)
- Read the JSON error body when `!resp.ok` and show the real reason (e.g. "Invalid API key") instead of the generic "Stream failed".

**3. Add a new `GROQ_API_KEY` secret**
You'll be prompted to paste your Groq Cloud key (get one at https://console.groq.com/keys — free tier works). The functions will prefer `GROQ_API_KEY` and fall back to `GROK_API_KEY` if not set.

**4. Messages section**
No code change needed — it works. After the AI is fixed, I'll verify by:
- Going to `/consult`, clicking **Chat** on a doctor card → creates a conversation row → `/chat?c=<id>` shows the thread.
- The empty state ("No conversations yet — start a chat from the consult page") is the intended UX when there are zero conversations.

If you'd prefer, I can also seed a demo conversation between your patient account and one of the mock doctors so Messages isn't empty on first load — say the word.

### Files touched
- `supabase/functions/grok-chat/index.ts` — endpoint + model + key + error passthrough
- `supabase/functions/groq-medicine/index.ts` — endpoint + model + key + JSON sanitization
- `src/components/Chatbot.tsx` — surface real error messages

### Secrets
- **Add `GROQ_API_KEY`** (Groq Cloud, starts with `gsk_`). I'll request it via the secret tool when implementation starts.

### Verification steps after deploy
1. Open chatbot → ask a question → streams cleanly.
2. Open `/medicines` → search "Metoprolol" → renders full info card.
3. `/consult` → click Chat on a doctor → land in `/chat` with a live thread; send a message → appears instantly.

