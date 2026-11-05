'use client';

import React from 'react';

export interface PixelSpriteProps {
  id: string;
  name?: string;
  color?: string;
  hair?: string;
  skin?: string;
  size?: number;
  isWalking?: boolean;
  walkFrame?: number;
  isTyping?: boolean;
  facing?: 'left' | 'right';
  hasCoffee?: boolean;
  isSeated?: boolean;
  className?: string;
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
  facing = 'right',
  hasCoffee = false,
  isSeated = false,
  className = '',
}: PixelSpriteProps) {
  // Walking leg shift (0 or 1)
  const legShift = isWalking ? (walkFrame % 2 === 0 ? 0 : 1) : 0;
  // Typing bob animation
  const typeBob = isTyping && !isWalking ? (walkFrame % 2 === 0 ? 0.6 : 0) : 0;

  // Agent-specific accessory configurations
  const isJosiah = id === 'josiah';
  const isArwin = id === 'arwin';
  const isNeilMar = id === 'neil_mar';
  const isNelmar = id === 'nelmar';
  const isBonnie = id === 'bonnie';
  const isJohnLloyd = id === 'john_lloyd';
  const isKhent = id === 'khent';
  const isJohnArvy = id === 'john_arvy';
  const isGian = id === 'gian';
  const isMaryGrace = id === 'mary_grace';
  const isAnthony = id === 'anthony';
  const isBlaze = id === 'blaze';
  const isFerwin = id === 'ferwin';
  const isJoVincent = id === 'jo_vincent';
  const isJesmond = id === 'jesmond';
  const isKin = id === 'kin';
  const isRoyJhan = id === 'roy_jhan';
  const isGabriel = id === 'gabriel';
  const isKeiru = id === 'keiru';
  const isRyan = id === 'ryan';
  const isGloria = id === 'gloria';
  const isJB = id === 'jb';
  const isJulian = id === 'julian';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 16"
      className={`pixelated ${className}`}
      style={{
        imageRendering: 'pixelated',
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
        transformOrigin: 'center center',
      }}
    >
      {/* Ground Shadow */}
      <ellipse cx="7" cy={isSeated ? 14.5 : 15.2} rx={isSeated ? 5 : 4.2} ry="0.9" fill="rgba(0,0,0,0.45)" />

      {/* Hair (top 3 rows) */}
      <rect x="4" y="2" width="6" height="2" fill={hair} />
      <rect x="3" y="3" width="8" height="2" fill={hair} />
      {/* Sideburns / Hair silhouette */}
      <rect x="3" y="4" width="2" height={isMaryGrace || isGloria ? 4 : 2} fill={hair} />
      <rect x="9" y="4" width="2" height={isMaryGrace || isGloria ? 4 : 2} fill={hair} />

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
              <rect x="4" y="4.8" width="2" height="1.4" fill="none" stroke="#0f172a" strokeWidth="0.5" />
              <rect x="8" y="4.8" width="2" height="1.4" fill="none" stroke="#0f172a" strokeWidth="0.5" />
              <line x1="6" y1="5.5" x2="8" y2="5.5" stroke="#0f172a" strokeWidth="0.5" />
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

      {/* Executive Ties & Collars */}
      {(isJosiah || isJulian || isJB) && (
        <>
          <polygon points="6,8 8,8 7.5,9.5 6.5,9.5" fill="#ffffff" />
          <polygon points="6.8,8.5 7.2,8.5 7.2,11.5 6.8,11.5" fill={isJosiah ? '#38bdf8' : isJulian ? '#f59e0b' : '#ef4444'} />
        </>
      )}

      {/* Torso / Shirt */}
      <rect x="3" y="8" width="8" height="4" fill={color} />
      {/* Shoulders */}
      <rect x="2" y="9" width="1" height="3" fill={color} />
      <rect x="11" y="9" width="1" height="3" fill={color} />

      {/* Hands / Typing / Coffee Cup / Posture */}
      {hasCoffee ? (
        <>
          <rect x="2" y="10.5" width="1" height="1" fill={skin} />
          {/* Coffee Mug with steam */}
          <rect x="10.5" y="9.5" width="2.2" height="2.5" fill="#f8fafc" rx="0.5" />
          <rect x="11" y="9" width="1.2" height="0.6" fill="#78350f" />
        </>
      ) : isTyping ? (
        <>
          {/* Active typing hands bobbing up and down */}
          <rect x="2" y={10.5 + typeBob} width="1.5" height="1.5" fill={skin} />
          <rect x="10.5" y={10.5 + (typeBob > 0 ? 0 : 0.6)} width="1.5" height="1.5" fill={skin} />
        </>
      ) : (
        <>
          <rect x="2" y="11" width="1" height="1" fill={skin} />
          <rect x="11" y="11" width="1" height="1" fill={skin} />
        </>
      )}

      {/* Lower Body: Seated vs Walking Legs */}
      {isSeated ? (
        // Seated under desk
        <>
          <rect x="4" y="12" width="6" height="2" fill="#0f172a" />
          <rect x="3.5" y="13.5" width="2.5" height="1.2" fill="#1e293b" />
          <rect x="8" y="13.5" width="2.5" height="1.2" fill="#1e293b" />
        </>
      ) : (
        // Walking or Standing Legs
        <>
          <rect x="4" y="12" width="6" height="1" fill="#1e293b" />
          {/* Left leg */}
          <rect
            x="4.2"
            y={13 + (legShift === 1 ? -0.8 : 0)}
            width="1.8"
            height={legShift === 1 ? 1.5 : 2}
            fill="#0f172a"
          />
          {/* Right leg */}
          <rect
            x="8"
            y={13 + (legShift === 0 ? -0.8 : 0)}
            width="1.8"
            height={legShift === 0 ? 1.5 : 2}
            fill="#0f172a"
          />
        </>
      )}
    </svg>
  );
}
