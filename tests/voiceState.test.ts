import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  voiceStateReducer,
  INITIAL_VOICE_STATE,
  checkBargeInCondition,
  checkEchoOverlap,
  getEchoProtectedMediaConstraints,
  VoiceStateMachineState,
} from '@/lib/jarvis/voiceState'

describe('JARVIS V2 Voice State Machine (Phase J10 Revised)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes to idle state with zero barge-ins and empty history', () => {
    expect(INITIAL_VOICE_STATE.current).toBe('idle')
    expect(INITIAL_VOICE_STATE.previous).toBeNull()
    expect(INITIAL_VOICE_STATE.bargeInCount).toBe(0)
    expect(INITIAL_VOICE_STATE.errorMessage).toBeNull()
    expect(INITIAL_VOICE_STATE.history).toEqual([])
  })

  it('transitions idle -> listening on MIC_OPEN and records transition history', () => {
    const s1 = voiceStateReducer(INITIAL_VOICE_STATE, {
      type: 'MIC_OPEN',
      reason: 'User clicked mic button',
      liveValues: { micOpen: true, micLevel: 0.4 },
    })
    expect(s1.current).toBe('listening')
    expect(s1.previous).toBe('idle')
    expect(s1.history.length).toBe(1)
    expect(s1.history[0].from).toBe('idle')
    expect(s1.history[0].to).toBe('listening')
    expect(s1.history[0].reason).toBe('User clicked mic button')
    expect(s1.history[0].liveValues.micOpen).toBe(true)
  })

  it('transitions idle -> listening on USER_SPEECH_START', () => {
    const s1 = voiceStateReducer(INITIAL_VOICE_STATE, { type: 'USER_SPEECH_START' })
    expect(s1.current).toBe('listening')
    expect(s1.previous).toBe('idle')
    expect(s1.history[0].to).toBe('listening')
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
    expect(state.history[0].to).toBe('thinking')
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
    expect(state.history[0].reason).toContain('Automated Fleet Optimization')
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
    expect(state.history[0].to).toBe('idle')
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
    expect(state.history[0].reason).toBe('BARGE_IN (interim_words)')
  })

  it('handles SPACE_INTERRUPT: stops speaking immediately and goes to listening', () => {
    const speakingState: VoiceStateMachineState = {
      ...INITIAL_VOICE_STATE,
      current: 'speaking',
      bargeInCount: 0,
    }

    const state = voiceStateReducer(speakingState, {
      type: 'SPACE_INTERRUPT',
      liveValues: { speechSynthesisSpeaking: false },
    })
    expect(state.current).toBe('listening')
    expect(state.previous).toBe('speaking')
    expect(state.bargeInCount).toBe(1)
    expect(state.history[0].reason).toContain('SPACE_INTERRUPT')
  })

  it('watchdog: transitions speaking -> idle if no audio is playing for >1000ms', () => {
    const speakingState: VoiceStateMachineState = {
      ...INITIAL_VOICE_STATE,
      current: 'speaking',
    }

    const state = voiceStateReducer(speakingState, {
      type: 'WATCHDOG_TIMEOUT',
      reason: 'speaking_no_playback',
    })
    expect(state.current).toBe('idle')
    expect(state.previous).toBe('speaking')
    expect(state.history[0].reason).toContain('speaking_no_playback')
  })

  it('watchdog: transitions listening -> idle if mic is closed', () => {
    const listeningState: VoiceStateMachineState = {
      ...INITIAL_VOICE_STATE,
      current: 'listening',
    }

    const state = voiceStateReducer(listeningState, {
      type: 'WATCHDOG_TIMEOUT',
      reason: 'listening_mic_closed',
    })
    expect(state.current).toBe('idle')
    expect(state.previous).toBe('listening')
    expect(state.history[0].reason).toContain('listening_mic_closed')
  })

  it('maintains a rolling buffer of max 30 transition records in history', () => {
    let state = INITIAL_VOICE_STATE
    for (let i = 0; i < 40; i++) {
      state = voiceStateReducer(state, {
        type: i % 2 === 0 ? 'MIC_OPEN' : 'RESET',
        reason: `Step ${i}`,
      })
    }
    expect(state.history.length).toBe(30)
    expect(state.history[0].reason).toBe('Step 39')
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

  describe('checkEchoOverlap (Acoustic Echo Filter)', () => {
    const jarvisRecentSpeech = [
      'Welcome inside The Brain Core Josiah all 24 agents are active and ready for instructions',
      'I have set the chronometer and will ping you when complete',
    ]

    it('identifies acoustic echo when transcript overlaps >60% with JARVIS spoken text', () => {
      // Transcript is JARVIS's own sentence heard through the speakers
      const echoTranscript = 'welcome inside the brain core josiah all 24 agents'
      const result = checkEchoOverlap(echoTranscript, jarvisRecentSpeech, 0.6)
      expect(result.isEcho).toBe(true)
      expect(result.overlapRatio).toBeGreaterThanOrEqual(0.6)
      expect(result.nonMatchingWordCount).toBeLessThan(2)
    })

    it('allows user voice through when spoken sentence has >= 2 non-matching words and low overlap', () => {
      // User says something completely different: "Jarvis stop what you are doing"
      const userCommand = 'Jarvis cancel the current mission and status report'
      const result = checkEchoOverlap(userCommand, jarvisRecentSpeech, 0.6)
      expect(result.isEcho).toBe(false)
      expect(result.nonMatchingWordCount).toBeGreaterThanOrEqual(2)
    })

    it('rejects single-word spurious noises even if different', () => {
      // Spurious 1-word mic blip: "hey"
      const singleWord = 'hey'
      const result = checkEchoOverlap(singleWord, jarvisRecentSpeech, 0.6)
      expect(result.isEcho).toBe(true)
      expect(result.nonMatchingWordCount).toBe(1)
    })
  })

  describe('checkBargeInCondition with Echo Protection', () => {
    const recentSentences = [
      'Telemetry synchronized for all engineering workstations',
    ]

    it('rejects barge-in when heard text is echo of JARVIS speech', () => {
      expect(
        checkBargeInCondition({
          isSpeaking: true,
          interimTranscript: 'telemetry synchronized for all engineering',
          recentSpokenSentences: recentSentences,
        })
      ).toBe(false)
    })

    it('triggers barge-in when heard text is a new user command', () => {
      expect(
        checkBargeInCondition({
          isSpeaking: true,
          interimTranscript: 'Jarvis please pause playback',
          recentSpokenSentences: recentSentences,
        })
      ).toBe(true)
    })

    it('triggers barge-in on mic volume duration >= 300ms', () => {
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
