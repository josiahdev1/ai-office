'use client'

import React from 'react'
import { CarStyle, FacingDirection } from './types'

export interface VehicleSpriteProps {
  id: string
  style: CarStyle
  color: string
  facing: FacingDirection
  x: number
  y: number
  isParked?: boolean
  headlightsOn?: boolean
  brakeLightsOn?: boolean
  blinkerOn?: boolean
  className?: string
}

export function VehicleSprite({
  id,
  style = 'sedan',
  color = '#38bdf8',
  facing = 'SE',
  x,
  y,
  isParked = false,
  headlightsOn = false,
  brakeLightsOn = false,
  blinkerOn = false,
  className = '',
}: VehicleSpriteProps) {
  // Standard car dimensions in 2:1 isometric view
  const isBus = style === 'bus'
  const isTruck = style === 'truck'
  const isVan = style === 'van'
  const isSuv = style === 'suv'
  const isPickup = style === 'pickup'

  const bodyLength = isBus ? 58 : isTruck ? 46 : isVan ? 42 : isSuv ? 40 : 36
  const bodyWidth = isBus ? 22 : isSuv ? 20 : 18
  const bodyHeight = isBus ? 22 : isTruck ? 22 : isVan ? 20 : isSuv ? 18 : 14

  // Mirroring / orientation along the 2:1 isometric grid
  const isFlippedHorizontal = facing === 'SW' || facing === 'NW'

  // Roof and cabin tint
  const roofColor = '#0f172a'
  const windowColor = '#67e8f9'
  const tireColor = '#18181b'

  return (
    <g
      data-vehicle-id={id}
      data-parked={isParked}
      transform={`translate(${x}, ${y})`}
      className={`vehicle-sprite select-none ${className}`}
      style={{ pointerEvents: 'none' }}
    >
      {/* 1. Ambient Drop Shadow underneath car */}
      <ellipse
        cx="0"
        cy={bodyHeight * 0.45}
        rx={bodyLength * 0.55}
        ry={bodyWidth * 0.52}
        fill="rgba(0, 0, 0, 0.45)"
      />

      {/* 2. Headlight Beams (Projecting outward if lights are on) */}
      {headlightsOn && (
        <g opacity="0.6">
          {facing === 'SE' && (
            <polygon
              points="14,4 75,28 55,48 8,12"
              fill="url(#headlightBeamGradient)"
            />
          )}
          {facing === 'SW' && (
            <polygon
              points="-14,4 -75,28 -55,48 -8,12"
              fill="url(#headlightBeamGradient)"
            />
          )}
          {facing === 'NE' && (
            <polygon
              points="12,-4 75,-28 55,-48 6,-12"
              fill="url(#headlightBeamGradient)"
            />
          )}
          {facing === 'NW' && (
            <polygon
              points="-12,-4 -75,-28 -55,-48 -6,-12"
              fill="url(#headlightBeamGradient)"
            />
          )}
        </g>
      )}

      {/* 3. Main Vehicle Body Group with Horizontal Transform */}
      <g transform={isFlippedHorizontal ? 'scale(-1, 1)' : undefined}>
        {/* Wheels / Tires (Isometric Ellipses) */}
        <ellipse
          cx={-bodyLength * 0.3}
          cy={bodyHeight * 0.38}
          rx="4.5"
          ry="3.2"
          fill={tireColor}
        />
        <ellipse
          cx={-bodyLength * 0.3}
          cy={bodyHeight * 0.38}
          rx="2.5"
          ry="1.8"
          fill="#71717a"
        />
        <ellipse
          cx={bodyLength * 0.3}
          cy={bodyHeight * 0.38}
          rx="4.5"
          ry="3.2"
          fill={tireColor}
        />
        <ellipse
          cx={bodyLength * 0.3}
          cy={bodyHeight * 0.38}
          rx="2.5"
          ry="1.8"
          fill="#71717a"
        />

        {/* Lower Chassis / Bumper */}
        <polygon
          points={`-${bodyLength * 0.5},${bodyHeight * 0.15} ${bodyLength * 0.5},${bodyHeight * 0.15} ${bodyLength * 0.48},${bodyHeight * 0.45} -${bodyLength * 0.48},${bodyHeight * 0.45}`}
          fill="#090d16"
        />

        {/* Main Chassis Body */}
        <polygon
          points={`-${bodyLength * 0.5},${bodyHeight * 0.15} ${bodyLength * 0.5},${bodyHeight * 0.15} ${bodyLength * 0.42},-${bodyHeight * 0.25} -${bodyLength * 0.42},-${bodyHeight * 0.25}`}
          fill={color}
          stroke="#090d16"
          strokeWidth="1.2"
        />

        {/* Cabin / Windshield / Roof */}
        {isBus ? (
          // Transit Bus Full Box Cabin
          <g>
            <polygon
              points={`-${bodyLength * 0.42},-${bodyHeight * 0.25} ${bodyLength * 0.42},-${bodyHeight * 0.25} ${bodyLength * 0.38},-${bodyHeight * 0.8} -${bodyLength * 0.38},-${bodyHeight * 0.8}`}
              fill={roofColor}
            />
            {/* Side Windows Strip */}
            <rect
              x={-bodyLength * 0.35}
              y={-bodyHeight * 0.72}
              width={bodyLength * 0.7}
              height={bodyHeight * 0.38}
              rx="1.5"
              fill={windowColor}
              fillOpacity="0.85"
            />
            {/* Route LED sign */}
            <rect
              x={bodyLength * 0.18}
              y={-bodyHeight * 0.82}
              width="14"
              height="4"
              rx="0.5"
              fill="#fbbf24"
            />
          </g>
        ) : isTruck ? (
          // Cargo Delivery Box on rear
          <g>
            <polygon
              points={`-${bodyLength * 0.42},-${bodyHeight * 0.25} 0,-${bodyHeight * 0.25} 0,-${bodyHeight * 0.85} -${bodyLength * 0.42},-${bodyHeight * 0.85}`}
              fill="#f1f5f9"
              stroke="#0f172a"
              strokeWidth="0.8"
            />
            {/* Driver Cab */}
            <polygon
              points={`0,-${bodyHeight * 0.25} ${bodyLength * 0.4},-${bodyHeight * 0.25} ${bodyLength * 0.3},-${bodyHeight * 0.65} 0,-${bodyHeight * 0.65}`}
              fill={color}
              stroke="#0f172a"
              strokeWidth="0.8"
            />
            <polygon
              points={`4,-${bodyHeight * 0.28} ${bodyLength * 0.34},-${bodyHeight * 0.28} ${bodyLength * 0.26},-${bodyHeight * 0.6} 4,-${bodyHeight * 0.6}`}
              fill={windowColor}
              fillOpacity="0.8"
            />
          </g>
        ) : isPickup ? (
          // Pickup Truck: Cab + Open Bed
          <g>
            <polygon
              points={`-${bodyLength * 0.15},-${bodyHeight * 0.25} ${bodyLength * 0.35},-${bodyHeight * 0.25} ${bodyLength * 0.25},-${bodyHeight * 0.7} -${bodyLength * 0.1},-${bodyHeight * 0.7}`}
              fill={color}
            />
            <polygon
              points={`-${bodyLength * 0.1},-${bodyHeight * 0.28} ${bodyLength * 0.3},-${bodyHeight * 0.28} ${bodyLength * 0.22},-${bodyHeight * 0.65} -${bodyLength * 0.05},-${bodyHeight * 0.65}`}
              fill={windowColor}
              fillOpacity="0.8"
            />
            {/* Open Bed outline */}
            <rect
              x={-bodyLength * 0.45}
              y={-bodyHeight * 0.3}
              width={bodyLength * 0.3}
              height="3"
              fill="#1e293b"
            />
          </g>
        ) : (
          // Sedan / Hatchback / SUV Cabin
          <g>
            <polygon
              points={`-${bodyLength * 0.25},-${bodyHeight * 0.25} ${bodyLength * 0.25},-${bodyHeight * 0.25} ${bodyLength * 0.18},-${bodyHeight * 0.72} -${bodyLength * 0.18},-${bodyHeight * 0.72}`}
              fill={roofColor}
            />
            {/* Windshield & Side Windows */}
            <polygon
              points={`-${bodyLength * 0.22},-${bodyHeight * 0.28} ${bodyLength * 0.22},-${bodyHeight * 0.28} ${bodyLength * 0.15},-${bodyHeight * 0.66} -${bodyLength * 0.15},-${bodyHeight * 0.66}`}
              fill={windowColor}
              fillOpacity="0.85"
            />
            {/* Roof Top Cap */}
            <polygon
              points={`-${bodyLength * 0.16},-${bodyHeight * 0.72} ${bodyLength * 0.16},-${bodyHeight * 0.72} ${bodyLength * 0.14},-${bodyHeight * 0.76} -${bodyLength * 0.14},-${bodyHeight * 0.76}`}
              fill={color}
            />
          </g>
        )}

        {/* Headlights (Front Bumper) */}
        <polygon
          points={`${bodyLength * 0.44},${bodyHeight * 0.12} ${bodyLength * 0.48},${bodyHeight * 0.15} ${bodyLength * 0.44},${bodyHeight * 0.28} ${bodyLength * 0.4},${bodyHeight * 0.25}`}
          fill={headlightsOn ? '#fef08a' : '#e2e8f0'}
          stroke="#94a3b8"
          strokeWidth="0.5"
        />

        {/* Taillights / Brake Lights (Rear Bumper) */}
        <polygon
          points={`-${bodyLength * 0.44},${bodyHeight * 0.12} -${bodyLength * 0.48},${bodyHeight * 0.15} -${bodyLength * 0.44},${bodyHeight * 0.28} -${bodyLength * 0.4},${bodyHeight * 0.25}`}
          fill={brakeLightsOn ? '#ef4444' : '#991b1b'}
          stroke="#7f1d1d"
          strokeWidth="0.5"
          filter={brakeLightsOn ? 'drop-shadow(0 0 4px #ef4444)' : undefined}
        />

        {/* Blinker (Flashing Amber when turning) */}
        {blinkerOn && (
          <circle
            cx={bodyLength * 0.42}
            cy={bodyHeight * 0.1}
            r="2"
            fill="#f59e0b"
            className="animate-ping"
          />
        )}
      </g>

      {/* Headlight Gradient Definition in local SVG defs */}
      <defs>
        <linearGradient
          id="headlightBeamGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#fef9c3" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </g>
  )
}
