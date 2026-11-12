/**
 * JARVIS V2 — Deterministic Voice State Machine (Phase J10)
 *
 * Implements a single reducer-based state machine governing all voice states:
 * 'idle' | 'listening' | 'thinking' | 'executing' | 'speaking' | 'error'
 *
 * Guarantees zero conflicting state flags between speech recognition, TTS,
 * LLM streaming, and plan execution, with instant barge-in, echo protection,
 * watchdog safety, and diagnostic transition logging.
 */

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'executing'
  | 'speaking'
  | 'error'

export interface VoiceTransitionRecord {
  id: string
  timestamp: number
  timeString: string
  from: VoiceState | null
  to: VoiceState
  reason: string
  liveValues: {
    speechSynthesisSpeaking: boolean
    audioPlaying?: boolean
    micOpen: boolean
    micLevel: number
    lastRecognitionResult: string
  }
}

export interface VoiceStateMachineState {
  current: VoiceState
  previous: VoiceState | null
  interimTranscript: string
  finalTranscript: string
  errorMessage: string | null
  lastEventTime: number
  bargeInCount: number
  history: VoiceTransitionRecord[]
}

export type VoiceActionLiveValues = Partial<VoiceTransitionRecord['liveValues']>

export type VoiceAction =
  | { type: 'MIC_OPEN'; liveValues?: VoiceActionLiveValues; reason?: string }
  | { type: 'USER_SPEECH_START'; liveValues?: VoiceActionLiveValues; reason?: string }
  | { type: 'INTERIM_TRANSCRIPT'; transcript: string; liveValues?: VoiceActionLiveValues; reason?: string }
  | { type: 'TRANSCRIPT_FINALIZED'; transcript: string; liveValues?: VoiceActionLiveValues; reason?: string }
  | { type: 'EXECUTION_START'; planTitle?: string; liveValues?: VoiceActionLiveValues; reason?: string }
  | { type: 'REPLY_READY'; liveValues?: VoiceActionLiveValues; reason?: string }
  | { type: 'SPEECH_START'; liveValues?: VoiceActionLiveValues; reason?: string }
  | { type: 'SPEECH_END'; liveValues?: VoiceActionLiveValues; reason?: string }
  | {
      type: 'BARGE_IN'
      reason: 'interim_words' | 'mic_threshold' | 'space_key' | 'manual_interrupt' | string
      liveValues?: VoiceActionLiveValues
    }
  | { type: 'SPACE_INTERRUPT'; liveValues?: VoiceActionLiveValues; reason?: string }
  | {
      type: 'WATCHDOG_TIMEOUT'
      reason: 'speaking_no_playback' | 'listening_mic_closed' | string
      liveValues?: VoiceActionLiveValues
    }
  | { type: 'ERROR'; error: string; liveValues?: VoiceActionLiveValues; reason?: string }
  | { type: 'RECOVER'; liveValues?: VoiceActionLiveValues; reason?: string }
  | { type: 'RESET'; liveValues?: VoiceActionLiveValues; reason?: string }

export const INITIAL_VOICE_STATE: VoiceStateMachineState = {
  current: 'idle',
  previous: null,
  interimTranscript: '',
  finalTranscript: '',
  errorMessage: null,
  lastEventTime: 0,
  bargeInCount: 0,
  history: [],
}

/**
 * Creates a diagnostic transition record and maintains the rolling 30-item buffer.
 */
function recordTransition(
  prevHistory: VoiceTransitionRecord[],
  from: VoiceState | null,
  to: VoiceState,
  reason: string,
  liveValues?: VoiceActionLiveValues,
  timestamp = Date.now()
): VoiceTransitionRecord[] {
  const timeString = new Date(timestamp).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Manila',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const newRecord: VoiceTransitionRecord = {
    id: `tr-${timestamp}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    timeString: `${timeString} PHT`,
    from,
    to,
    reason,
    liveValues: {
      speechSynthesisSpeaking: liveValues?.speechSynthesisSpeaking ?? (to === 'speaking'),
      audioPlaying: liveValues?.audioPlaying ?? (to === 'speaking'),
      micOpen: liveValues?.micOpen ?? (to === 'listening'),
      micLevel: liveValues?.micLevel ?? 0,
      lastRecognitionResult: liveValues?.lastRecognitionResult ?? '',
    },
  }

  return [newRecord, ...prevHistory].slice(0, 30)
}

/**
 * Pure reducer function for the JARVIS voice state machine.
 */
export function voiceStateReducer(
  state: VoiceStateMachineState,
  action: VoiceAction
): VoiceStateMachineState {
  const now = Date.now()
  const live = 'liveValues' in action ? action.liveValues : undefined

  switch (action.type) {
    case 'MIC_OPEN': {
      if (state.current === 'idle' || state.current === 'error') {
        return {
          ...state,
          current: 'listening',
          previous: state.current,
          errorMessage: null,
          lastEventTime: now,
          history: recordTransition(
            state.history,
            state.current,
            'listening',
            action.reason || 'MIC_OPEN',
            live,
            now
          ),
        }
      }
      return state
    }

    case 'USER_SPEECH_START': {
      if (state.current === 'speaking') {
        const nextBargeCount = state.bargeInCount + 1
        return {
          ...state,
          current: 'listening',
          previous: 'speaking',
          bargeInCount: nextBargeCount,
          interimTranscript: '',
          lastEventTime: now,
          history: recordTransition(
            state.history,
            'speaking',
            'listening',
            'USER_SPEECH_START (Barge-In)',
            live,
            now
          ),
        }
      }
      if (state.current === 'idle' || state.current === 'error') {
        return {
          ...state,
          current: 'listening',
          previous: state.current,
          errorMessage: null,
          interimTranscript: '',
          lastEventTime: now,
          history: recordTransition(
            state.history,
            state.current,
            'listening',
            'USER_SPEECH_START',
            live,
            now
          ),
        }
      }
      return state
    }

    case 'INTERIM_TRANSCRIPT': {
      return {
        ...state,
        interimTranscript: action.transcript,
        lastEventTime: now,
      }
    }

    case 'TRANSCRIPT_FINALIZED': {
      // Transition from listening to thinking when speech recognized
      if (state.current === 'listening') {
        return {
          ...state,
          current: 'thinking',
          previous: state.current,
          interimTranscript: '',
          finalTranscript: action.transcript,
          lastEventTime: now,
          history: recordTransition(
            state.history,
            state.current,
            'thinking',
            `TRANSCRIPT_FINALIZED: "${action.transcript.slice(0, 32)}"`,
            live,
            now
          ),
        }
      }
      return {
        ...state,
        finalTranscript: action.transcript,
        interimTranscript: '',
        lastEventTime: now,
      }
    }

    case 'EXECUTION_START': {
      // Transition from thinking to executing when tools or office plans run
      if (state.current === 'thinking') {
        return {
          ...state,
          current: 'executing',
          previous: state.current,
          lastEventTime: now,
          history: recordTransition(
            state.history,
            state.current,
            'executing',
            action.planTitle ? `EXECUTION_START: ${action.planTitle}` : 'EXECUTION_START',
            live,
            now
          ),
        }
      }
      return state
    }

    case 'REPLY_READY':
    case 'SPEECH_START': {
      // Audio or Speech Synthesis starts playback
      if (state.current !== 'speaking') {
        return {
          ...state,
          current: 'speaking',
          previous: state.current,
          lastEventTime: now,
          history: recordTransition(
            state.history,
            state.current,
            'speaking',
            action.type,
            live,
            now
          ),
        }
      }
      return state
    }

    case 'SPEECH_END': {
      // Speech has concluded, transition to idle
      if (state.current === 'speaking') {
        return {
          ...state,
          current: 'idle',
          previous: 'speaking',
          interimTranscript: '',
          lastEventTime: now,
          history: recordTransition(
            state.history,
            'speaking',
            'idle',
            'SPEECH_END (Audio playback concluded)',
            live,
            now
          ),
        }
      }
      return state
    }

    case 'SPACE_INTERRUPT': {
      // Space bar pressed while speaking -> instant interrupt to listening
      if (state.current === 'speaking') {
        return {
          ...state,
          current: 'listening',
          previous: 'speaking',
          bargeInCount: state.bargeInCount + 1,
          interimTranscript: '',
          lastEventTime: now,
          history: recordTransition(
            state.history,
            'speaking',
            'listening',
            'SPACE_INTERRUPT (Space bar pressed)',
            live,
            now
          ),
        }
      }
      return state
    }

    case 'BARGE_IN': {
      // Explicit barge-in event
      return {
        ...state,
        current: 'listening',
        previous: state.current,
        bargeInCount: state.bargeInCount + 1,
        interimTranscript: '',
        lastEventTime: now,
        history: recordTransition(
          state.history,
          state.current,
          'listening',
          `BARGE_IN (${action.reason})`,
          live,
          now
        ),
      }
    }

    case 'WATCHDOG_TIMEOUT': {
      if (action.reason === 'speaking_no_playback' && state.current === 'speaking') {
        return {
          ...state,
          current: 'idle',
          previous: 'speaking',
          lastEventTime: now,
          history: recordTransition(
            state.history,
            'speaking',
            'idle',
            'WATCHDOG_TIMEOUT: speaking_no_playback (>1000ms silent)',
            live,
            now
          ),
        }
      }
      if (action.reason === 'listening_mic_closed' && state.current === 'listening') {
        return {
          ...state,
          current: 'idle',
          previous: 'listening',
          lastEventTime: now,
          history: recordTransition(
            state.history,
            'listening',
            'idle',
            'WATCHDOG_TIMEOUT: listening_mic_closed',
            live,
            now
          ),
        }
      }
      return state
    }

    case 'ERROR': {
      return {
        ...state,
        current: 'error',
        previous: state.current,
        errorMessage: action.error,
        lastEventTime: now,
        history: recordTransition(
          state.history,
          state.current,
          'error',
          `ERROR: ${action.error}`,
          live,
          now
        ),
      }
    }

    case 'RECOVER': {
      return {
        ...state,
        current: 'idle',
        previous: state.current,
        errorMessage: null,
        lastEventTime: now,
        history: recordTransition(
          state.history,
          state.current,
          'idle',
          'RECOVER',
          live,
          now
        ),
      }
    }

    case 'RESET': {
      return {
        ...INITIAL_VOICE_STATE,
        lastEventTime: now,
        history: recordTransition(
          state.history,
          state.current,
          'idle',
          action.reason ? String(action.reason) : 'RESET',
          live,
          now
        ),
      }
    }

    default:
      return state
  }
}

/**
 * Echo overlap evaluator for the optional "Voice Interrupt (Headphones)" mode.
 *
 * Compares transcribed speech against what JARVIS said in recent sentences.
 * If >60% of words overlap with JARVIS's spoken output, OR if there are fewer
 * than 2 distinct non-matching words, the audio is classified as acoustic echo
 * and ignored.
 */
export interface EchoOverlapResult {
  isEcho: boolean
  overlapRatio: number
  nonMatchingWordCount: number
  matchedWords: string[]
  unmatchedWords: string[]
}

export type SpokenSentenceItem = string | { text: string; timestamp?: number }

export function checkEchoOverlap(
  heardText: string,
  recentSpokenSentences: SpokenSentenceItem[],
  threshold = 0.6
): EchoOverlapResult {
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1)

  const heardWords = normalize(heardText)
  if (heardWords.length === 0) {
    return {
      isEcho: false,
      overlapRatio: 0,
      nonMatchingWordCount: 0,
      matchedWords: [],
      unmatchedWords: [],
    }
  }

  const spokenWordsSet = new Set<string>()
  for (const item of recentSpokenSentences) {
    const sentence = typeof item === 'string' ? item : item.text
    normalize(sentence).forEach((w) => spokenWordsSet.add(w))
  }

  const matchedWords: string[] = []
  const unmatchedWords: string[] = []

  for (const word of heardWords) {
    if (spokenWordsSet.has(word)) {
      matchedWords.push(word)
    } else {
      unmatchedWords.push(word)
    }
  }

  const overlapRatio = matchedWords.length / heardWords.length
  // If >60% words overlap, OR if there are fewer than 2 distinct non-matching words, it is considered echo
  const isEcho = overlapRatio >= threshold || unmatchedWords.length < 2

  return {
    isEcho,
    overlapRatio,
    nonMatchingWordCount: unmatchedWords.length,
    matchedWords,
    unmatchedWords,
  }
}

/**
 * Barge-in evaluation rule:
 * Returns true if the user spoke at least 2 interim words while Jarvis was speaking,
 * OR if the microphone level exceeded threshold for at least 300ms.
 *
 * When recentSpokenSentences is provided (headphones voice interrupt mode),
 * it also enforces echo-overlap rejection.
 */
export function checkBargeInCondition(params: {
  isSpeaking: boolean
  interimTranscript?: string
  micVolumeExceededDurationMs?: number
  volumeThresholdMs?: number
  minInterimWords?: number
  recentSpokenSentences?: SpokenSentenceItem[]
  spokenSentences?: SpokenSentenceItem[]
}): boolean {
  if (!params.isSpeaking) return false

  const minWords = params.minInterimWords ?? 2
  if (params.interimTranscript) {
    const rawWords = params.interimTranscript.trim().split(/\s+/).filter(Boolean)
    if (rawWords.length >= minWords) {
      const sentences = params.recentSpokenSentences || params.spokenSentences
      if (sentences && sentences.length > 0) {
        const echoCheck = checkEchoOverlap(
          params.interimTranscript,
          sentences,
          0.6
        )
        if (echoCheck.isEcho) {
          return false
        }
      }
      return true
    }
  }

  const duration = params.micVolumeExceededDurationMs ?? 0
  const threshold = params.volumeThresholdMs ?? 300
  if (duration >= threshold) {
    return true
  }

  return false
}

/**
 * Standard getUserMedia constraints enforcing hardware echo protection
 * so JARVIS does not pick up its own loudspeaker output.
 */
export function getEchoProtectedMediaConstraints(): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    video: false,
  }
}
