'use client'

import * as THREE from 'three'

export type MonitorRoleTheme =
  | 'engineering'
  | 'server_admin'
  | 'design'
  | 'operations'
  | 'executive'

const textureCache = new Map<MonitorRoleTheme, THREE.CanvasTexture>()

function drawEngineeringScreen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // VS Code dark theme IDE + terminal
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(0, 0, w, h)

  // Activity bar & sidebar
  ctx.fillStyle = '#161b22'
  ctx.fillRect(0, 0, 110, h)
  ctx.fillStyle = '#30363d'
  ctx.fillRect(110, 0, 2, h)

  // File tree lines
  const files = ['OfficeScene.tsx', 'walkCollision.ts', 'db-map.ts', 'route.ts', 'schema.sql']
  ctx.font = 'bold 12px monospace'
  files.forEach((f, idx) => {
    ctx.fillStyle = idx === 0 ? '#58a6ff' : '#8b949e'
    ctx.fillText(f, 12, 34 + idx * 24)
  })

  // Top tab bar
  ctx.fillStyle = '#161b22'
  ctx.fillRect(112, 0, w - 112, 28)
  ctx.fillStyle = '#0d1117'
  ctx.fillRect(112, 0, 150, 28)
  ctx.fillStyle = '#38bdf8'
  ctx.fillRect(112, 0, 150, 2)
  ctx.fillStyle = '#e6edf3'
  ctx.font = '12px monospace'
  ctx.fillText('OfficeScene.tsx', 124, 18)

  // Syntax-highlighted code lines
  const codeColors = ['#ff7b72', '#79c0ff', '#a5d6ff', '#d2a8ff', '#7ee787', '#ffa657']
  for (let row = 0; row < 10; row++) {
    const y = 48 + row * 18
    ctx.fillStyle = '#484f58'
    ctx.fillText(String(row + 12), 120, y)
    let x = 148 + ((row % 3) * 16)
    const segs = 2 + (row % 3)
    for (let s = 0; s < segs; s++) {
      const segW = 36 + ((row * 17 + s * 29) % 72)
      ctx.fillStyle = codeColors[(row + s) % codeColors.length]
      ctx.fillRect(x, y - 9, segW, 8)
      x += segW + 10
    }
  }

  // Bottom integrated terminal
  ctx.fillStyle = '#090d16'
  ctx.fillRect(112, 232, w - 112, h - 232)
  ctx.fillStyle = '#30363d'
  ctx.fillRect(112, 232, w - 112, 2)
  ctx.fillStyle = '#3fb950'
  ctx.font = 'bold 12px monospace'
  ctx.fillText('$ npm test -- --run', 124, 254)
  ctx.fillStyle = '#7ee787'
  ctx.fillText('PASS  75/75 tests passed (0.84s)', 124, 276)
  ctx.fillStyle = '#38bdf8'
  ctx.fillText('READY  Next.js 16 build clean', 124, 298)
}

function drawServerAdminScreen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#050b14'
  ctx.fillRect(0, 0, w, h)

  // Header bar
  ctx.fillStyle = '#0b192c'
  ctx.fillRect(0, 0, w, 34)
  ctx.fillStyle = '#10b981'
  ctx.font = 'bold 14px monospace'
  ctx.fillText('NOC TELEMETRY // RACK CLUSTER A-B', 14, 22)

  // Rack health cards
  const metrics = [
    { label: 'CPU LOAD', val: '38.4%', color: '#38bdf8' },
    { label: 'CRAC TEMP', val: '18.2 C', color: '#22c55e' },
    { label: 'UPLINK', val: '40 Gbps', color: '#a855f7' },
  ]
  metrics.forEach((m, i) => {
    const x = 14 + i * 164
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(x, 46, 152, 68)
    ctx.strokeStyle = m.color
    ctx.lineWidth = 2
    ctx.strokeRect(x, 46, 152, 68)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '11px monospace'
    ctx.fillText(m.label, x + 10, 68)
    ctx.fillStyle = m.color
    ctx.font = 'bold 20px monospace'
    ctx.fillText(m.val, x + 10, 98)
  })

  // Live SSH log stream
  ctx.fillStyle = '#09111f'
  ctx.fillRect(14, 128, w - 28, 176)
  ctx.strokeStyle = '#1e293b'
  ctx.strokeRect(14, 128, w - 28, 176)
  const logs = [
    '[OK] rack-a1 heartbeat 0.4ms',
    '[OK] rack-a2 nvme-pool healthy 99.98%',
    '[OK] rack-b1 k8s-node-04 synced',
    '[OK] chiller-01 intake 18.1C / exhaust 24.0C',
    '[OK] supabase realtime ws connected',
    'rex@noc-hq:~$ tail -f /var/log/cluster.log',
  ]
  ctx.font = '12px monospace'
  logs.forEach((line, idx) => {
    ctx.fillStyle = idx === logs.length - 1 ? '#38bdf8' : '#34d399'
    ctx.fillText(line, 24, 154 + idx * 25)
  })
}

function drawDesignScreen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#18181b'
  ctx.fillRect(0, 0, w, h)

  // Left Layers panel
  ctx.fillStyle = '#27272a'
  ctx.fillRect(0, 0, 96, h)
  ctx.fillStyle = '#a1a1aa'
  ctx.font = 'bold 11px sans-serif'
  ctx.fillText('LAYERS', 12, 24)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i === 1 ? '#6366f1' : '#3f3f46'
    ctx.fillRect(10, 38 + i * 26, 76, 18)
  }

  // Center Canvas Artboard
  ctx.fillStyle = '#09090b'
  ctx.fillRect(96, 0, 316, h)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(126, 32, 256, 246)

  // UI mockup inside artboard
  ctx.fillStyle = '#6366f1'
  ctx.fillRect(142, 48, 224, 48)
  ctx.fillStyle = '#ec4899'
  ctx.beginPath()
  ctx.arc(174, 138, 24, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e4e4e7'
  ctx.fillRect(210, 120, 140, 14)
  ctx.fillRect(210, 142, 100, 10)
  ctx.fillStyle = '#f4f4f5'
  ctx.fillRect(142, 180, 106, 76)
  ctx.fillRect(260, 180, 106, 76)

  // Right Color Swatches
  ctx.fillStyle = '#27272a'
  ctx.fillRect(412, 0, 100, h)
  const swatches = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#38bdf8']
  swatches.forEach((c, idx) => {
    ctx.fillStyle = c
    ctx.fillRect(426, 36 + idx * 44, 72, 30)
  })
}

function drawOperationsScreen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, w, 36)
  ctx.fillStyle = '#f8fafc'
  ctx.font = 'bold 14px sans-serif'
  ctx.fillText('SPRINT BOARD // EASYUP HQ', 16, 23)

  const cols = [
    { title: 'TODO', color: '#64748b', cards: 3 },
    { title: 'IN PROGRESS', color: '#38bdf8', cards: 4 },
    { title: 'DONE', color: '#22c55e', cards: 4 },
  ]
  cols.forEach((col, ci) => {
    const x = 16 + ci * 164
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(x, 48, 152, 254)
    ctx.fillStyle = col.color
    ctx.fillRect(x, 48, 152, 4)
    ctx.fillStyle = '#e2e8f0'
    ctx.font = 'bold 11px sans-serif'
    ctx.fillText(col.title, x + 10, 70)
    for (let k = 0; k < col.cards; k++) {
      ctx.fillStyle = '#334155'
      ctx.fillRect(x + 10, 84 + k * 52, 132, 42)
      ctx.fillStyle = col.color
      ctx.fillRect(x + 16, 92 + k * 52, 42, 6)
      ctx.fillStyle = '#cbd5e1'
      ctx.fillRect(x + 16, 106 + k * 52, 108, 7)
    }
  })
}

function drawExecutiveScreen(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#090d16'
  ctx.fillRect(0, 0, w, h)

  ctx.fillStyle = '#1e1b4b'
  ctx.fillRect(0, 0, w, 38)
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 14px sans-serif'
  ctx.fillText('EXECUTIVE KPI // AI OFFICE FLEET', 16, 24)

  // Bar chart
  const bars = [0.55, 0.72, 0.64, 0.85, 0.92, 0.78, 0.96]
  bars.forEach((val, idx) => {
    const bh = Math.round(val * 165)
    const bx = 28 + idx * 66
    const by = 240 - bh
    ctx.fillStyle = idx === bars.length - 1 ? '#fbbf24' : '#38bdf8'
    ctx.fillRect(bx, by, 42, bh)
  })
  ctx.fillStyle = '#334155'
  ctx.fillRect(20, 244, w - 40, 2)

  ctx.fillStyle = '#94a3b8'
  ctx.font = '12px monospace'
  ctx.fillText('VEL +24%   UPTIME 99.98%   AGENTS 23/23 ONLINE', 24, 282)
}

export function getMonitorTexture(theme: MonitorRoleTheme): THREE.CanvasTexture {
  const existing = textureCache.get(theme)
  if (existing) return existing

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 320
  const ctx = canvas.getContext('2d')

  if (ctx) {
    switch (theme) {
      case 'engineering':
        drawEngineeringScreen(ctx, canvas.width, canvas.height)
        break
      case 'server_admin':
        drawServerAdminScreen(ctx, canvas.width, canvas.height)
        break
      case 'design':
        drawDesignScreen(ctx, canvas.width, canvas.height)
        break
      case 'operations':
        drawOperationsScreen(ctx, canvas.width, canvas.height)
        break
      case 'executive':
        drawExecutiveScreen(ctx, canvas.width, canvas.height)
        break
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true
  textureCache.set(theme, texture)
  return texture
}
