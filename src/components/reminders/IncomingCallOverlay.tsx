'use client'

import React, { useState, useEffect } from 'react'
import {
  reminderManager,
  OfficeReminderRecord,
} from '@/lib/reminders/reminderEngine'
import { Phone, PhoneOff, Clock, Volume2, Mic, CheckCircle2 } from 'lucide-react'

interface IncomingCallOverlayProps {
  onCallEnded?: () => void
}

export function IncomingCallOverlay({ onCallEnded }: IncomingCallOverlayProps) {
  const [ringingReminder, setRingingReminder] = useState<OfficeReminderRecord | null>(() =>
    reminderManager.getCurrentRingingReminder()
  )
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>('ringing')
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
  const [transcript, setTranscript] = useState<string>('')

  useEffect(() => {
    // Subscribe to reminder updates
    const unsubscribe = reminderManager.subscribe(() => {
      const active = reminderManager.getCurrentRingingReminder()
      setRingingReminder(active)
      if (!active) {
        setCallState('ended')
      } else {
        setCallState('ringing')
      }
    })

    return () => {
      unsubscribe()
      reminderManager.stopSynthesizedRingtone()
    }
  }, [])

  const handleAnswer = () => {
    if (!ringingReminder) return
    reminderManager.answerCall(ringingReminder.id)
    setCallState('connected')

    // Speak the reminder message using SpeechSynthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(
        `Hello Josiah. Reminder: ${ringingReminder.title}. ${ringingReminder.message}`
      )
      utterance.rate = 1.05
      utterance.pitch = 0.95

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        // Start listening for operator feedback if webkitSpeechRecognition exists
        startListeningForDone()
      }
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    }
  }

  const startListeningForDone = () => {
    if (typeof window === 'undefined') return
    interface SpeechEventItem {
      transcript: string
    }
    interface SpeechEventResult {
      [index: number]: SpeechEventItem
    }
    interface SpeechEvent {
      results: {
        [index: number]: SpeechEventResult
        length: number
      }
    }
    interface SpeechRecognizerInstance {
      continuous: boolean
      interimResults: boolean
      lang: string
      onresult: (event: SpeechEvent) => void
      start: () => void
    }
    interface SpeechRecognizerConstructor {
      new (): SpeechRecognizerInstance
    }

    const SpeechRec = (window as unknown as { webkitSpeechRecognition?: SpeechRecognizerConstructor; SpeechRecognition?: SpeechRecognizerConstructor }).webkitSpeechRecognition || (window as unknown as { SpeechRecognition?: SpeechRecognizerConstructor }).SpeechRecognition
    if (!SpeechRec) return

    try {
      const recognition = new SpeechRec()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: SpeechEvent) => {
        let text = ''
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i]?.[0]?.transcript) {
            text += event.results[i][0].transcript
          }
        }
        setTranscript(text)

        if (/done|thank|hang\s*up|bye|okay|acknowledged/i.test(text)) {
          handleEndCall()
        }
      }

      recognition.start()
    } catch {
      // no-op
    }
  }

  const handleDecline = () => {
    if (!ringingReminder) return
    reminderManager.declineCall(ringingReminder.id, 'snooze')
    setCallState('ended')
    onCallEnded?.()
  }

  const handleSnooze = () => {
    if (!ringingReminder) return
    reminderManager.snoozeReminder(ringingReminder.id, 10)
    setCallState('ended')
    onCallEnded?.()
  }

  const handleEndCall = () => {
    if (ringingReminder) {
      reminderManager.acknowledgeReminder(ringingReminder.id)
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setCallState('ended')
    onCallEnded?.()
  }

  if (!ringingReminder || callState === 'ended') {
    return null
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-8 text-center shadow-[0_0_80px_rgba(6,182,212,0.35)] animate-in zoom-in-95 duration-200">
          {/* Glowing Arc Reactor Call Pulse */}
          <div className="relative mx-auto mb-6 flex h-36 w-36 items-center justify-center">
            {callState === 'ringing' ? (
              <>
                <div className="absolute inset-0 animate-ping rounded-full border-2 border-cyan-400/30" />
                <div className="absolute -inset-4 animate-pulse rounded-full border border-cyan-500/20 shadow-[0_0_40px_rgba(6,182,212,0.4)]" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-cyan-400 bg-cyan-950/60 shadow-[inset_0_0_30px_rgba(6,182,212,0.6)]">
                  <Phone className="h-12 w-12 animate-bounce text-cyan-300" />
                </div>
              </>
            ) : (
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-950/60 shadow-[0_0_35px_rgba(16,185,129,0.5)]">
                {isSpeaking ? (
                  <Volume2 className="h-12 w-12 animate-pulse text-emerald-300" />
                ) : (
                  <Mic className="h-12 w-12 animate-pulse text-cyan-300" />
                )}
              </div>
            )}
          </div>

          {/* Caller Identification */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-cyan-300 uppercase">
              <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400" />
              {callState === 'ringing' ? 'Incoming Call from JARVIS' : 'Call in Progress · JARVIS Voice'}
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white">
              {ringingReminder.title}
            </h2>

            <p className="mx-auto max-w-sm text-sm text-slate-300">
              {ringingReminder.message}
            </p>

            {transcript && (
              <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-xs text-cyan-200 italic">
                &ldquo;{transcript}&rdquo;
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8">
            {callState === 'ringing' ? (
              <div className="flex items-center justify-center gap-4">
                {/* Snooze Button */}
                <button
                  type="button"
                  onClick={handleSnooze}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-300 transition-all hover:bg-amber-500/20 active:scale-95"
                >
                  <Clock className="h-5 w-5" />
                  <span>Snooze (10m)</span>
                </button>

                {/* Decline Button */}
                <button
                  type="button"
                  onClick={handleDecline}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-5 py-3 text-xs font-medium text-rose-300 transition-all hover:bg-rose-500/20 active:scale-95"
                >
                  <PhoneOff className="h-5 w-5" />
                  <span>Decline</span>
                </button>

                {/* Answer Button */}
                <button
                  type="button"
                  onClick={handleAnswer}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-gradient-to-r from-emerald-500 to-teal-600 px-7 py-3 text-xs font-semibold text-white shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all hover:brightness-110 active:scale-95"
                >
                  <Phone className="h-5 w-5 animate-bounce" />
                  <span>Answer Call</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleEndCall}
                  className="flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-600/90 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all hover:bg-rose-600 active:scale-95"
                >
                  <PhoneOff className="h-4 w-4" />
                  <span>End Call</span>
                </button>

                <button
                  type="button"
                  onClick={handleEndCall}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20 active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Done / Acknowledge</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
