'use client';

import React, { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { Agent, Approval } from './types';
import { PixelSprite } from './pixel-sprites';
import { sfx } from './audio';
import {
  calculateCorridorPath,
  stepAgentTowardsTarget,
  getModeTargets,
  OfficeMode,
  Point2D,
} from '@/lib/office/pathfinding';
import { officeBus } from '@/lib/office/bus';
import { dialogueEngine } from '@/lib/office/dialogueEngine';
import { officeSupabase } from '@/lib/supabase/officeService';


export interface IsometricOfficeProps {
  agents: Agent[];
  approvals?: Approval[];
  onSelectAgent: (agent: Agent) => void;
  selectedAgentId?: string | null;
  speedMode?: '1x' | '2x' | '5x';
  onSpeedChange?: (speed: '1x' | '2x' | '5x') => void;
}

export interface DeskLayout {
  id: string;
  agentId: string;
  name: string;
  room: string;
  roomLabel: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  monitors: number;
}

// 23 Specialized Workstations for EasyUp Software Solution HQ
export const DESK_CONFIGS: Record<string, DeskLayout> = {
  // 1. Engineering Core (Indigo Floor)
  josiah: { id: 'eng-1', agentId: 'josiah', name: 'Josiah', room: 'Engineering Core', roomLabel: 'ENGINEERING CORE', x: 200, y: 340, facing: 'right', monitors: 3 },
  arwin: { id: 'eng-2', agentId: 'arwin', name: 'Arwin', room: 'Engineering Core', roomLabel: 'ENGINEERING CORE', x: 280, y: 340, facing: 'right', monitors: 2 },
  neil_mar: { id: 'eng-3', agentId: 'neil_mar', name: 'Neil Mar', room: 'Engineering Core', roomLabel: 'ENGINEERING CORE', x: 360, y: 340, facing: 'right', monitors: 2 },
  nelmar: { id: 'eng-4', agentId: 'nelmar', name: 'Nelmar', room: 'Engineering Core', roomLabel: 'ENGINEERING CORE', x: 440, y: 340, facing: 'left', monitors: 2 },
  bonnie: { id: 'eng-5', agentId: 'bonnie', name: 'Bonnie', room: 'Engineering Core', roomLabel: 'ENGINEERING CORE', x: 280, y: 410, facing: 'right', monitors: 2 },
  john_lloyd: { id: 'eng-6', agentId: 'john_lloyd', name: 'John Lloyd', room: 'Engineering Core', roomLabel: 'ENGINEERING CORE', x: 360, y: 410, facing: 'right', monitors: 2 },

  // 2. QA & SecOps NOC (Magenta Floor)
  khent: { id: 'qa-1', agentId: 'khent', name: 'Khent', room: 'QA & SecOps NOC', roomLabel: 'QA & SECOPS NOC', x: 620, y: 410, facing: 'right', monitors: 2 },
  john_arvy: { id: 'qa-2', agentId: 'john_arvy', name: 'John Arvy', room: 'QA & SecOps NOC', roomLabel: 'QA & SECOPS NOC', x: 700, y: 410, facing: 'right', monitors: 2 },
  gian: { id: 'qa-3', agentId: 'gian', name: 'Gian', room: 'QA & SecOps NOC', roomLabel: 'QA & SECOPS NOC', x: 780, y: 410, facing: 'left', monitors: 2 },

  // 3. Operations Hub (Green Floor)
  mary_grace: { id: 'ops-1', agentId: 'mary_grace', name: 'Mary Grace', room: 'Operations Hub', roomLabel: 'OPERATIONS HUB', x: 230, y: 130, facing: 'right', monitors: 2 },
  anthony: { id: 'ops-2', agentId: 'anthony', name: 'Anthony', room: 'Operations Hub', roomLabel: 'OPERATIONS HUB', x: 310, y: 130, facing: 'right', monitors: 2 },
  blaze: { id: 'ops-3', agentId: 'blaze', name: 'Blaze', room: 'Operations Hub', roomLabel: 'OPERATIONS HUB', x: 250, y: 190, facing: 'right', monitors: 2 },
  ferwin: { id: 'ops-4', agentId: 'ferwin', name: 'Ferwin', room: 'Operations Hub', roomLabel: 'OPERATIONS HUB', x: 330, y: 190, facing: 'left', monitors: 2 },

  // 4. Growth Lab (Blue Floor)
  jo_vincent: { id: 'growth-1', agentId: 'jo_vincent', name: 'Jo Vincent', room: 'Growth Lab', roomLabel: 'GROWTH LAB', x: 95, y: 200, facing: 'right', monitors: 2 },
  jesmond: { id: 'growth-2', agentId: 'jesmond', name: 'Jesmond', room: 'Growth Lab', roomLabel: 'GROWTH LAB', x: 165, y: 230, facing: 'right', monitors: 2 },
  kin: { id: 'growth-3', agentId: 'kin', name: 'Kin', room: 'Growth Lab', roomLabel: 'GROWTH LAB', x: 95, y: 270, facing: 'right', monitors: 2 },

  // 5. Intelligence Lab (Cyan Floor)
  roy_jhan: { id: 'intel-1', agentId: 'roy_jhan', name: 'Roy Jhan', room: 'Intelligence Lab', roomLabel: 'INTELLIGENCE LAB', x: 720, y: 120, facing: 'right', monitors: 2 },
  gabriel: { id: 'intel-2', agentId: 'gabriel', name: 'Gabriel', room: 'Intelligence Lab', roomLabel: 'INTELLIGENCE LAB', x: 800, y: 120, facing: 'left', monitors: 2 },
  keiru: { id: 'intel-3', agentId: 'keiru', name: 'Keiru', room: 'Intelligence Lab', roomLabel: 'INTELLIGENCE LAB', x: 720, y: 180, facing: 'right', monitors: 2 },
  ryan: { id: 'intel-4', agentId: 'ryan', name: 'Ryan', room: 'Intelligence Lab', roomLabel: 'INTELLIGENCE LAB', x: 800, y: 180, facing: 'left', monitors: 2 },

  // 6. Command Center (Obsidian Floor)
  gloria: { id: 'cmd-1', agentId: 'gloria', name: 'Gloria', room: 'Command Center', roomLabel: 'COMMAND CENTER', x: 670, y: 350, facing: 'left', monitors: 2 },
  jb: { id: 'cmd-2', agentId: 'jb', name: 'JB', room: 'Command Center', roomLabel: 'COMMAND CENTER', x: 760, y: 350, facing: 'right', monitors: 2 },
  julian: { id: 'cmd-3', agentId: 'julian', name: 'Julian', room: 'Command Center', roomLabel: 'COMMAND CENTER', x: 715, y: 290, facing: 'right', monitors: 2 },
};

// Activity Spots for Canteen, Gym, and Lounges
const CANTEEN_SPOTS: Point2D[] = [
  { x: 570, y: 490 }, // Espresso Bar
  { x: 590, y: 500 }, // Water & Beverage station
  { x: 620, y: 480 }, // Canteen table 1
  { x: 640, y: 495 }, // Canteen table 2
  { x: 660, y: 510 }, // Lounge sofa
  { x: 680, y: 490 }, // Snack buffet
  { x: 540, y: 495 }, // Cafe dining table
];

const FITNESS_SPOTS: Point2D[] = [
  { x: 120, y: 440 }, // Bench Press
  { x: 80, y: 430 },  // Dumbbell rack
  { x: 150, y: 430 }, // Treadmill
  { x: 180, y: 520 }, // Tennis Court Baseline
  { x: 230, y: 520 }, // Tennis Court Net
  { x: 260, y: 540 }, // Tennis Court Baseline 2
];

interface AgentSimState {
  x: number;
  y: number;
  waypoints: Point2D[];
  targetX: number;
  targetY: number;
  isWalking: boolean;
  walkFrame: number;
  facing: 'left' | 'right';
  hasCoffee: boolean;
  isSeated: boolean;
  activity:
    | 'typing'
    | 'idle_at_desk'
    | 'reading_logs'
    | 'walking'
    | 'eating_canteen'
    | 'working_out'
    | 'at_meeting';
  breakTimer: number; // Seconds remaining in break
}

export function IsometricOffice({
  agents,
  onSelectAgent,
  selectedAgentId,
  speedMode = '1x',
}: IsometricOfficeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute Philippine Standard Time (UTC+8) Day vs Night
  const getIsPhNight = () => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const phHours = (utcHours + 8) % 24;
    return phHours < 6 || phHours >= 18; // 6:00 PM to 6:00 AM is night
  };

  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [activeSpeech, setActiveSpeech] = useState<Record<string, string | null>>({});
  const [activeLaserLink, setActiveLaserLink] = useState<{ from: Point2D; to: Point2D } | null>(null);
  const [currentMode, setCurrentMode] = useState<OfficeMode>('FOCUS_WORK');
  const [, startTransition] = useTransition();

  // Periodically refresh Day/Night lighting with real Philippine Standard Time
  useEffect(() => {
    setIsNightMode(getIsPhNight());
    const timer = setInterval(() => {
      setIsNightMode(getIsPhNight());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 60 FPS Physics Simulation State Ref
  const simStateRef = useRef<Record<string, AgentSimState>>({});
  const [renderPositions, setRenderPositions] = useState<Record<string, AgentSimState>>(() => {
    const init: Record<string, AgentSimState> = {};
    Object.entries(DESK_CONFIGS).forEach(([id, cfg]) => {
      init[id] = {
        x: cfg.x,
        y: cfg.y,
        waypoints: [],
        targetX: cfg.x,
        targetY: cfg.y,
        isWalking: false,
        walkFrame: 0,
        facing: cfg.facing,
        hasCoffee: false,
        isSeated: true,
        activity: 'typing',
        breakTimer: 0,
      };
    });
    return init;
  });

  // Keep references fresh
  const agentsRef = useRef(agents);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  // Auto-fit overview camera to container size on mount and resize
  const fitOverviewCamera = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const padding = 20;
    const scaleX = (rect.width - padding) / 1080;
    const scaleY = (rect.height - padding) / 640;
    const fitScale = Math.max(0.55, Math.min(scaleX, scaleY, 0.95));
    setZoom(fitScale);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    fitOverviewCamera();
    const t = setTimeout(fitOverviewCamera, 150);
    window.addEventListener('resize', fitOverviewCamera);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', fitOverviewCamera);
    };
  }, [fitOverviewCamera]);

  // Non-passive wheel event listener so cursor over canvas zooms without scrolling the page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelNonPassive = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomFactor = e.deltaY < 0 ? 1.09 : 0.91;
      setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.5), 2.5));
    };

    el.addEventListener('wheel', handleWheelNonPassive, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheelNonPassive);
    };
  }, []);

  // Periodic authentic inter-agent conversations with visual laser beam links (Dynamic & Non-Looping)
  useEffect(() => {
    const chatInterval = setInterval(() => {
      const dialogue = dialogueEngine.getNextDialogue();
      if (!dialogue) return;

      const sim = simStateRef.current;
      const senderSim = sim[dialogue.from];
      const recipientSim = sim[dialogue.to];

      // Play subtle radio chirp
      try {
        if (soundEnabled) sfx?.playBlip?.(720);
      } catch {}

      // 1. Show sender message and laser link
      setActiveSpeech((prev) => ({ ...prev, [dialogue.from]: dialogue.text }));
      if (senderSim && recipientSim) {
        setActiveLaserLink({
          from: { x: senderSim.x, y: senderSim.y },
          to: { x: recipientSim.x, y: recipientSim.y },
        });
      }

      // Publish to officeBus for global activity log
      officeBus.publish({
        from: dialogue.from,
        fromName: dialogue.fromName,
        to: dialogue.to,
        toName: dialogue.toName,
        text: dialogue.text,
      });

      // Persist to Supabase office_messages table
      void officeSupabase.postMessage({
        sender_id: dialogue.from,
        sender_name: dialogue.fromName,
        sender_department: dialogue.topic.toUpperCase(),
        recipient_id: dialogue.to,
        recipient_name: dialogue.toName,
        content: dialogue.text,
        message_type: 'inter_agent_chat',
      });

      // 2. Recipient replies after 2.4s
      setTimeout(() => {
        try {
          if (soundEnabled) sfx?.playBlip?.(540);
        } catch {}
        setActiveSpeech((prev) => ({ ...prev, [dialogue.to]: dialogue.replyText }));

        void officeSupabase.postMessage({
          sender_id: dialogue.to,
          sender_name: dialogue.toName,
          recipient_id: dialogue.from,
          recipient_name: dialogue.fromName,
          content: dialogue.replyText,
          message_type: 'inter_agent_reply',
        });
      }, 2400);

      // 3. Clear speech bubbles & laser after 6.8s
      setTimeout(() => {
        setActiveSpeech((prev) => ({
          ...prev,
          [dialogue.from]: null,
          [dialogue.to]: null,
        }));
        setActiveLaserLink(null);
      }, 6800);
    }, 12000);

    return () => clearInterval(chatInterval);
  }, [soundEnabled]);

  // Autonomous Organic Routine: periodic break cycle (Canteen, Coffee, Gym, or Walk)
  useEffect(() => {
    // Only wander organically if in FOCUS_WORK mode
    const breakInterval = setInterval(() => {
      if (currentMode !== 'FOCUS_WORK') return;

      const agentList = agentsRef.current.filter((a) => a.id !== 'josiah');
      if (agentList.length === 0) return;

      // Pick 1 or 2 workers who are currently typing at their desk
      const candidate = agentList[Math.floor(Math.random() * agentList.length)];
      const sim = simStateRef.current;
      const state = sim[candidate.id];

      if (state && !state.isWalking && state.activity === 'typing' && state.breakTimer <= 0) {
        // Choose destination: 70% Canteen/Pantry for snack/coffee, 30% Gym/Tennis for workout
        const isFitness = Math.random() < 0.3;
        const targetList = isFitness ? FITNESS_SPOTS : CANTEEN_SPOTS;
        const target = targetList[Math.floor(Math.random() * targetList.length)];

        const path = calculateCorridorPath({ x: state.x, y: state.y }, target);
        state.waypoints = path;
        state.isWalking = true;
        state.isSeated = false;
        state.hasCoffee = !isFitness;
        state.activity = 'walking';
        state.breakTimer = isFitness ? 14 : 16; // Break duration in seconds

        if (path.length > 0) {
          state.targetX = path[0].x;
          state.targetY = path[0].y;
        }

        // Announce natural break
        officeBus.publish({
          from: candidate.id,
          fromName: candidate.name,
          to: 'josiah',
          toName: 'Josiah',
          text: isFitness
            ? 'Heading to the recreation gym for a quick fitness stretch.'
            : 'Taking a 5-minute coffee break at the canteen.',
        });
      }
    }, 18000);

    return () => clearInterval(breakInterval);
  }, [currentMode]);

  // Mode Handlers: Smooth A* Pathfinding and Interactive Camera Focus
  const switchOfficeMode = useCallback((newMode: OfficeMode) => {
    setCurrentMode(newMode);
    try {
      if (soundEnabled) {
        sfx?.playModeSwitch?.();
      }
    } catch {}

    // Smoothly pan & zoom camera to the active department/zone
    if (newMode === 'FOCUS_WORK') {
      setPan({ x: 80, y: 0 });
      setZoom(0.82);
    } else if (newMode === 'ALL_HANDS') {
      setPan({ x: 0, y: 20 });
      setZoom(1.05);
    } else if (newMode === 'COFFEE_BREAK') {
      setPan({ x: -160, y: -160 });
      setZoom(1.05);
    } else if (newMode === 'RECREATION') {
      setPan({ x: 280, y: -160 });
      setZoom(1.05);
    }

    const sim = simStateRef.current;
    agentsRef.current.forEach((agent, idx) => {
      const currentSim = sim[agent.id];
      if (!currentSim) return;

      const deskCoord = agent.desk_coord || DESK_CONFIGS[agent.id] || { x: 200, y: 340 };
      const finalTarget = getModeTargets(newMode, agent.id, idx, deskCoord);

      // Calculate safe multi-waypoint path through room doors and hallways
      const waypoints = calculateCorridorPath({ x: currentSim.x, y: currentSim.y }, finalTarget);

      currentSim.waypoints = waypoints;
      currentSim.isWalking = true;
      currentSim.isSeated = false;
      currentSim.hasCoffee = newMode === 'COFFEE_BREAK';
      currentSim.activity = 'walking';
      currentSim.breakTimer = 0; // Reset individual timer when overriding with office mode

      if (waypoints.length > 0) {
        currentSim.targetX = waypoints[0].x;
        currentSim.targetY = waypoints[0].y;
      }
    });
  }, [soundEnabled]);

  // 60 FPS Physics Simulation Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let frameTick = 0;

    const tick = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.005), 0.05); // Clamped delta
      frameTick++;

      const speedMultiplier = 1.0; // Strictly real-time 1x speed
      const walkSpeed = 68 * speedMultiplier; // Pixels per second
      const sim = simStateRef.current;
      let hasStateChanged = false;

      // Update every active agent
      Object.keys(sim).forEach((agentId) => {
        const state = sim[agentId];
        if (!state) return;

        // Guaranteed NaN Protection
        if (!Number.isFinite(state.x) || !Number.isFinite(state.y)) {
          const cfg = DESK_CONFIGS[agentId] || { x: 200, y: 340 };
          state.x = cfg.x;
          state.y = cfg.y;
        }

        // 1. Waypoint Pathfinding Movement
        if (state.isWalking) {
          const stepResult = stepAgentTowardsTarget(
            { x: state.x, y: state.y },
            { x: state.targetX, y: state.targetY },
            walkSpeed,
            dt,
            3.0
          );

          state.x = stepResult.next.x;
          state.y = stepResult.next.y;

          if (stepResult.dx !== 0) {
            state.facing = stepResult.dx > 0 ? 'right' : 'left';
          }

          if (frameTick % 6 === 0) {
            state.walkFrame = (state.walkFrame + 1) % 4;
          }

          if (stepResult.arrived) {
            // Advance to next waypoint
            state.waypoints.shift();
            if (state.waypoints.length > 0) {
              state.targetX = state.waypoints[0].x;
              state.targetY = state.waypoints[0].y;
            } else {
              // Reached final destination
              state.isWalking = false;

              if (currentMode === 'FOCUS_WORK') {
                if (state.breakTimer > 0) {
                  // Arrived at break location (Canteen or Gym)
                  state.isSeated = state.hasCoffee;
                  state.activity = state.hasCoffee ? 'eating_canteen' : 'working_out';
                } else {
                  // Arrived back at desk
                  state.isSeated = true;
                  state.hasCoffee = false;
                  state.activity = 'typing';
                }
              } else if (currentMode === 'COFFEE_BREAK') {
                state.isSeated = true;
                state.hasCoffee = true;
                state.activity = 'eating_canteen';
              } else if (currentMode === 'ALL_HANDS') {
                state.isSeated = false;
                state.hasCoffee = false;
                state.activity = 'at_meeting';
              } else if (currentMode === 'RECREATION') {
                state.isSeated = false;
                state.activity = 'working_out';
              }
            }
          }
          hasStateChanged = true;
        } else {
          // 2. Idle / Break Timer Count-down (Automatic return to desk after break)
          if (currentMode === 'FOCUS_WORK' && state.breakTimer > 0) {
            state.breakTimer -= dt * speedMultiplier;
            if (state.breakTimer <= 0) {
              // Break finished -> walk back to assigned desk
              const desk = DESK_CONFIGS[agentId] || { x: 200, y: 340 };
              const returnPath = calculateCorridorPath({ x: state.x, y: state.y }, { x: desk.x, y: desk.y });
              state.waypoints = returnPath;
              state.isWalking = true;
              state.isSeated = false;
              state.hasCoffee = false;
              state.activity = 'walking';
              if (returnPath.length > 0) {
                state.targetX = returnPath[0].x;
                state.targetY = returnPath[0].y;
              }
            }
          }

          // 3. Typing / Bob Animation Frame
          if (frameTick % 12 === 0) {
            state.walkFrame = (state.walkFrame + 1) % 4;
            hasStateChanged = true;
          }
        }
      });

      // Synchronize render state every 2 frames for smooth 60 FPS
      if (hasStateChanged && frameTick % 2 === 0) {
        startTransition(() => {
          setRenderPositions({ ...sim });
        });
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [speedMode, currentMode]);

  // Center camera only when user explicitly selects a NEW agent
  const prevSelectedAgentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedAgentId) {
      prevSelectedAgentRef.current = null;
      return;
    }
    // Only center if the user picked a different agent
    if (prevSelectedAgentRef.current !== selectedAgentId) {
      prevSelectedAgentRef.current = selectedAgentId;
      const pos = simStateRef.current[selectedAgentId];
      if (pos) {
        const targetPanX = -(pos.x - 540) * zoom;
        const targetPanY = -(pos.y - 310) * zoom;
        setPan({ x: targetPanX, y: targetPanY });
      }
    }
  }, [selectedAgentId, zoom]);

  // Mouse drag pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        switchOfficeMode('FOCUS_WORK');
      } else if (e.key === 'a' || e.key === 'A') {
        switchOfficeMode('ALL_HANDS');
      } else if (e.key === 'c' || e.key === 'C') {
        switchOfficeMode('COFFEE_BREAK');
      } else if (e.key === 'r' || e.key === 'R') {
        switchOfficeMode('RECREATION');
      } else if (e.key === 'Escape') {
        const josiah = agents.find((a) => a.id === 'josiah') || agents[0];
        if (josiah) onSelectAgent(josiah);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [agents, onSelectAgent, switchOfficeMode]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden transition-colors duration-500 ${
        isNightMode ? 'bg-[#05070d]' : 'bg-[#0a0d16]'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'default' }}
    >
      {/* ==================== HUD CONTROLS BAR ==================== */}
      <div className="absolute top-2 left-2 right-2 flex flex-wrap items-center justify-between gap-1.5 z-30 pointer-events-none">
        {/* Left: Brand Badge & Mode Switchers */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#111625]/95 border border-[#1e293b] shadow backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] font-bold text-slate-200 tracking-tight whitespace-nowrap">
              EASYUP HQ
            </span>
          </div>

          <div className="flex items-center gap-0.5 bg-[#111625]/95 p-0.5 rounded-md border border-[#1e293b] shadow backdrop-blur-md">
            <button
              type="button"
              onClick={() => switchOfficeMode('FOCUS_WORK')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded transition shadow cursor-pointer active:scale-95 whitespace-nowrap ${
                currentMode === 'FOCUS_WORK'
                  ? 'bg-blue-600 text-white font-bold ring-1 ring-blue-400 shadow-blue-500/20'
                  : 'text-slate-300 hover:bg-[#1e293b] hover:text-white'
              }`}
              title="Focus Work: Return all agents to department desks (Shortcut: F)"
            >
              <span>🖥️</span>
              <span>Focus Work</span>
            </button>

            <button
              type="button"
              onClick={() => switchOfficeMode('ALL_HANDS')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded transition shadow cursor-pointer active:scale-95 whitespace-nowrap ${
                currentMode === 'ALL_HANDS'
                  ? 'bg-purple-600 text-white font-bold ring-1 ring-purple-400 shadow-purple-500/20'
                  : 'text-slate-300 hover:bg-[#1e293b] hover:text-white'
              }`}
              title="All Hands Assembly: Assemble all agents around The Brain (Shortcut: A)"
            >
              <span>📢</span>
              <span>All Hands</span>
            </button>

            <button
              type="button"
              onClick={() => switchOfficeMode('COFFEE_BREAK')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded transition shadow cursor-pointer active:scale-95 whitespace-nowrap ${
                currentMode === 'COFFEE_BREAK'
                  ? 'bg-amber-600 text-white font-bold ring-1 ring-amber-400 shadow-amber-500/20'
                  : 'text-slate-300 hover:bg-[#1e293b] hover:text-white'
              }`}
              title="Pantry & Canteen: Head to espresso bar & dining lounge (Shortcut: C)"
            >
              <span>☕</span>
              <span>Pantry & Canteen</span>
            </button>

            <button
              type="button"
              onClick={() => switchOfficeMode('RECREATION')}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded transition shadow cursor-pointer active:scale-95 whitespace-nowrap ${
                currentMode === 'RECREATION'
                  ? 'bg-cyan-600 text-white font-bold ring-1 ring-cyan-400 shadow-cyan-500/20'
                  : 'text-slate-300 hover:bg-[#1e293b] hover:text-white'
              }`}
              title="Recreation Court & Fitness Gym: Workout & tennis rally (Shortcut: R)"
            >
              <span>🎾</span>
              <span>Rec & Gym</span>
            </button>
          </div>
        </div>

        {/* Right: Manila Real-Time Shift Badge, Audio Toggle, Overview Fit Button */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {/* Automatic Manila Standard Time Shift Badge */}
          <div
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded-md border shadow backdrop-blur-md whitespace-nowrap ${
              isNightMode
                ? 'bg-indigo-950/90 text-indigo-300 border-indigo-700/80 shadow-indigo-950/50'
                : 'bg-[#111625]/90 text-amber-300 border-[#2b244d] shadow-amber-950/20'
            }`}
            title="Automatically synchronized to Philippine Standard Time (UTC+8)"
          >
            <span>{isNightMode ? '🌙' : '☀️'}</span>
            <span className="font-semibold">
              PHT // {isNightMode ? 'NIGHT' : 'DAY'}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (sfx) {
                sfx.enabled = next;
                if (next) {
                  try {
                    sfx?.playBlip?.(700);
                  } catch {}
                }
              }
            }}
            className={`px-2 py-1 text-[11px] font-mono rounded-md border transition shadow whitespace-nowrap cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                : 'bg-[#111625]/90 text-slate-400 border-[#1e293b] hover:text-slate-200'
            }`}
          >
            {soundEnabled ? '🔊 AUDIO' : '🔇 MUTED'}
          </button>

          {/* Reset Zoom / Center Overview Button */}
          <button
            type="button"
            onClick={fitOverviewCamera}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-bold rounded-md bg-[#181330]/95 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-950 hover:border-cyan-400 transition shadow-lg whitespace-nowrap cursor-pointer"
            title="Reset to Full Overview Fit"
          >
            <span>🎯</span>
            <span>OVERVIEW</span>
          </button>
        </div>
      </div>

      {/* ==================== 2.5D ISOMETRIC VIEWPORT ==================== */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
        <div
          className="relative transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: '1080px',
            height: '640px',
            flexShrink: 0,
          }}
        >
          {/* ==================== SVG MAP & ARCHITECTURE ==================== */}
          <svg
            viewBox="0 0 1080 640"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
          >
            <defs>
              {/* Floor Patterns */}
              <pattern id="cyanGridTiles" width="22" height="13" patternUnits="userSpaceOnUse">
                <polygon points="0,6.5 11,0 22,6.5 11,13" fill="#062e3f" stroke="#0891b2" strokeWidth="0.8" />
              </pattern>

              <pattern id="oakWoodTiles" width="24" height="14" patternUnits="userSpaceOnUse">
                <polygon points="0,7 12,0 24,7 12,14" fill="#3b2011" stroke="#5c3317" strokeWidth="0.8" />
              </pattern>

              {/* Central Holographic Brain Glow */}
              <radialGradient id="brainHoloGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* ==================== 3D FLOATING EXTRUDED SLAB EDGES ==================== */}
            {/* Extruded Left/Bottom Edge */}
            <polygon
              points="15,315 15,340 460,670 460,615"
              fill="#0d0a1a"
              stroke="#1e1838"
              strokeWidth="1.5"
            />
            {/* Extruded Right/Bottom Edge */}
            <polygon
              points="460,615 460,670 1065,340 1065,315"
              fill="#140f26"
              stroke="#241c42"
              strokeWidth="1.5"
            />
            {/* Slab Perimeter Top Surface (Base Dark Purple Floor) */}
            <polygon
              points="540,15 1065,315 460,615 15,315"
              fill="#100c21"
              stroke="#312657"
              strokeWidth="2.5"
            />

            {/* Hallway Guidance Strip Lines */}
            <line x1="540" y1="30" x2="460" y2="600" stroke="#251d45" strokeWidth="20" strokeLinecap="round" />
            <line x1="30" y1="315" x2="1050" y2="315" stroke="#251d45" strokeWidth="20" strokeLinecap="round" />
            {/* Dual White Center Lines */}
            <line x1="540" y1="30" x2="460" y2="600" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="6 6" />
            <line x1="30" y1="315" x2="1050" y2="315" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="6 6" />

            {/* ==================== ZONE 1: OPERATIONS HUB (GREEN) ==================== */}
            <g>
              <polygon points="170,160 380,45 520,120 310,235" fill="#14532d" stroke="#22c55e" strokeWidth="2.5" />
              <polygon points="175,160 380,48 515,120 310,232" fill="#15803d" fillOpacity="0.85" />
              {/* Sleek Room Signage Badge */}
              <g transform="translate(345, 68)">
                <rect x="-75" y="-10" width="150" height="18" rx="4" fill="#052e16" stroke="#4ade80" strokeWidth="1.2" />
                <text x="0" y="3" textAnchor="middle" className="font-mono text-[9px] font-bold fill-emerald-200">
                  OPERATIONS HUB
                </text>
              </g>
              {/* Furniture: Whiteboard & Filing Cabinet */}
              <g transform="translate(480, 115)">
                <polygon points="-16,-16 0,-24 16,-16 0,-8" fill="#78350f" />
                <polygon points="-16,-16 0,-8 0,14 -16,6" fill="#92400e" />
                <line x1="-14" y1="-2" x2="-2" y2="4" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="-14" y1="5" x2="-2" y2="11" stroke="#facc15" strokeWidth="1.5" />
              </g>
              {/* Corner Potted Plants */}
              <g transform="translate(195, 180)">
                <polygon points="-4,0 4,0 3,7 -3,7" fill="#b45309" />
                <circle cx="-1" cy="-5" r="5" fill="#16a34a" />
                <circle cx="2" cy="-4" r="4.5" fill="#22c55e" />
              </g>
            </g>

            {/* ==================== ZONE 2: GROWTH LAB (BLUE) ==================== */}
            <g>
              <polygon points="40,240 210,140 280,210 110,310" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2.5" />
              <polygon points="45,240 210,143 275,210 110,307" fill="#1d4ed8" fillOpacity="0.85" />
              {/* Room Signage Badge */}
              <g transform="translate(160, 162)">
                <rect x="-60" y="-10" width="120" height="18" rx="4" fill="#0f172a" stroke="#60a5fa" strokeWidth="1.2" />
                <text x="0" y="3" textAnchor="middle" className="font-mono text-[9px] font-bold fill-blue-200">
                  GROWTH LAB
                </text>
              </g>
              {/* Analytics Metrics Screen */}
              <g transform="translate(80, 205)">
                <polygon points="0,-15 20,-5 20,10 0,0" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
                <line x1="4" y1="-7" x2="16" y2="0" stroke="#4ade80" strokeWidth="1.5" />
              </g>
            </g>

            {/* ==================== ZONE 3: ENGINEERING CORE (ELECTRIC INDIGO) ==================== */}
            <g>
              <polygon points="140,380 340,270 510,360 310,470" fill="#312e81" stroke="#6366f1" strokeWidth="2.5" />
              <polygon points="145,380 340,273 505,360 310,467" fill="#3730a3" fillOpacity="0.85" />
              {/* Room Signage Badge */}
              <g transform="translate(340, 290)">
                <rect x="-80" y="-10" width="160" height="18" rx="4" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.2" />
                <text x="0" y="3" textAnchor="middle" className="font-mono text-[9px] font-bold fill-indigo-200">
                  ENGINEERING CORE
                </text>
              </g>
              {/* High-Performance Server Rack Units */}
              <g transform="translate(170, 360)">
                <polygon points="0,-20 18,-10 18,15 0,5" fill="#090d16" stroke="#4f46e5" strokeWidth="1.2" />
                {/* Blinking Server Status LEDs */}
                <circle cx="5" cy="-8" r="1.5" fill="#22c55e" className="animate-pulse" />
                <circle cx="10" cy="-5" r="1.5" fill="#38bdf8" />
                <circle cx="15" cy="-2" r="1.5" fill="#22c55e" />
                <circle cx="5" cy="0" r="1.5" fill="#f59e0b" />
                <circle cx="10" cy="3" r="1.5" fill="#22c55e" className="animate-pulse" />
              </g>
            </g>

            {/* ==================== ZONE 4: QA & SECOPS NOC (NEON MAGENTA) ==================== */}
            <g>
              <polygon points="560,420 740,320 900,410 720,510" fill="#831843" stroke="#ec4899" strokeWidth="2.5" />
              <polygon points="565,420 740,323 895,410 720,507" fill="#9d174d" fillOpacity="0.85" />
              {/* Room Signage Badge */}
              <g transform="translate(740, 345)">
                <rect x="-85" y="-10" width="170" height="18" rx="4" fill="#4a044e" stroke="#f472b6" strokeWidth="1.2" />
                <text x="0" y="3" textAnchor="middle" className="font-mono text-[9px] font-bold fill-pink-200">
                  QA & SECOPS NOC
                </text>
              </g>
              {/* NOC Security Threat Matrix Screen */}
              <g transform="translate(860, 385)">
                <polygon points="-25,-12 0,-24 25,-12 0,0" fill="#0f172a" stroke="#ec4899" strokeWidth="1.2" />
                <polygon points="-25,-12 0,0 0,20 -25,8" fill="#1e1b4b" />
                <circle cx="-10" cy="4" r="2" fill="#22c55e" />
                <circle cx="0" cy="8" r="2" fill="#22c55e" />
                <circle cx="10" cy="12" r="2" fill="#38bdf8" />
              </g>
            </g>

            {/* ==================== ZONE 5: INTELLIGENCE LAB (CYAN TILED) ==================== */}
            <g>
              <polygon points="660,160 850,55 990,135 800,240" fill="url(#cyanGridTiles)" stroke="#06b6d4" strokeWidth="2.5" />
              {/* Room Signage Badge */}
              <g transform="translate(830, 80)">
                <rect x="-80" y="-10" width="160" height="18" rx="4" fill="#082f49" stroke="#22d3ee" strokeWidth="1.2" />
                <text x="0" y="3" textAnchor="middle" className="font-mono text-[9px] font-bold fill-cyan-200">
                  INTELLIGENCE LAB
                </text>
              </g>
              {/* Neural Model Visualizer Rig */}
              <g transform="translate(940, 105)">
                <polygon points="-16,-16 0,-24 16,-16 0,-8" fill="#083344" stroke="#06b6d4" strokeWidth="1" />
                <circle cx="0" cy="-16" r="3" fill="#38bdf8" className="animate-pulse" />
              </g>
            </g>

            {/* ==================== ZONE 6: COMMAND CENTER (OBSIDIAN & AMBER) ==================== */}
            <g>
              <polygon points="600,280 770,190 910,270 740,360" fill="#090d16" stroke="#f59e0b" strokeWidth="2.5" />
              <polygon points="605,280 770,193 905,270 740,357" fill="#0f172a" fillOpacity="0.9" />
              {/* Room Signage Badge */}
              <g transform="translate(755, 215)">
                <rect x="-80" y="-10" width="160" height="18" rx="4" fill="#1c1917" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="0" y="3" textAnchor="middle" className="font-mono text-[9px] font-bold fill-amber-200">
                  COMMAND CENTER
                </text>
              </g>
            </g>

            {/* ==================== ZONE 7: THE BRAIN (CENTRAL CORE) ==================== */}
            <g transform="translate(510, 290)">
              {/* Outer Circular Obsidian Platform */}
              <ellipse cx="0" cy="0" rx="80" ry="46" fill="#090d16" stroke="#f59e0b" strokeWidth="2.5" />
              <ellipse cx="0" cy="0" rx="66" ry="38" fill="#0c1322" stroke="#06b6d4" strokeWidth="1.8" strokeDasharray="8 4" />
              {/* Glowing Holographic Energy Core */}
              <ellipse cx="0" cy="-6" rx="30" ry="18" fill="url(#brainHoloGlow)" />
              <circle cx="0" cy="-10" r="14" fill="#38bdf8" fillOpacity="0.8" className="animate-pulse" />
              <ellipse cx="0" cy="-10" rx="20" ry="6" fill="none" stroke="#ffffff" strokeWidth="1.2" />
              {/* Floating Quantum Particles */}
              <circle cx="-12" cy="-18" r="1.5" fill="#a7f3d0" className="animate-ping" />
              <circle cx="14" cy="-22" r="2" fill="#67e8f9" className="animate-pulse" />
              <circle cx="6" cy="-28" r="1.5" fill="#fde047" />

              {/* Core Badge */}
              <g transform="translate(0, 24)">
                <rect x="-45" y="-9" width="90" height="16" rx="4" fill="#020617" stroke="#38bdf8" strokeWidth="1.2" />
                <text x="0" y="3" textAnchor="middle" className="font-mono text-[9px] font-bold fill-cyan-300">
                  THE BRAIN
                </text>
              </g>
            </g>

            {/* ==================== ZONE 8: PANTRY & CANTEEN (OAK PARQUET DINING) ==================== */}
            <g>
              <polygon points="460,460 620,380 730,440 570,520" fill="url(#oakWoodTiles)" stroke="#d97706" strokeWidth="2.5" />
              {/* Sleek Room Signage Badge */}
              <g transform="translate(605, 395)">
                <rect x="-95" y="-10" width="190" height="18" rx="4" fill="#291605" stroke="#f59e0b" strokeWidth="1.2" />
                <text x="0" y="3" textAnchor="middle" className="font-mono text-[9px] font-bold fill-amber-200">
                  PANTRY & CANTEEN
                </text>
              </g>
              {/* Espresso Machine Bar Counter */}
              <g transform="translate(565, 475)">
                <polygon points="-16,-10 0,-18 16,-10 0,-2" fill="#451a03" stroke="#78350f" strokeWidth="1" />
                <polygon points="-16,-10 0,-2 0,10 -16,2" fill="#78350f" />
                <polygon points="0,-2 16,-10 16,2 0,10" fill="#92400e" />
                {/* Silver Espresso Machine with Steam */}
                <rect x="-8" y="-18" width="14" height="10" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" rx="1" />
                <circle cx="-1" cy="-14" r="1.5" fill="#ef4444" />
                <circle cx="3" cy="-14" r="1.5" fill="#22c55e" />
              </g>
              {/* Canteen Dining Table with Coffee Cups */}
              <g transform="translate(635, 480)">
                <polygon points="-14,-7 0,-14 14,-7 0,0" fill="#5c3317" stroke="#92400e" strokeWidth="0.8" />
                <polygon points="-14,-7 0,0 0,6 -14,-1" fill="#451a03" />
                <polygon points="0,0 14,-7 14,-1 0,6" fill="#78350f" />
                {/* Mugs / Snack plate */}
                <circle cx="-4" cy="-5" r="1.8" fill="#f8fafc" />
                <circle cx="4" cy="-5" r="1.8" fill="#38bdf8" />
              </g>
              {/* Lounge Sofa */}
              <g transform="translate(670, 495)">
                <polygon points="-18,-8 0,-16 18,-8 0,0" fill="#3b0764" />
                <polygon points="-18,-8 0,0 0,8 -18,0" fill="#581c87" />
                <polygon points="0,0 18,-8 18,0 0,8" fill="#6b21a8" />
              </g>
            </g>

            {/* ==================== ZONE 9: MEETING ROOM / ALL-HANDS (LAVENDER) ==================== */}
            <g>
              <polygon points="380,480 500,410 580,455 460,525" fill="#581c87" stroke="#a855f7" strokeWidth="2.5" />
              <polygon points="385,480 500,413 575,455 460,522" fill="#6b21a8" fillOpacity="0.85" />
              {/* Conference Table */}
              <g transform="translate(480, 470)">
                <polygon points="-24,-12 0,-22 24,-12 0,-2" fill="#1e1b4b" stroke="#c084fc" strokeWidth="1" />
                <polygon points="-24,-12 0,-2 0,6 -24,-4" fill="#312e81" />
                <polygon points="0,-2 24,-12 24,-4 0,6" fill="#3730a3" />
              </g>
            </g>

            {/* ==================== ZONE 10: RECREATION AREA (TENNIS & FITNESS) ==================== */}
            <g>
              {/* Fitness Gym Floor (Dark Slate Rubber) */}
              <polygon points="40,430 160,370 230,410 110,470" fill="#1e293b" stroke="#475569" strokeWidth="2" />
              {/* Gym Sign */}
              <g transform="translate(130, 385)">
                <rect x="-40" y="-8" width="80" height="14" rx="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
                <text x="0" y="2" textAnchor="middle" className="font-mono text-[8px] font-bold fill-slate-300">
                  FITNESS GYM
                </text>
              </g>
              {/* Weight Bench & Barbell */}
              <g transform="translate(120, 440)">
                <line x1="-12" y1="-4" x2="12" y2="4" stroke="#94a3b8" strokeWidth="2.5" />
                <circle cx="-12" cy="-4" r="3.5" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
                <circle cx="12" cy="4" r="3.5" fill="#0f172a" stroke="#ef4444" strokeWidth="1" />
              </g>
              {/* Treadmill with Animated Screen */}
              <g transform="translate(150, 430)">
                <polygon points="-6,-6 0,-10 8,-6 2,-2" fill="#090d16" stroke="#64748b" strokeWidth="0.8" />
                <line x1="2" y1="-2" x2="6" y2="-8" stroke="#38bdf8" strokeWidth="1.5" />
              </g>

              {/* Tennis / Pickleball Court (Vivid Blue Court with Net) */}
              <polygon points="120,530 250,460 340,510 210,580" fill="#0284c7" stroke="#38bdf8" strokeWidth="2.5" />
              {/* Court Boundary Lines */}
              <polygon points="135,530 245,470 325,510 215,570" fill="none" stroke="#ffffff" strokeWidth="1.5" />
              {/* Tennis Net with posts */}
              <line x1="175" y1="500" x2="285" y2="540" stroke="#ffffff" strokeWidth="3" strokeDasharray="3 1" />
              <circle cx="175" cy="500" r="2" fill="#f8fafc" />
              <circle cx="285" cy="540" r="2" fill="#f8fafc" />
              {/* Tennis Court Sign */}
              <g transform="translate(230, 480)">
                <rect x="-45" y="-8" width="90" height="14" rx="3" fill="#082f49" stroke="#38bdf8" strokeWidth="1" />
                <text x="0" y="2" textAnchor="middle" className="font-mono text-[8px] font-bold fill-sky-200">
                  TENNIS COURT
                </text>
              </g>
            </g>

            {/* ==================== ACTIVE LASER INTER-AGENT LINK ==================== */}
            {activeLaserLink && (
              <g>
                <line
                  x1={activeLaserLink.from.x}
                  y1={activeLaserLink.from.y - 12}
                  x2={activeLaserLink.to.x}
                  y2={activeLaserLink.to.y - 12}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  className="animate-pulse"
                />
                <circle cx={activeLaserLink.from.x} cy={activeLaserLink.from.y - 12} r="3" fill="#38bdf8" />
                <circle cx={activeLaserLink.to.x} cy={activeLaserLink.to.y - 12} r="3" fill="#22c55e" />
              </g>
            )}
          </svg>

          {/* ==================== FURNITURE RIGS LAYER (DESKS & MONITORS) ==================== */}
          {Object.entries(DESK_CONFIGS).map(([agentId, desk]) => {
            const isFounder = desk.monitors === 3;
            return (
              <div
                key={`desk-${agentId}`}
                className="absolute pointer-events-none"
                style={{
                  left: `${desk.x - (isFounder ? 28 : 20)}px`,
                  top: `${desk.y - 14}px`,
                  zIndex: Math.max(1, Math.round(desk.y)),
                }}
              >
                {/* 2.5D Isometric Desk Rig */}
                <svg
                  width={isFounder ? 56 : 40}
                  height={32}
                  viewBox={`0 0 ${isFounder ? 56 : 40} 32`}
                  className="overflow-visible"
                >
                  {/* Desk Surface */}
                  {isFounder ? (
                    // Josiah's Executive L-Desk
                    <>
                      <polygon points="0,12 28,0 56,12 28,24" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.2" />
                      <polygon points="0,12 28,24 28,30 0,18" fill="#0f172a" />
                      <polygon points="28,24 56,12 56,18 28,30" fill="#334155" />
                    </>
                  ) : (
                    // Standard Studio Desk
                    <>
                      <polygon points="0,10 20,0 40,10 20,20" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                      <polygon points="0,10 20,20 20,26 0,16" fill="#0f172a" />
                      <polygon points="20,20 40,10 40,16 20,26" fill="#334155" />
                    </>
                  )}

                  {/* Dual or Triple Glowing Monitors */}
                  {isFounder ? (
                    // Josiah's Triple Monitor Setup
                    <>
                      {/* Left Screen */}
                      <polygon points="8,4 16,0 16,8 8,12" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
                      {/* Center Screen */}
                      <polygon points="20,2 34,2 34,10 20,10" fill="#2563eb" stroke="#60a5fa" strokeWidth="0.8" />
                      {/* Right Screen */}
                      <polygon points="38,0 46,4 46,12 38,8" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
                    </>
                  ) : (
                    // Standard Dual Monitors
                    <>
                      <polygon points="6,4 16,0 16,7 6,11" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />
                      <polygon points="20,0 30,4 30,11 20,7" fill="#0f172a" stroke="#22c55e" strokeWidth="0.8" />
                    </>
                  )}
                </svg>
              </div>
            );
          })}

          {/* ==================== DYNAMIC AGENTS LAYER (SORTED BY DEPTH) ==================== */}
          {agents.map((agent) => {
            const sim = renderPositions[agent.id] || {
              x: agent.desk_coord?.x || 200,
              y: agent.desk_coord?.y || 340,
              isWalking: false,
              walkFrame: 0,
              facing: 'right',
              hasCoffee: false,
              isSeated: true,
              activity: 'typing',
              breakTimer: 0,
            };

            const isSelected = selectedAgentId === agent.id;
            const speechText = activeSpeech[agent.id];
            const safeX = Number.isFinite(sim.x) ? sim.x : 200;
            const safeY = Number.isFinite(sim.y) ? sim.y : 340;
            const zIndexSafe = Math.max(10, Math.round(safeY) + 20);

            return (
              <div
                key={agent.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAgent(agent);
                  if (soundEnabled) sfx?.playSelect?.();
                }}
                className="absolute cursor-pointer transition-transform duration-75 hover:scale-110"
                style={{
                  left: `${safeX - 19}px`,
                  top: `${safeY - 32}px`,
                  zIndex: zIndexSafe,
                }}
              >
                {/* Selection Highlight Reticle */}
                {isSelected && (
                  <div className="absolute -inset-2 rounded-full border-2 border-amber-400 bg-amber-400/20 animate-pulse pointer-events-none" />
                )}

                {/* Floating Nameplate with Status Dot */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#090d16]/95 border border-slate-700/80 shadow-md pointer-events-none whitespace-nowrap">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      agent.status === 'working'
                        ? 'bg-emerald-400 animate-pulse'
                        : agent.status === 'awaiting_approval'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="font-mono text-[9px] font-bold text-slate-100 tracking-tight">
                    {agent.name}
                  </span>
                </div>

                {/* Typewriter Speech Bubble */}
                {speechText && (
                  <div className="absolute -top-14 left-1/2 -translate-x-1/2 max-w-[200px] px-2.5 py-1.5 rounded-lg bg-[#0f172a] border border-cyan-400/80 text-cyan-200 text-[10px] font-mono shadow-2xl z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                    <p className="leading-tight">{speechText}</p>
                    {/* Speech bubble tail pointer */}
                    <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#0f172a] border-r border-b border-cyan-400/80" />
                  </div>
                )}

                {/* Pixel-Art Worker Sprite */}
                <PixelSprite
                  id={agent.id}
                  name={agent.name}
                  color={agent.color || '#3b82f6'}
                  hair={agent.hair || '#1e293b'}
                  skin={agent.skin || '#fcd34d'}
                  size={38}
                  isWalking={sim.isWalking}
                  walkFrame={sim.walkFrame}
                  isTyping={sim.activity === 'typing' && !sim.isWalking}
                  facing={sim.facing}
                  hasCoffee={sim.hasCoffee}
                  isSeated={sim.isSeated}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== INTERACTIVE MINIMAP HUD (BOTTOM RIGHT) ==================== */}
      <div className="absolute bottom-3 right-3 w-44 h-28 rounded-lg bg-[#090d16]/95 border border-[#1e293b] p-1.5 shadow-2xl backdrop-blur-md pointer-events-auto z-20 flex flex-col justify-between">
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
          <span className="font-bold text-slate-200">FACILITY MINIMAP</span>
          <span className="text-emerald-400">23 ACTIVE</span>
        </div>

        {/* Minimap Canvas Area */}
        <div className="relative w-full flex-1 mt-1 rounded bg-[#0f172a] overflow-hidden border border-slate-800">
          {/* Room Boundaries Outline on Minimap */}
          <svg viewBox="0 0 1080 640" className="w-full h-full">
            <polygon points="540,15 1065,315 460,615 15,315" fill="#130f24" stroke="#312657" strokeWidth="8" />
            <polygon points="170,160 380,45 520,120 310,235" fill="#166534" />
            <polygon points="40,240 210,140 280,210 110,310" fill="#1e3a8a" />
            <polygon points="140,380 340,270 510,360 310,470" fill="#312e81" />
            <polygon points="560,420 740,320 900,410 720,510" fill="#831843" />
            <polygon points="660,160 850,55 990,135 800,240" fill="#082b3d" />
            <polygon points="600,280 770,190 910,270 740,360" fill="#0f172a" stroke="#f59e0b" strokeWidth="4" />
            <ellipse cx="510" cy="290" rx="70" ry="40" fill="#090d16" stroke="#38bdf8" strokeWidth="6" />

            {/* Agent Dots on Minimap */}
            {agents.map((ag) => {
              const pos = renderPositions[ag.id] || { x: 200, y: 340 };
              const isLead = ag.id === 'josiah';
              return (
                <circle
                  key={`map-dot-${ag.id}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={isLead ? 16 : 10}
                  fill={isLead ? '#38bdf8' : selectedAgentId === ag.id ? '#facc15' : '#22c55e'}
                />
              );
            })}
          </svg>

          {/* Current Camera Viewport Rect on Minimap */}
          <div
            className="absolute border border-amber-400/80 bg-amber-400/10 pointer-events-none rounded"
            style={{
              left: `${Math.max(0, Math.min(100, 50 - pan.x * 0.05))}%`,
              top: `${Math.max(0, Math.min(100, 50 - pan.y * 0.05))}%`,
              width: `${Math.max(20, Math.min(80, 50 / zoom))}%`,
              height: `${Math.max(20, Math.min(80, 50 / zoom))}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>

        {/* Speed / Mode Indicator in Minimap Footer */}
        <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 mt-0.5">
          <span>MODE: {currentMode.replace('_', ' ')}</span>
          <span className="text-amber-400 font-semibold">{speedMode}</span>
        </div>
      </div>
    </div>
  );
}
