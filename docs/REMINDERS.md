# JARVIS Reminders, Incoming Calls & Telephony Channels (Phase K8)

This document specifies the architecture, data models, delivery guarantees, and telephony provider analysis for JARVIS reminders in EasyUp Software Solution HQ.

---

## 1. Core Architecture & Time Calculation

All reminder time computations are deterministic and executed strictly in code (`src/lib/reminders/parse.ts`) using the **Asia/Manila (PHT, UTC+8)** timezone.

- **Server-Agnostic PHT Math**: Cloud deployment servers (e.g. Vercel) execute in UTC (`Date.now()`). The parser maps calendar years, months, days, hours, and minutes explicitly via `Intl.DateTimeFormat` with `timeZone: 'Asia/Manila'`.
- **Next-Day Rollover Policy**: When an operator requests an hour that has already passed today (e.g., asking for "2:00 PM" at 5:30 PM PHT), JARVIS automatically schedules for the next day's 2:00 PM and explicitly clarifies this in the verbal read-back.
- **Read-Back Confirmation**: Before persisting any reminder, JARVIS recites the exact date and time in words and numbers:
  > *"I will call you today, Thursday 12 November, at 2:00 PM Philippine time. Shall I?"*

---

## 2. In-App Incoming Call Experience

When a reminder triggers while the application is active:
1. **Full-Screen Incoming Call Modal**: `IncomingCallOverlay.tsx` displays in JARVIS dark-cyan holographic aesthetics.
2. **Web Audio Ringtone**: Synthesizes a pulsing 880 Hz harmonic chime using pure browser `AudioContext` and `OscillatorNode` (no external MP3/audio files).
3. **Voice Interaction**:
   - **Answer**: JARVIS vocalizes the reminder title and message using Speech Synthesis.
   - **Two-Way Voice**: The speech recognition loop listens for operator closing phrases ("I'm done", "Thank you", "Hang up").
   - **Snooze / Decline**: Operator can snooze for 10 minutes (configurable in settings) or cancel.

---

## 3. Web Push & Offline Delivery

When the browser tab is closed or in background:
- **Service Worker Web Push**: Dispatches standard web-push notification via VAPID (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
- **Atomic Occurrence Claiming**: Uses atomic conditional updates on `office_reminders` (`status = 'due'`, unique `occurrence_key`) to ensure that multiple open tabs or scheduled cron ticks never trigger duplicate calls.
- **Honest Missed-Call Catch-Up**: If a due reminder could not be delivered (e.g. device was offline during due window), it is marked `missed` with an event in `office_reminder_events`. On the next application launch, an unacknowledged missed-call banner alerts the operator:
  > *"You missed a call from JARVIS scheduled for 2:00 PM."*

---

## 4. Telephony & Provider Analysis (Philippines / PHT)

### Paid Provider Investigation: Twilio (Voice & SMS in the Philippines)

1. **Philippines SMS Regulations & Sender ID**:
   - **NTC Regulatory Compliance**: The National Telecommunications Commission (NTC) of the Philippines requires pre-registration for all Alphanumeric Sender IDs and Application-to-Person (A2P) traffic under the SIM Registration Act.
   - **Twilio SMS Support**: Twilio supports SMS to the Philippines, but unverified international long codes experience heavy carrier filtering (Globe, Smart, DITO). Standard local SMS rates run approximately **\$0.045 to \$0.075 USD per SMS**, plus registration fees for custom Alphanumeric Sender IDs.
2. **Twilio Programmable Voice**:
   - Outbound voice calls to Philippine mobile numbers (+63 9xx) cost approximately **\$0.14 to \$0.22 USD per minute**.
   - Requires verified caller ID or Twilio local/toll-free number where available.
3. **Implementation Decision**:
   - To prevent surprise billing and protect the user from unsolicited telecommunication charges, the **Phone/SMS provider adapter is implemented as a disabled feature flag (`phoneSmsEnabled: false`)** behind an explicit settings confirmation dialog.
   - All immediate alerts are provided for free via **In-App Web Audio Calls**, **Browser Web Push**, and optional zero-cost **Telegram Bot** and **Discord Webhooks**.

---

## 5. Free Alternative Channels

- **Telegram Bot (`@ai_office_bot`)**:
  - Requires `TELEGRAM_BOT_TOKEN` in server environment.
  - Sends immediate direct messages to the operator's personal Telegram chat.
- **Discord Webhook**:
  - Requires `DISCORD_WEBHOOK_URL` in server environment.
  - Posts rich embeds with reminder titles, notes, and direct app links.
