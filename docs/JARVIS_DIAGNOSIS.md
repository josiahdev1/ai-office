# JARVIS Root Cause Diagnosis (Phase J7 — Step 1)

**Date**: 2026-11-11  
**Branch**: `office-v3`  
**Endpoint**: `POST /api/jarvis` ([`src/app/api/jarvis/route.ts`](../src/app/api/jarvis/route.ts) & [`src/lib/jarvis/orchestrator.ts`](../src/lib/jarvis/orchestrator.ts))

---

## 1. Which Provider & Code Path Answered the User's Messages?

When the user asked:
1. `"Tell me a quick witty joke about software engineers"` -> answered `"Always listening, Josiah. How would you like to proceed?"` + `"Live Supabase: 24/24 active (24 desk, 0 pantry, 0 gym) • 24 tasks • 0 approvals"`
2. `"Why was your reply always the same before? Can we talk like the real JARVIS now?"` -> answered `"Indeed, Josiah. I'm right here with you inside The Brain Core — give me a topic, a question, or a mission for the team and I'm on it."` + `"Live Supabase: 24/24 active..."`
3. `"what is the programming?"` -> answered `"Always listening, Josiah. How would you like to proceed?"` + `"Live Supabase: 24/24 active..."`

### Exact Code Path Executed
**Neither Gemini, Anthropic, nor OpenAI answered those messages.** Instead, the server-side Gemini call threw an error and was silently swallowed by the `catch` block in [`src/lib/jarvis/orchestrator.ts`](../src/lib/jarvis/orchestrator.ts) (lines 733–750), which fell through to `buildGroundedFallbackReply()` (lines 562–636).

Specifically:
- **Where `"Always listening, Josiah..."` and `"Indeed, Josiah..."` came from**:
  In `src/lib/jarvis/orchestrator.ts` lines 626–635, `buildGroundedFallbackReply()` defined a 4-element hardcoded template array:
  ```ts
  const conversationalReplies = [
    `I hear you loud and clear, ${operatorName}...`,
    `A fair point, ${operatorName}...`,
    `Indeed, ${operatorName}. I'm right here with you inside The Brain Core...`,
    `Always listening, ${operatorName}. How would you like to proceed?`,
  ]
  const hashIdx =
    prompt.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
    conversationalReplies.length
  return conversationalReplies[hashIdx]
  ```
- **Where the `"Live Supabase: 24/24 active (24 desk, 0 pantry, 0 gym) • 24 tasks • 0 approvals"` footer came from**:
  In [`src/components/jarvis/JarvisInterior.tsx`](../src/components/jarvis/JarvisInterior.tsx) line 545, every completed turn unconditionally attached a `citations` string regardless of whether any office tool was used:
  ```ts
  citations: `Live Supabase: ${snap.activeAgents}/${snap.totalAgents} active (${snap.atDeskAgents} desk, ${snap.pantryAgents} pantry, ${snap.gymAgents} gym) • ${snap.runningTasks} tasks • ${snap.pendingApprovals} approvals`
  ```

---

## 2. Environment & `ListModels` Verification

1. **Is `GEMINI_API_KEY` present on the server?**
   - `GEMINI_API_KEY` present: **`true`** (boolean check only; value never printed).
   - `ANTHROPIC_API_KEY` present: **`false`**.
   - `OPENAI_API_KEY` present: **`false`**.

2. **Was the model name valid? (`ListModels` inspection)**
   - Calling `GET https://generativelanguage.googleapis.com/v1beta/models?key=<REDACTED>` from a server script returned the active 2026 model catalog:
     - `models/gemini-3.5-flash`
     - `models/gemini-3.1-flash-lite-preview`
     - `models/gemini-3.6-flash`
     - `models/gemini-3.7-flash`
     - `models/gemini-3.8-flash`
     - `models/gemini-2.5-flash` (deprecated for new users)
     - `models/gemini-flash-lite-latest`
   - Why previous calls failed:
     1. **`models/gemini-2.5-flash` and `models/gemini-2.5-flash-lite` returned HTTP `404`**:
        `{"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements."}}`
     2. **Gemini 3.x thinking token budget & `AbortSignal.timeout(4500)`**:
        By default, Gemini 3.x models spend internal reasoning (`thought`) tokens before emitting visible text. With `maxOutputTokens: 320` and `AbortSignal.timeout(4500)`, `gemini-flash-lite-latest` either timed out (`>4500ms`) or exhausted token budget on thoughts, throwing `TimeoutError: The operation was aborted due to timeout`.
     3. **Silent `try/catch` fallback**:
        When `callGeminiJarvis` threw `TimeoutError`, `runJarvisTurn` caught the exception (`console.warn`) and returned `buildGroundedFallbackReply()`, disguising the error as a normal `"Always listening, Josiah..."` reply.

---

## 3. Live Server-Side Test Call Evidence

With `thinkingConfig: { thinkingBudget: 0 }` and model `gemini-3.5-flash` (with automatic failover to `gemini-3.1-flash-lite-preview` and `gemini-3.6-flash`), we executed live server-side calls:

| Field | Result |
| :--- | :--- |
| **Provider** | `GEMINI` (`https://generativelanguage.googleapis.com/v1beta`) |
| **Model** | `gemini-3.1-flash-lite-preview` / `gemini-3.5-flash` (configurable via `process.env.GEMINI_MODEL`) |
| **HTTP Status** | `200 OK` |
| **Latency** | `1186 ms` (`gemini-3.1-flash-lite-preview`) / `1342 ms` (`gemini-3.5-flash`) |
| **Test Prompt** | `"Tell me a quick witty joke about software engineers"` |
| **First Words of Reply** | `"A software engineer’s wife tells him, \"While you're at the store, get some milk,\" and he never comes back because he's stuck in an infinite loop..."` |

---

## 4. Fixes Implemented in Phase J7

1. **Removed all silent template fallbacks**:
   - Deleted `conversationalReplies` and `buildGroundedFallbackReply` from [`src/lib/jarvis/orchestrator.ts`](../src/lib/jarvis/orchestrator.ts).
   - If the LLM call fails, `/api/jarvis` returns a structured error and [`src/components/jarvis/JarvisInterior.tsx`](../src/components/jarvis/JarvisInterior.tsx) renders a visible error banner (`"Gemini unreachable: <reason>"`) with a **Retry** button — never a fake reply.
   - If no API key is configured at all, `SIM MODE` is explicitly badged and stated plainly.
2. **Real Gemini 3.x Conversation + Native Function Calling (Tools)**:
   - Configured `GEMINI_MODEL` (defaulting to `gemini-3.5-flash` with automatic fallback across `gemini-3.1-flash-lite-preview` and `gemini-3.6-flash`, and `thinkingConfig: { thinkingBudget: 0 }` for ~1.1s latency).
   - Replaced rigid intent-template routing with 7 Zod-validated server-side tools (`get_office_status`, `list_tasks`, `get_agent`, `list_approvals`, `recent_activity`, `dispatch_plan`, `office_command`).
   - Jokes, small talk, general coding questions (`"what is programming?"`), and Taglish chat call **zero tools** and inject **zero office context**.
   - The collapsible `Sources` footer is rendered **only** when one or more tools were actually called during that turn.


---

## 5. Phase J10 Root Cause Diagnosis: Why "Listening" Showed While Speaking

**Symptoms Observed**:
- When JARVIS began speaking via `speechSynthesis`, the status indicator and HUD label frequently displayed `"LISTENING"` instead of `"SPEAKING"`.
- The microphone button in `JarvisInterior.tsx` displayed `🎙 LISTENING...` unconditionally whenever voice was enabled, regardless of whether JARVIS was speaking or thinking.

**Technical Root Causes Identified**:
1. **Scattered Flags & Competing Asynchronous State Transitions**:
   - The application lacked a single authority for voice state. State was split across `coreState` (`'idle' | 'listening' | 'thinking' | 'executing' | 'speaking' | 'error'`), `voiceEnabledRef`, `isSpeakingTtsRef`, `isRecognitionRunningRef`, `isTransmitting`, and `jarvisCoreState` in `page.tsx`.
   - In `sendChatMessage()` ([`src/components/jarvis/JarvisInterior.tsx`](../src/components/jarvis/JarvisInterior.tsx) lines 639–646), a `finally` block scheduled `setTimeout(() => onCoreStateChange(voiceEnabledRef.current ? 'listening' : 'idle'), 300)`.
   - Because `window.speechSynthesis.speak(utterance)` is asynchronous, `utterance.onstart` often fired *after* or coincided with this 300ms timer, causing the scheduled `onCoreStateChange('listening')` to overwrite `'speaking'`.
   - Continuous recognition auto-restart loops in `instance.onend` ([`JarvisInterior.tsx`](../src/components/jarvis/JarvisInterior.tsx) lines 754–765) also triggered `onCoreStateChange('listening')` asynchronously while the TTS utterance was still being synthesized or queued by the browser engine.
2. **Fallback Label Masking in Page HUD**:
   - In [`src/app/page.tsx`](../src/app/page.tsx) line 1273, the office HUD ternary check:
     `jarvisCoreState === 'speaking' ? 'SPEAKING' : jarvisCoreState === 'thinking' ? 'THINKING' : 'LISTENING'`
     defaulted to `'LISTENING'` for *any* other state, including `'idle'`, `'executing'`, or transient transition gaps.
3. **Hardcoded Button State**:
   - In [`src/components/jarvis/JarvisInterior.tsx`](../src/components/jarvis/JarvisInterior.tsx) line 1602:
     `<span>{voiceEnabled ? '🎙 LISTENING...' : '🎙 MIC OFF'}</span>`
     evaluated only `voiceEnabled`, persistently labeling the button as `"LISTENING..."` even during active speech output.

**Resolution in Phase J10**:
- Replaced all scattered flags and arbitrary timeouts with **ONE deterministic reducer-based state machine** ([`src/lib/jarvis/voiceState.ts`](../src/lib/jarvis/voiceState.ts)).
- States: strictly `idle`, `listening`, `thinking`, `executing`, `speaking`, `error`.
- All UI components (core animation, status badges, mic buttons, floating HUD) read **exclusively** from this single state.
- Implemented instant **Barge-In** detection and hardware echo protection (`echoCancellation`, `noiseSuppression`, `autoGainControl`).
