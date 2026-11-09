/**
 * Procedural Lofi Synthesizer using the Web Audio API
 * 100% synthesized in code — zero external audio files.
 * Generates chill chords, basslines, vinyl crackle, and dynamic rain filtering.
 * Respects browser autoplay policy (starts muted).
 */

export interface LofiMood {
  tempoBpm: number
  filterCutoff: number
  rainVolume: number
  vinylVolume: number
  chordsVolume: number
}

class LofiAudioEngine {
  private ctx: AudioContext | null = null
  private isPlaying = false
  private isMuted = true
  private masterGain: GainNode | null = null
  private chordsGain: GainNode | null = null
  private vinylGain: GainNode | null = null
  private rainGain: GainNode | null = null
  private filterNode: BiquadFilterNode | null = null
  private timer: NodeJS.Timeout | null = null
  private currentStep = 0

  // Jazz chord progressions in Hz (Root, 3rd, 5th, 7th, 9th)
  // Dm9 -> G13 -> Cmaj9 -> Am9
  private progressions = [
    [146.83, 220.0, 261.63, 329.63], // Dm9
    [196.0, 246.94, 329.63, 392.0], // G13
    [130.81, 196.0, 246.94, 293.66], // Cmaj9
    [110.0, 164.81, 220.0, 261.63], // Am9
  ]

  private bassNotes = [73.42, 98.0, 65.41, 55.0] // D2, G2, C2, A1

  private initContext(): boolean {
    if (this.ctx) return true
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      if (!AudioCtx) return false

      this.ctx = new AudioCtx()

      // Master output
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : 0.45,
        this.ctx.currentTime
      )

      // Master lowpass filter for warm lofi sound
      this.filterNode = this.ctx.createBiquadFilter()
      this.filterNode.type = 'lowpass'
      this.filterNode.frequency.setValueAtTime(1400, this.ctx.currentTime)
      this.filterNode.Q.setValueAtTime(1.5, this.ctx.currentTime)

      this.masterGain.connect(this.filterNode)
      this.filterNode.connect(this.ctx.destination)

      // Sub-gains
      this.chordsGain = this.ctx.createGain()
      this.chordsGain.gain.setValueAtTime(0.35, this.ctx.currentTime)
      this.chordsGain.connect(this.masterGain)

      this.vinylGain = this.ctx.createGain()
      this.vinylGain.gain.setValueAtTime(0.08, this.ctx.currentTime)
      this.vinylGain.connect(this.masterGain)

      this.rainGain = this.ctx.createGain()
      this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime)
      this.rainGain.connect(this.masterGain)

      this.startVinylNoise()
      this.startRainNoise()

      return true
    } catch {
      return false
    }
  }

  // White noise generator filtered for vinyl crackle
  private startVinylNoise() {
    if (!this.ctx || !this.vinylGain) return
    const bufferSize = this.ctx.sampleRate * 2
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      // Occasional crackle burst
      const isPop = Math.random() < 0.001
      data[i] = isPop
        ? (Math.random() * 2 - 1) * 0.8
        : (Math.random() * 2 - 1) * 0.03
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true

    const bandpass = this.ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.setValueAtTime(2200, this.ctx.currentTime)
    bandpass.Q.setValueAtTime(2.0, this.ctx.currentTime)

    noise.connect(bandpass)
    bandpass.connect(this.vinylGain)
    noise.start()
  }

  // Pink noise generator for gentle rain
  private startRainNoise() {
    if (!this.ctx || !this.rainGain) return
    const bufferSize = this.ctx.sampleRate * 2
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04
      b6 = white * 0.115926
    }

    const rainNoise = this.ctx.createBufferSource()
    rainNoise.buffer = buffer
    rainNoise.loop = true

    const rainFilter = this.ctx.createBiquadFilter()
    rainFilter.type = 'lowpass'
    rainFilter.frequency.setValueAtTime(900, this.ctx.currentTime)

    rainNoise.connect(rainFilter)
    rainFilter.connect(this.rainGain)
    rainNoise.start()
  }

  // Play a soft electric piano chord
  private playChord(chord: number[], bassFreq: number, duration: number) {
    if (!this.ctx || !this.chordsGain) return
    const now = this.ctx.currentTime

    // Play chord tones with soft warm triangle/sine blend
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.chordsGain) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq, now)

      // Slight detune for analog warmth
      osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now)

      // ADSR Envelope
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.08, now + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.04, now + duration * 0.6)
      gain.gain.linearRampToValueAtTime(0.0001, now + duration)

      osc.connect(gain)
      gain.connect(this.chordsGain)

      osc.start(now)
      osc.stop(now + duration + 0.1)
    })

    // Play bass note
    const bassOsc = this.ctx.createOscillator()
    const bassGain = this.ctx.createGain()
    bassOsc.type = 'sine'
    bassOsc.frequency.setValueAtTime(bassFreq, now)

    bassGain.gain.setValueAtTime(0, now)
    bassGain.gain.linearRampToValueAtTime(0.12, now + 0.08)
    bassGain.gain.exponentialRampToValueAtTime(0.06, now + duration * 0.5)
    bassGain.gain.linearRampToValueAtTime(0.0001, now + duration)

    bassOsc.connect(bassGain)
    bassGain.connect(this.chordsGain)

    bassOsc.start(now)
    bassOsc.stop(now + duration + 0.1)
  }

  public setMuted(muted: boolean): boolean {
    this.isMuted = muted
    if (!muted && !this.ctx) {
      this.initContext()
    }
    if (this.ctx && this.masterGain) {
      if (this.ctx.state === 'suspended' && !muted) {
        void this.ctx.resume()
      }
      const targetGain = muted ? 0 : 0.45
      this.masterGain.gain.linearRampToValueAtTime(
        targetGain,
        this.ctx.currentTime + 0.2
      )
    }

    if (!muted && !this.isPlaying) {
      this.startLoop()
    }

    return !this.isMuted
  }

  public getIsMuted(): boolean {
    return this.isMuted
  }

  public toggleMute(): boolean {
    return this.setMuted(!this.isMuted)
  }

  public setWeather(weather: string) {
    if (!this.ctx || !this.rainGain) return
    const now = this.ctx.currentTime
    let targetRain = 0
    if (weather === 'rain') targetRain = 0.18
    else if (weather === 'storm') targetRain = 0.32
    else if (weather === 'snow') targetRain = 0.05

    this.rainGain.gain.linearRampToValueAtTime(targetRain, now + 1.0)
  }

  public setTimeOfDay(time: 'dawn' | 'day' | 'dusk' | 'night') {
    if (!this.ctx || !this.filterNode) return
    const now = this.ctx.currentTime
    let cutoff = 1400
    if (time === 'night') cutoff = 950
    else if (time === 'dusk') cutoff = 1200
    else if (time === 'dawn') cutoff = 1300
    else cutoff = 1600

    this.filterNode.frequency.linearRampToValueAtTime(cutoff, now + 1.5)
  }

  public startLoop() {
    if (this.isPlaying) return
    this.isPlaying = true

    const stepDurationMs = 2800 // ~85 BPM tempo
    const runStep = () => {
      if (!this.isPlaying) return
      const chordIdx = this.currentStep % this.progressions.length
      const chord = this.progressions[chordIdx]
      const bass = this.bassNotes[chordIdx]

      if (!this.isMuted) {
        this.playChord(chord, bass, stepDurationMs / 1000)
      }

      this.currentStep++
      this.timer = setTimeout(runStep, stepDurationMs)
    }

    runStep()
  }

  public stopLoop() {
    this.isPlaying = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  // Play a soft elevator chime (ding-dong: 523Hz -> 659Hz)
  public playElevatorChime() {
    if (this.isMuted || !this.ctx) return
    try {
      const now = this.ctx.currentTime
      const osc1 = this.ctx.createOscillator()
      const gain1 = this.ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(523.25, now) // C5
      gain1.gain.setValueAtTime(0.18, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
      osc1.connect(gain1)
      gain1.connect(this.masterGain!)
      osc1.start(now)
      osc1.stop(now + 0.6)

      const osc2 = this.ctx.createOscillator()
      const gain2 = this.ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(659.25, now + 0.2) // E5
      gain2.gain.setValueAtTime(0, now)
      gain2.gain.setValueAtTime(0.22, now + 0.2)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
      osc2.connect(gain2)
      gain2.connect(this.masterGain!)
      osc2.start(now + 0.2)
      osc2.stop(now + 0.9)
    } catch {}
  }
}

export const lofiAudio = new LofiAudioEngine()
