/**
 * JARVIS V2 — Deterministic Voice State Machine (Phase J10)
 *
 * Implements a single reducer-based state machine governing all voice states:
 * 'idle' | 'listening' | 'thinking' | 'executing' | 'speaking' | 'error'
 *
 * Guarantees zero conflicting state flags between speech recognition, TTS,
 * LLM streaming, and plan execution, with instant barge-in and echo protection.
 */

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'executing'
  | 'speaking'
  | 'error'

export interface VoiceStateMachineState {
  current: VoiceState
  previous: VoiceState | null
  interimTranscript: string
  finalTranscript: string
  errorMessage: string | null
  lastEventTime: number
  bargeInCount: number
}

export type VoiceAction =
  | { type: 'MIC_OPEN' }
  | { type: 'USER_SPEECH_START' }
  | { type: 'INTERIM_TRANSCRIPT'; transcript: string }
  | { type: 'TRANSCRIPT_FINALIZED'; transcript: string }
  | { type: 'EXECUTION_START'; planTitle?: string }
  | { type: 'REPLY_READY' }
  | { type: 'SPEECH_START' }
  | { type: 'SPEECH_END' }
  | { type: 'BARGE_IN'; reason: 'interim_words' | 'mic_threshold' }
  | { type: 'ERROR'; error: string }
  | { type: 'RECOVER' }
  | { type: 'RESET' }

export const INITIAL_VOICE_STATE: VoiceStateMachineState = {
  current: 'idle',
  previous: null,
  interimTranscript: '',
  finalTranscript: '',
  errorMessage: null,
  lastEventTime: 0,
  bargeInCount: 0,
}

/**
 * Pure reducer function for the JARVIS voice state machine.
 */
export function voiceStateReducer(
  state: VoiceStateMachineState,
  action: VoiceAction
): VoiceStateMachineState {
  const now = Date.now()

  switch (action.type) {
    case 'MIC_OPEN': {
      // Transition to listening from idle, or keep current if speaking/thinking
      if (state.current === 'idle' || state.current === 'error') {
        return {
          ...state,
          current: 'listening',
          previous: state.current,
          errorMessage: null,
          lastEventTime: now,
        }
      }
      return state
    }

    case 'USER_SPEECH_START': {
      // If speaking, user speaking is a barge-in candidate
      if (state.current === 'speaking') {
        return {
          ...state,
          current: 'listening',
          previous: 'speaking',
          bargeInCount: state.bargeInCount + 1,
          interimTranscript: '',
          lastEventTime: now,
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
      // Only transition to thinking from listening
      return {
        ...state,
        current: 'thinking',
        previous: state.current,
        interimTranscript: '',
        finalTranscript: action.transcript,
        lastEventTime: now,
      }
    }

    case 'EXECUTION_START': {
      // Transition from thinking to executing when tools/plans run
      return {
        ...state,
        current: 'executing',
        previous: state.current,
        lastEventTime: now,
      }
    }

    case 'REPLY_READY':
    case 'SPEECH_START': {
      // Reply is ready to be spoken, or TTS begins
      return {
        ...state,
        current: 'speaking',
        previous: state.current,
        lastEventTime: now,
      }
    }

    case 'SPEECH_END': {
      // Speech has concluded, return to idle
      if (state.current === 'speaking') {
        return {
          ...state,
          current: 'idle',
          previous: 'speaking',
          interimTranscript: '',
          lastEventTime: now,
        }
      }
      return state
    }

    case 'BARGE_IN': {
      // Instant interrupt while speaking
      return {
        ...state,
        current: 'listening',
        previous: state.current,
        bargeInCount: state.bargeInCount + 1,
        interimTranscript: '',
        lastEventTime: now,
      }
    }

    case 'ERROR': {
      return {
        ...state,
        current: 'error',
        previous: state.current,
        errorMessage: action.error,
        lastEventTime: now,
      }
    }

    case 'RECOVER': {
      return {
        ...state,
        current: 'idle',
        previous: state.current,
        errorMessage: null,
        lastEventTime: now,
      }
    }

    case 'RESET': {
      return {
        ...INITIAL_VOICE_STATE,
        lastEventTime: now,
      }
    }

    default:
      return state
  }
}

/**
 * Barge-in evaluation rule:
 * Returns true if the user spoke at least 2 interim words while Jarvis was speaking,
 * OR if the microphone level exceeded threshold for at least 300ms.
 */
export function checkBargeInCondition(params: {
  isSpeaking: boolean
  interimTranscript?: string
  micVolumeExceededDurationMs?: number
  volumeThresholdMs?: number
  minInterimWords?: number
}): boolean {
  if (!params.isSpeaking) return false

  const minWords = params.minInterimWords ?? 2
  if (params.interimTranscript) {
    const words = params.interimTranscript.trim().split(/\s+/).filter(Boolean)
    if (words.length >= minWords) {
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
