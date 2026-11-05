'use client'

import React from 'react'
import { FacingDirection, AgentPose } from './types'

export interface PixelSpriteProps {
  id: string
  name?: string
  color?: string
  hair?: string
  skin?: string
  size?: number
  isWalking?: boolean
  walkFrame?: number
  isTyping?: boolean
  typeFrame?: number // 0, 1, 2 for 3-frame dynamic typing
  facing?: FacingDirection | 'left' | 'right'
  pose?: AgentPose
  hasCoffee?: boolean
  isSeated?: boolean
  activity?: string
  className?: string
}

export function PixelSprite({
  id,
  color = '#3b82f6',
  hair = '#1e293b',
  skin = '#fcd34d',
  size = 38,
  isWalking = false,
  walkFrame = 0,
  isTyping = false,
  typeFrame,
  facing = 'SE',
  pose,
  hasCoffee = false,
  isSeated = false,
  activity,
  className = '',
}: PixelSpriteProps) {
  // Normalize facing direction
  const normalizedFacing: FacingDirection =
    facing === 'left' ? 'SW' : facing === 'right' ? 'SE' : (facing as FacingDirection) || 'SE'

  const isBackView = normalizedFacing === 'NW' || normalizedFacing === 'NE'
  // When facing NW or SW, we mirror the canonical NE / SE sprite along horizontal axis
  const isFlipped = normalizedFacing === 'NW' || normalizedFacing === 'SW'

  // Walking leg shift (0 or 1)
  const legShift = isWalking ? (walkFrame % 2 === 0 ? 0 : 1) : 0

  // 3-Frame Dynamic Typing Animation
  const effectiveTypeFrame = (typeFrame !== undefined ? typeFrame : (walkFrame % 3)) % 3
  const isCurrentlyTyping = (isTyping || pose === 'type' || activity === 'typing') && !isWalking
  // Head bob down on frame 1
  const typeHeadBob = isCurrentlyTyping ? (effectiveTypeFrame === 1 ? 0.5 : 0) : 0

  // Activity poses
  const isGesturing =
    pose === 'gesture' ||
    activity === 'standing_discussion' ||
    activity === 'seated_meeting' ||
    activity === 'break_chat' ||
    activity === 'casual_chat'

  const isGymRunning =
    pose === 'gym' ||
    (activity !== undefined &&
      (activity.includes('treadmill') || activity.includes('running')))

  const isGymStrength =
    activity !== undefined &&
    (activity.includes('dumbbell') || activity.includes('yoga') || activity.includes('stretching'))

  const effectiveHasCoffee =
    hasCoffee ||
    pose === 'drink_coffee' ||
    activity === 'coffee_brewing' ||
    activity === 'lounge_coffee'

  // Agent-specific accessory configurations
  const isJosiah = id === 'josiah'
  const isArwin = id === 'arwin'
  const isNeilMar = id === 'neil_mar'
  const isNelmar = id === 'nelmar'
  const isBonnie = id === 'bonnie'
  const isJohnLloyd = id === 'john_lloyd'
  const isKhent = id === 'khent'
  const isJohnArvy = id === 'john_arvy'
  const isGian = id === 'gian'
  const isMaryGrace = id === 'mary_grace'
  const isAnthony = id === 'anthony'
  const isBlaze = id === 'blaze'
  const isFerwin = id === 'ferwin'
  const isJoVincent = id === 'jo_vincent'
  const isJesmond = id === 'jesmond'
  const isKin = id === 'kin'
  const isRoyJhan = id === 'roy_jhan'
  const isGabriel = id === 'gabriel'
  const isKeiru = id === 'keiru'
  const isRyan = id === 'ryan'
  const isGloria = id === 'gloria'
  const isJB = id === 'jb'
  const isJulian = id === 'julian'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 16"
      className={`pixelated ${className}`}
      style={{
        imageRendering: 'pixelated',
        transform: isFlipped ? 'scaleX(-1)' : 'none',
        transformOrigin: 'center center',
      }}
    >
      {/* Ground Shadow */}
      <ellipse
        cx="7"
        cy={isSeated ? 14.5 : 15.2}
        rx={isSeated ? 5 : 4.2}
        ry="0.9"
        fill="rgba(0,0,0,0.45)"
      />

      {isBackView ? (
        /* ==================== BACK VIEW (NE / NW) ==================== */
        <g>
          {/* Head & Cap from behind with bob animation */}
          <g transform={`translate(0, ${typeHeadBob})`}>
            {/* Top Cap Crown */}
            <rect x="4" y="2" width="6" height="2" fill={hair} />
            <rect x="3" y="3" width="8" height="2.2" fill={hair} />

            {/* Baseball Cap Rear Adjustment Arch & Buckle */}
            <rect x="6" y="4.5" width="2" height="1" fill="#090d16" />
            <rect x="6.8" y="4.5" width="0.8" height="1" fill="#94a3b8" />

            {/* Hair silhouette at nape of neck */}
            <rect x="4" y="5.5" width="6" height="2" fill={hair} />
            {(isMaryGrace || isGloria) && (
              <rect x="3" y="5" width="8" height="3.5" fill={hair} />
            )}

            {/* Accessories seen from behind */}
            {isJosiah && (
              // Josiah: Holographic Cyan Headband Ring
              <rect x="3" y="3" width="8" height="0.8" fill="#38bdf8" />
            )}
            {isKhent && (
              // Khent: SecOps Emerald Visor Band
              <rect x="3" y="3.8" width="8" height="0.8" fill="#10b981" />
            )}
            {isJohnArvy && (
              // John Arvy: Crimson Specs Strap
              <rect x="3" y="4" width="8" height="0.8" fill="#ef4444" />
            )}
            {isGian && (
              // Gian: Purple Audio Headset from behind
              <>
                <rect x="2" y="3" width="1.5" height="3" fill="#a855f7" />
                <rect x="10.5" y="3" width="1.5" height="3" fill="#a855f7" />
                <rect x="3" y="1.8" width="8" height="0.8" fill="#c084fc" />
              </>
            )}
            {isArwin && (
              // Arwin: Dark Headset band
              <>
                <rect x="2" y="3.5" width="1.5" height="2.5" fill="#475569" />
                <rect x="10.5" y="3.5" width="1.5" height="2.5" fill="#475569" />
                <rect x="3" y="2" width="8" height="0.6" fill="#64748b" />
              </>
            )}
            {isRoyJhan && (
              <rect x="3" y="3.5" width="8" height="0.8" fill="#06b6d4" />
            )}
            {isBonnie && (
              <rect x="10" y="2.5" width="2" height="2" fill="#ec4899" />
            )}
            {isMaryGrace && (
              <rect x="3" y="2.5" width="2.5" height="1.2" fill="#facc15" />
            )}
            {isGloria && (
              <rect x="10" y="3.2" width="1.8" height="1.8" fill="#f59e0b" />
            )}
            {isJesmond && (
              <rect x="3" y="1.5" width="8" height="2" fill="#1e3a8a" />
            )}
            {isKin && (
              <rect x="2.5" y="1.8" width="8.5" height="1.8" fill="#0284c7" />
            )}
          </g>

          {/* Nape Skin Collar */}
          <rect x="5.5" y="7.2" width="3" height="1" fill={skin} />

          {/* Torso / Shirt Back */}
          <rect x="3" y="8" width="8" height="4" fill={color} />
          {/* Subtle back shoulder seam */}
          <line
            x1="3"
            y1="8.5"
            x2="11"
            y2="8.5"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="0.5"
          />

          {/* Shoulders */}
          <rect x="2" y="9" width="1" height="3" fill={color} />
          <rect x="11" y="9" width="1" height="3" fill={color} />

          {/* Hands & Posture in Back View */}
          {effectiveHasCoffee ? (
            <>
              {/* Left hand relaxed */}
              <rect x="2" y="11" width="1" height="1" fill={skin} />
              {/* Right hand lifting white ceramic coffee mug over shoulder */}
              <rect
                x="10.2"
                y="7"
                width="2.4"
                height="2.6"
                fill="#f8fafc"
                rx="0.5"
              />
              <rect x="10.7" y="6.6" width="1.4" height="0.6" fill="#78350f" />
            </>
          ) : isCurrentlyTyping ? (
            <>
              {/* Arms angled forward toward desk/keyboard */}
              <polygon points="2,9 3.5,9 5,10.2 3.5,10.5" fill={color} />
              <polygon points="10.5,9 12,9 10.5,10.5 9,10.2" fill={color} />

              {/* Dynamic 3-Frame Alternating Hands typing on keyboard */}
              {effectiveTypeFrame === 0 ? (
                <>
                  {/* Left hand down on keys, right hand hover */}
                  <rect x="4.5" y="10" width="1.5" height="1.2" fill={skin} />
                  <rect x="8.5" y="9.4" width="1.5" height="1.2" fill={skin} />
                </>
              ) : effectiveTypeFrame === 1 ? (
                <>
                  {/* Both hands down on home row */}
                  <rect x="4.5" y="10.2" width="1.5" height="1.2" fill={skin} />
                  <rect x="8" y="10.2" width="1.5" height="1.2" fill={skin} />
                </>
              ) : (
                <>
                  {/* Right hand down on keys, left hand hover */}
                  <rect x="4" y="9.4" width="1.5" height="1.2" fill={skin} />
                  <rect x="8" y="10" width="1.5" height="1.2" fill={skin} />
                </>
              )}
            </>
          ) : isGesturing ? (
            <>
              <rect x="2" y="11" width="1" height="1" fill={skin} />
              {/* Right hand raised in discussion gesture */}
              <rect x="10.5" y="7.5" width="1.6" height="1.8" fill={skin} />
            </>
          ) : isGymStrength ? (
            <>
              {/* Dumbbell / strength posture */}
              <rect x="1.5" y="8.5" width="1.5" height="2.5" fill="#475569" />
              <rect x="11" y="8.5" width="1.5" height="2.5" fill="#475569" />
              <rect x="2" y="10" width="1" height="1" fill={skin} />
              <rect x="11" y="10" width="1" height="1" fill={skin} />
            </>
          ) : (
            <>
              {/* Idle arms at sides */}
              <rect x="2" y="11" width="1" height="1" fill={skin} />
              <rect x="11" y="11" width="1" height="1" fill={skin} />
            </>
          )}

          {/* Lower Body: Back View Seated vs Walking Legs */}
          {isSeated ? (
            <>
              <rect x="4" y="12" width="6" height="2" fill="#0f172a" />
              <rect x="3.5" y="13.5" width="2.5" height="1.2" fill="#1e293b" />
              <rect x="8" y="13.5" width="2.5" height="1.2" fill="#1e293b" />
            </>
          ) : (
            <>
              <rect x="4" y="12" width="6" height="1" fill="#1e293b" />
              <rect
                x="4.2"
                y={13 + (legShift === 1 || isGymRunning ? -0.8 : 0)}
                width="1.8"
                height={legShift === 1 || isGymRunning ? 1.5 : 2}
                fill="#0f172a"
              />
              <rect
                x="8"
                y={13 + (legShift === 0 && !isGymRunning ? -0.8 : 0)}
                width="1.8"
                height={legShift === 0 && !isGymRunning ? 1.5 : 2}
                fill="#0f172a"
              />
            </>
          )}
        </g>
      ) : (
        /* ==================== FRONT VIEW (SE / SW) ==================== */
        <g>
          {/* Hair & Cap with dynamic head bob */}
          <g transform={`translate(0, ${typeHeadBob})`}>
            {/* Hair / Cap Top */}
            <rect x="4" y="2" width="6" height="2" fill={hair} />
            <rect x="3" y="3" width="8" height="2" fill={hair} />
            {/* Cap Visor projecting forward in front view */}
            <rect x="9.2" y="3.6" width="2.2" height="1" fill={hair} />

            {/* Sideburns / Hair silhouette */}
            <rect
              x="3"
              y="4"
              width="2"
              height={isMaryGrace || isGloria ? 4 : 2}
              fill={hair}
            />
            <rect
              x="9"
              y="4"
              width="2"
              height={isMaryGrace || isGloria ? 4 : 2}
              fill={hair}
            />

            {/* Specialized Hair Accessories & Headgear */}
            {isJosiah && (
              // Josiah: Executive Cyan Visor / Holographic Headband
              <rect x="3" y="2.2" width="8" height="1" fill="#38bdf8" />
            )}
            {isKhent && (
              // Khent: SecOps Cyber Emerald Visor
              <rect x="3" y="3.8" width="8" height="1.6" fill="#10b981" />
            )}
            {isJohnArvy && (
              // John Arvy: Crimson Penetration Terminal Specs
              <rect x="3" y="4.2" width="8" height="1.2" fill="#ef4444" />
            )}
            {isGian && (
              // Gian: Test Automation Purple Audio Headset
              <>
                <rect x="2" y="3" width="1.5" height="3" fill="#a855f7" />
                <rect x="10.5" y="3" width="1.5" height="3" fill="#a855f7" />
                <rect x="3" y="1.8" width="8" height="0.8" fill="#c084fc" />
              </>
            )}
            {isRoyJhan && (
              // Roy Jhan: Intelligence Lab Neural Visor
              <rect x="3" y="3.5" width="8" height="1.5" fill="#06b6d4" />
            )}
            {isBonnie && (
              // Bonnie: DevOps Pink Hairclip
              <rect x="10" y="2.5" width="2" height="2" fill="#ec4899" />
            )}
            {isMaryGrace && (
              // Mary Grace: Head of Ops Golden Barrett
              <rect x="3" y="2.5" width="2.5" height="1.2" fill="#facc15" />
            )}
            {isGloria && (
              // Gloria: Executive Amber Brooch
              <rect x="10" y="3.2" width="1.8" height="1.8" fill="#f59e0b" />
            )}
            {isArwin && (
              // Arwin: Lead Backend Dark Studio Headset
              <>
                <rect x="2" y="3.5" width="1.5" height="2.5" fill="#475569" />
                <rect x="10.5" y="3.5" width="1.5" height="2.5" fill="#475569" />
                <rect x="3" y="2" width="8" height="0.6" fill="#64748b" />
              </>
            )}
            {isJesmond && (
              // Jesmond: SEO Beanie Cap
              <rect x="3" y="1.5" width="8" height="1.8" fill="#1e3a8a" />
            )}
            {isKin && (
              // Kin: Growth Acquisition Cap
              <rect x="2.5" y="1.8" width="8.5" height="1.5" fill="#0284c7" />
            )}
            {isKeiru && (
              // Keiru: Vision Multimodal Scanner Eye
              <rect x="7.8" y="4.5" width="2" height="1.5" fill="#22d3ee" />
            )}
            {isBlaze && (
              // Blaze: Incident Alert Orange Badge
              <rect x="6" y="9.5" width="2" height="1" fill="#f97316" />
            )}
            {isNelmar && (
              // Nelmar: Systems Engineer Comm Earpiece
              <rect x="2" y="5" width="1.5" height="1.5" fill="#2dd4bf" />
            )}
            {isJohnLloyd && (
              // John Lloyd: DB Server Key Badge
              <rect x="6" y="9.5" width="2" height="1" fill="#f59e0b" />
            )}
            {isAnthony && (
              // Anthony: Operations Logistics Emerald Collar
              <polygon points="5,8 9,8 8,9.5 6,9.5" fill="#15803d" />
            )}
            {isJoVincent && (
              // Jo Vincent: Growth Strategist Audio Earpiece
              <rect x="2" y="4" width="1.5" height="2" fill="#2563eb" />
            )}
            {isRyan && (
              // Ryan: MLOps Silver Tech Earpiece
              <rect x="10.5" y="4.5" width="1.5" height="1.8" fill="#94a3b8" />
            )}

            {/* Face (middle rows) */}
            <rect x="4" y="4" width="6" height="4" fill={skin} />

            {/* Eyes (if not covered by cyber visors) */}
            {!isKhent && !isJohnArvy && !isRoyJhan && (
              <>
                {isNeilMar || isFerwin || isGabriel ? (
                  // Modern Glasses
                  <>
                    <rect
                      x="4"
                      y="4.8"
                      width="2"
                      height="1.4"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="0.5"
                    />
                    <rect
                      x="8"
                      y="4.8"
                      width="2"
                      height="1.4"
                      fill="none"
                      stroke="#0f172a"
                      strokeWidth="0.5"
                    />
                    <line
                      x1="6"
                      y1="5.5"
                      x2="8"
                      y2="5.5"
                      stroke="#0f172a"
                      strokeWidth="0.5"
                    />
                  </>
                ) : (
                  // Classic 1-pixel dark eyes
                  <>
                    <rect x="4.5" y="5" width="1.2" height="1.2" fill="#0f172a" />
                    <rect x="8.3" y="5" width="1.2" height="1.2" fill="#0f172a" />
                  </>
                )}
              </>
            )}
          </g>

          {/* Executive Ties & Collars */}
          {(isJosiah || isJulian || isJB) && (
            <>
              <polygon points="6,8 8,8 7.5,9.5 6.5,9.5" fill="#ffffff" />
              <polygon
                points="6.8,8.5 7.2,8.5 7.2,11.5 6.8,11.5"
                fill={isJosiah ? '#38bdf8' : isJulian ? '#f59e0b' : '#ef4444'}
              />
            </>
          )}

          {/* Torso / Shirt */}
          <rect x="3" y="8" width="8" height="4" fill={color} />
          {/* Shoulders */}
          <rect x="2" y="9" width="1" height="3" fill={color} />
          <rect x="11" y="9" width="1" height="3" fill={color} />

          {/* Hands / Dynamic 3-Frame Typing / Coffee Cup / Posture */}
          {effectiveHasCoffee ? (
            <>
              <rect x="2" y="10.5" width="1" height="1" fill={skin} />
              {/* Coffee Mug with steam */}
              <rect
                x="10.5"
                y="9.5"
                width="2.2"
                height="2.5"
                fill="#f8fafc"
                rx="0.5"
              />
              <rect x="11" y="9" width="1.2" height="0.6" fill="#78350f" />
            </>
          ) : isCurrentlyTyping ? (
            <>
              {/* Active 3-Frame Typing Hands alternating on keyboard */}
              {effectiveTypeFrame === 0 ? (
                <>
                  <rect x="2" y="11" width="1.5" height="1.5" fill={skin} />
                  <rect x="10.5" y="10.4" width="1.5" height="1.5" fill={skin} />
                </>
              ) : effectiveTypeFrame === 1 ? (
                <>
                  <rect x="2" y="10.6" width="1.5" height="1.5" fill={skin} />
                  <rect x="10.5" y="10.6" width="1.5" height="1.5" fill={skin} />
                </>
              ) : (
                <>
                  <rect x="2" y="10.4" width="1.5" height="1.5" fill={skin} />
                  <rect x="10.5" y="11" width="1.5" height="1.5" fill={skin} />
                </>
              )}
            </>
          ) : isGesturing ? (
            <>
              <rect x="2" y="11" width="1" height="1" fill={skin} />
              <rect x="10.5" y="7.5" width="1.6" height="1.8" fill={skin} />
            </>
          ) : isGymStrength ? (
            <>
              <rect x="1.5" y="8.5" width="1.5" height="2.5" fill="#475569" />
              <rect x="11" y="8.5" width="1.5" height="2.5" fill="#475569" />
              <rect x="2" y="10" width="1" height="1" fill={skin} />
              <rect x="11" y="10" width="1" height="1" fill={skin} />
            </>
          ) : (
            <>
              <rect x="2" y="11" width="1" height="1" fill={skin} />
              <rect x="11" y="11" width="1" height="1" fill={skin} />
            </>
          )}

          {/* Lower Body: Seated vs Walking Legs */}
          {isSeated ? (
            <>
              <rect x="4" y="12" width="6" height="2" fill="#0f172a" />
              <rect x="3.5" y="13.5" width="2.5" height="1.2" fill="#1e293b" />
              <rect x="8" y="13.5" width="2.5" height="1.2" fill="#1e293b" />
            </>
          ) : (
            <>
              <rect x="4" y="12" width="6" height="1" fill="#1e293b" />
              <rect
                x="4.2"
                y={13 + (legShift === 1 || isGymRunning ? -0.8 : 0)}
                width="1.8"
                height={legShift === 1 || isGymRunning ? 1.5 : 2}
                fill="#0f172a"
              />
              <rect
                x="8"
                y={13 + (legShift === 0 && !isGymRunning ? -0.8 : 0)}
                width="1.8"
                height={legShift === 0 && !isGymRunning ? 1.5 : 2}
                fill="#0f172a"
              />
            </>
          )}
        </g>
      )}
    </svg>
  )
}
