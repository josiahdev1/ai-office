import { describe, it, expect } from 'vitest'
import {
  voiceStateReducer,
  INITIAL_VOICE_STATE,
  checkBargeInCondition,
  getEchoProtectedMediaConstraints,
  VoiceStateMachineState,
} from '@/lib/jarvis/voiceState'

describe('JARVIS V2 Voice State Machine (Phase J10)', () => {
  it('initializes to idle state with zero barge-ins', () => {
    expect(INITIAL_VOICE_STATE.current).toBe('idle')
    expect(INITIAL_VOICE_STATE.previous).toBeNull()
    expect(INITIAL_VOICE_STATE.bargeInCount).toBe(0)
    expect(INITIAL_VOICE_STATE.errorMessage).toBeNull()
  })

  it('transitions idle -> listening on MIC_OPEN', () => {
    const s1 = voiceStateReducer(INITIAL_VOICE_STATE, { type: 'MIC_OPEN' })
    expect(s1.current).toBe('listening')
    expect(s1.previous).toBe('idle')
  })

  it('transitions idle -> listening on USER_SPEECH_START', () => {
    const s1 = voiceStateReducer(INITIAL_VOICE_STATE, { type: 'USER_SPEECH_START' })
    expect(s1.current).toBe('listening')
    expect(s1.previous).toBe('idle')
  })

  it('updates interim transcript while in listening state', () => {
    let state = voiceStateReducer(INITIAL_VOICE_STATE, { type: 'MIC_OPEN' })
    state = voiceStateReducer(state, {
      type: 'INTERIM_TRANSCRIPT',
      transcript: 'status briefing',
    })
    expect(state.current).toBe('listening')
    expect(state.interimTranscript).toBe('status briefing')
  })

  it('transitions listening -> thinking on TRANSCRIPT_FINALIZED and clears interim', () => {
    let state = voiceStateReducer(INITIAL_VOICE_STATE, { type: 'MIC_OPEN' })
    state = voiceStateReducer(state, {
      type: 'INTERIM_TRANSCRIPT',
      transcript: 'deploy new feature',
    })
    state = voiceStateReducer(state, {
      type: 'TRANSCRIPT_FINALIZED',
      transcript: 'deploy new feature',
    })
    expect(state.current).toBe('thinking')
    expect(state.previous).toBe('listening')
    expect(state.finalTranscript).toBe('deploy new feature')
    expect(state.interimTranscript).toBe('')
  })

  it('transitions thinking -> executing on EXECUTION_START', () => {
    const thinkingState: VoiceStateMachineState = {
      ...INITIAL_VOICE_STATE,
      current: 'thinking',
    }
    const state = voiceStateReducer(thinkingState, {
      type: 'EXECUTION_START',
      planTitle: 'Automated Fleet Optimization',
    })
    expect(state.current).toBe('executing')
    expect(state.previous).toBe('thinking')
  })

  it('transitions executing -> speaking on REPLY_READY or SPEECH_START', () => {
    const execState: VoiceStateMachineState = {
      ...INITIAL_VOICE_STATE,
      current: 'executing',
    }
    const s1 = voiceStateReducer(execState, { type: 'REPLY_READY' })
    expect(s1.current).toBe('speaking')
    expect(s1.previous).toBe('executing')

    const s2 = voiceStateReducer(execState, { type: 'SPEECH_START' })
    expect(s2.current).toBe('speaking')
  })

  it('transitions speaking -> idle on SPEECH_END', () => {
    const speakingState: VoiceStateMachineState = {
      ...INITIAL_VOICE_STATE,
      current: 'speaking',
    }
    const state = voiceStateReducer(speakingState, { type: 'SPEECH_END' })
    expect(state.current).toBe('idle')
    expect(state.previous).toBe('speaking')
  })

  it('handles BARGE-IN: speaking -> listening instantly, increments bargeInCount', () => {
    const speakingState: VoiceStateMachineState = {
      ...INITIAL_VOICE_STATE,
      current: 'speaking',
      bargeInCount: 0,
    }

    const state = voiceStateReducer(speakingState, {
      type: 'BARGE_IN',
      reason: 'interim_words',
    })
    expect(state.current).toBe('listening')
    expect(state.previous).toBe('speaking')
    expect(state.bargeInCount).toBe(1)
  })

  it('handles USER_SPEECH_START while speaking as a barge-in event', () => {
    const speakingState: VoiceStateMachineState = {
      ...INITIAL_VOICE_STATE,
      current: 'speaking',
      bargeInCount: 2,
    }

    const state = voiceStateReducer(speakingState, { type: 'USER_SPEECH_START' })
    expect(state.current).toBe('listening')
    expect(state.previous).toBe('speaking')
    expect(state.bargeInCount).toBe(3)
  })

  it('transitions to error on ERROR from any state, and recovers to idle', () => {
    const state1 = voiceStateReducer(INITIAL_VOICE_STATE, {
      type: 'ERROR',
      error: 'Microphone access denied',
    })
    expect(state1.current).toBe('error')
    expect(state1.errorMessage).toBe('Microphone access denied')

    const state2 = voiceStateReducer(state1, { type: 'RECOVER' })
    expect(state2.current).toBe('idle')
    expect(state2.errorMessage).toBeNull()
  })

  describe('checkBargeInCondition', () => {
    it('returns false if Jarvis is not speaking', () => {
      expect(
        checkBargeInCondition({
          isSpeaking: false,
          interimTranscript: 'stop talking',
        })
      ).toBe(false)
    })

    it('returns false if speaking but interim transcript has fewer than 2 words', () => {
      expect(
        checkBargeInCondition({
          isSpeaking: true,
          interimTranscript: 'wait',
        })
      ).toBe(false)
    })

    it('returns true if speaking and interim transcript has 2 or more words', () => {
      expect(
        checkBargeInCondition({
          isSpeaking: true,
          interimTranscript: 'hold on',
        })
      ).toBe(true)

      expect(
        checkBargeInCondition({
          isSpeaking: true,
          interimTranscript: 'Jarvis please pause',
        })
      ).toBe(true)
    })

    it('returns true if speaking and mic volume duration exceeds 300ms', () => {
      expect(
        checkBargeInCondition({
          isSpeaking: true,
          micVolumeExceededDurationMs: 250,
          volumeThresholdMs: 300,
        })
      ).toBe(false)

      expect(
        checkBargeInCondition({
          isSpeaking: true,
          micVolumeExceededDurationMs: 350,
          volumeThresholdMs: 300,
        })
      ).toBe(true)
    })
  })

  describe('getEchoProtectedMediaConstraints', () => {
    it('enforces hardware echoCancellation, noiseSuppression, and autoGainControl', () => {
      const constraints = getEchoProtectedMediaConstraints()
      expect(constraints.video).toBe(false)
      const audio = constraints.audio as MediaTrackConstraints
      expect(audio.echoCancellation).toBe(true)
      expect(audio.noiseSuppression).toBe(true)
      expect(audio.autoGainControl).toBe(true)
    })
  })
})
