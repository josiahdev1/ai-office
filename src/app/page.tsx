'use client';

import React, { useState, useEffect } from 'react';
import { Agent, Approval } from '@/components/office/types';
import { IsometricOffice } from '@/components/office/IsometricOffice';
import { PixelSprite } from '@/components/office/pixel-sprites';
import { sfx } from '@/components/office/audio';
import { officeBus } from '@/lib/office/bus';

export default function EasyUpOfficeHQ() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [agentSearch, setAgentSearch] = useState<string>('');
  const [speedMode, setSpeedMode] = useState<'1x' | '2x' | '5x'>('1x');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [directiveInput, setDirectiveInput] = useState('');
  const [timeString, setTimeString] = useState('2026.11.05  08:20:00 GMT+0800');

  // Completed items list for "DONE TODAY" card
  const [doneToday, setDoneToday] = useState([
    { id: 'done-1', title: '2.5D Isometric Engine Deployed (23 Agents)', agent: 'Josiah', time: '08:15 AM' },
    { id: 'done-2', title: 'Vitest Unit Suite Passing (12/12)', agent: 'Gian', time: '08:10 AM' },
    { id: 'done-3', title: 'OWASP Top 10 Security Audit Verified', agent: 'Khent', time: '07:55 AM' },
    { id: 'done-4', title: 'Gemini 2.5 Flash Benchmarking Complete', agent: 'Roy Jhan', time: '07:42 AM' },
  ]);

  // Real-time Clock ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const time = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setTimeString(`${year}.${month}.${day}  ${time} GMT+0800`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Subscribe to live inter-agent message bus for dynamic activity logs
  useEffect(() => {
    const unsubscribe = officeBus.subscribe((msg) => {
      const logLine = `[COMM] ${msg.fromName} -> ${msg.toName}: "${msg.text}"`;
      setLogs((prev) => [logLine, ...prev].slice(0, 30));
    });
    return () => unsubscribe();
  }, []);

  // Real-time 3s polling synchronization with brain/live_status.json
  useEffect(() => {
    let isMounted = true;

    async function syncOfficeState() {
      try {
        const res = await fetch('/api/office/status');
        const json = await res.json();
        if (isMounted && json.ok && json.data) {
          const fleet: Agent[] = json.data.agents || [];
          setAgents(fleet);
          setApprovals(json.data.approvals || []);
          if (json.data.logs && json.data.logs.length > 0) {
            setLogs((prev) => {
              const combined = [...json.data.logs, ...prev];
              return Array.from(new Set(combined)).slice(0, 30);
            });
          }

          setSelectedAgent((prev) => {
            if (!prev) {
              return fleet.find((a) => a.id === 'josiah') || fleet[0] || null;
            }
            const updated = fleet.find((a) => a.id === prev.id);
            return updated || prev;
          });
        }
      } catch (err) {
        console.error('Failed to sync office state:', err);
      }
    }

    void syncOfficeState();
    const pollInterval = setInterval(() => {
      void syncOfficeState();
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, []);

  // Handle Josiah's Go-Signal authorization
  const handleGoSignal = async (approvalId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      sfx?.playApproval?.();
    } else {
      sfx?.playReject?.();
    }

    const item = approvals.find((a) => a.id === approvalId);
    if (action === 'approve' && item) {
      setDoneToday((prev) => [
        {
          id: `done-${Date.now()}`,
          title: item.title,
          agent: item.agent_name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ]);
    }

    setApprovals((prev) => prev.filter((a) => a.id !== approvalId));

    try {
      const res = await fetch('/api/office/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, action }),
      });
      const data = await res.json();
      if (data.ok) {
        setApprovals(data.remaining || []);
        if (data.logs) {
          setLogs((prev) => [...data.logs, ...prev].slice(0, 30));
        }
      }
    } catch (err) {
      console.error('Error submitting go-signal:', err);
    }
  };

  // Dispatch directive to selected agent using real LLM execution route
  const handleDispatchDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveInput.trim() || !selectedAgent) return;
    setIsSubmitting(true);
    sfx?.playTrigger?.();

    const taskText = directiveInput.trim();
    setDirectiveInput('');

    try {
      const res = await fetch('/api/office/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          task: taskText,
        }),
      });
      const data = await res.json();

      if (data.ok && data.data) {
        setAgents(data.data.agents || []);
        setApprovals(data.data.approvals || []);
        if (data.data.logs) {
          setLogs(data.data.logs);
        }
        const updated = (data.data.agents as Agent[]).find((a) => a.id === selectedAgent.id);
        if (updated) setSelectedAgent(updated);

        // If completed without requiring approval, add to Done Today
        if (data.result && !data.result.requiresGoSignal) {
          setDoneToday((prev) => [
            {
              id: `done-${Date.now()}`,
              title: taskText,
              agent: selectedAgent.name,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
            ...prev,
          ]);
        }
      }
    } catch (err) {
      console.error('Error dispatching directive:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const workingAgents = agents.filter((a) => a.status === 'working');

  // Filter agents by department room and search query
  const filteredAgents = agents.filter((a) => {
    const matchesRoom =
      roomFilter === 'ALL'
        ? true
        : a.room.toLowerCase().includes(roomFilter.toLowerCase());

    const matchesSearch =
      agentSearch.trim() === ''
        ? true
        : a.name.toLowerCase().includes(agentSearch.toLowerCase()) ||
          a.role.toLowerCase().includes(agentSearch.toLowerCase());

    return matchesRoom && matchesSearch;
  });

  const departmentFilters = [
    { label: 'ALL', count: agents.length },
    { label: 'Engineering Core', count: agents.filter((a) => a.room === 'Engineering Core').length },
    { label: 'QA & SecOps NOC', count: agents.filter((a) => a.room === 'QA & SecOps NOC').length },
    { label: 'Operations Hub', count: agents.filter((a) => a.room === 'Operations Hub').length },
    { label: 'Growth Lab', count: agents.filter((a) => a.room === 'Growth Lab').length },
    { label: 'Intelligence Lab', count: agents.filter((a) => a.room === 'Intelligence Lab').length },
    { label: 'Command Center', count: agents.filter((a) => a.room === 'Command Center').length },
  ];

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#0a0815] text-slate-100 overflow-x-hidden font-sans select-none">
      {/* ========================================================================= */}
      {/* 1. TOP WINDOW TITLEBAR (Exact match to Image 5) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#120e24] border-b border-[#231b40]">
        {/* macOS Traffic Light Dots */}
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
          <span className="w-3 h-3 rounded-full bg-[#10b981]" />
        </div>

        {/* Center Search / App Title Capsule */}
        <div className="flex items-center gap-2 px-8 py-1 rounded-full bg-[#1a1433] border border-[#30255c] shadow-inner">
          <span className="font-mono text-xs font-bold text-amber-400 tracking-wider whitespace-nowrap">
            EASYUP SOFTWARE SOLUTION // HQ COMMAND
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:inline whitespace-nowrap">LIVE 1X PACE</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-HEADER METADATA BAR (Exact match to Image 5) */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-[#0f0c1e] border-b border-[#211a3b] gap-3">
        {/* Left: Brand & Manila Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-amber-400 tracking-wider whitespace-nowrap">
              EASYUP
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold whitespace-nowrap">
              HQ
            </span>
          </div>
          <span className="text-xs font-mono text-slate-400 font-semibold tracking-tight whitespace-nowrap">
            {timeString}
          </span>
        </div>

        {/* Right: Telemetry Stat Chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#181330] border border-[#30255a] text-xs font-mono text-cyan-300 whitespace-nowrap">
            <span>FLEET:</span>
            <span className="font-bold text-white">{agents.length}/{agents.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#181330] border border-emerald-600/70 text-xs font-mono text-emerald-300 whitespace-nowrap">
            <span>DONE TODAY:</span>
            <span className="font-bold text-white">{doneToday.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#241712] border border-amber-500/80 text-xs font-mono text-amber-300 whitespace-nowrap">
            <span>IN PROG:</span>
            <span className="font-bold text-white">{workingAgents.length}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE (UPPER SECTION: 68% 2.5D CANVAS + 32% RIGHT CARDS) */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row p-3 gap-3 flex-1">
        {/* UPPER-LEFT 68%: ISOMETRIC 2.5D OFFICE ENGINE (Full Viewport Auto-Fit) */}
        <div className="lg:w-[68%] min-h-[500px] lg:min-h-[580px] h-[580px] flex flex-col rounded-xl overflow-hidden shadow-2xl">
          <IsometricOffice
            agents={agents}
            approvals={approvals}
            onSelectAgent={(agent) => setSelectedAgent(agent)}
            selectedAgentId={selectedAgent?.id}
            speedMode={speedMode}
            onSpeedChange={setSpeedMode}
          />
        </div>

        {/* UPPER-RIGHT 32%: 3 STACKED COCKPIT CARDS (Exact match to Image 5) */}
        <div className="lg:w-[32%] flex flex-col gap-3 min-w-[320px]">
          {/* CARD 1: IN PROGRESS (N) */}
          <div className="flex-1 flex flex-col rounded-xl bg-[#120e24] border border-[#261e47] p-3.5 shadow-lg overflow-hidden max-h-[220px]">
            <div className="flex items-center justify-between pb-2 border-b border-[#211a3b] shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="font-mono text-xs font-bold text-cyan-300 uppercase tracking-wide whitespace-nowrap">
                  IN PROGRESS ({workingAgents.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">LIVE SPRINT</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
              {workingAgents.map((ag) => (
                <div
                  key={ag.id}
                  onClick={() => setSelectedAgent(ag)}
                  className={`p-2 rounded-lg transition cursor-pointer border ${
                    selectedAgent?.id === ag.id
                      ? 'bg-[#1e173b] border-cyan-500'
                      : 'bg-[#181330]/80 hover:bg-[#1f183d] border-[#291f4a]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white uppercase">{ag.name}</span>
                    <span className="text-cyan-400 font-bold">{ag.progress_pct ?? 75}%</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono truncate mt-0.5">
                    {ag.current_task || 'Active development task'}
                  </p>
                  <div className="w-full h-1.5 rounded-full bg-[#0a0714] overflow-hidden mt-1.5">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${ag.progress_pct ?? 75}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CARD 2: WAITING FOR YOU (N) — JOSIAH'S GO-SIGNAL GATEWAY */}
          <div className="flex-1 flex flex-col rounded-xl bg-[#161026] border border-amber-500/40 p-3.5 shadow-lg overflow-hidden max-h-[240px]">
            <div className="flex items-center justify-between pb-2 border-b border-[#2b2045] shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <h3 className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">
                  WAITING FOR YOU ({approvals.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-400 font-bold whitespace-nowrap">GO-SIGNAL</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
              {approvals.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-3">
                  <span className="text-2xl mb-1">✨</span>
                  <p className="font-mono text-xs font-bold text-slate-300">ALL GO-SIGNALS CLEARED</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    All client emails, releases & database migrations signed off.
                  </p>
                </div>
              ) : (
                approvals.map((app) => (
                  <div
                    key={app.id}
                    className="p-2.5 rounded-lg bg-[#1f1638] border border-[#3b2b63] flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600 font-semibold uppercase whitespace-nowrap">
                        {app.type}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">by {app.agent_name}</span>
                    </div>

                    <h4 className="font-mono text-xs font-bold text-white leading-snug">
                      {app.title}
                    </h4>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleGoSignal(app.id, 'reject')}
                        className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-mono transition whitespace-nowrap"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleGoSignal(app.id, 'approve')}
                        className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] font-mono transition shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                      >
                        Grant Go-Signal
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CARD 3: DONE TODAY (N) */}
          <div className="flex flex-col rounded-xl bg-[#120e24] border border-[#261e47] p-3 shadow-lg overflow-hidden max-h-[140px]">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#211a3b] shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h3 className="font-mono text-xs font-bold text-emerald-300 uppercase tracking-wide whitespace-nowrap">
                  DONE TODAY ({doneToday.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">VERIFIED</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 pr-1">
              {doneToday.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-xs font-mono p-1 rounded bg-[#181330]"
                >
                  <span className="text-slate-300 truncate max-w-[200px]">✓ {item.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. HORIZONTAL ROOM / DEPARTMENT FILTER BAR */}
      {/* ========================================================================= */}
      <div className="px-3 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-3 rounded-xl bg-[#120e24] border border-[#261e47] shadow-lg">
          {departmentFilters.map((dep) => {
            const isActive = roomFilter === dep.label;
            return (
              <button
                key={dep.label}
                onClick={() => {
                  setRoomFilter(dep.label);
                  sfx?.playBlip?.(540);
                }}
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-[#1a1433] text-slate-300 hover:text-white border border-[#30255a]'
                }`}
              >
                <span>{dep.label}</span>
                <span className="text-[10px] opacity-80">({dep.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. THREE BOTTOM DATA COLUMNS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-3 pb-4">
        {/* COLUMN 1: TEAM TODAY */}
        <div className="flex flex-col rounded-xl bg-[#120e24] border border-[#261e47] p-3.5 shadow-lg max-h-[320px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#211a3b]">
            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">
              TEAM TODAY ({filteredAgents.length})
            </h3>
            {/* Quick Filter Search */}
            <input
              type="text"
              value={agentSearch}
              onChange={(e) => setAgentSearch(e.target.value)}
              placeholder="Search agent..."
              className="px-2 py-0.5 rounded bg-[#0a0714] border border-[#291f4a] text-[10px] font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-28"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
            {filteredAgents.map((ag) => (
              <div
                key={ag.id}
                onClick={() => setSelectedAgent(ag)}
                className={`p-2 rounded-lg transition cursor-pointer flex items-center justify-between border ${
                  selectedAgent?.id === ag.id
                    ? 'bg-[#1f173b] border-amber-500 shadow'
                    : 'bg-[#181330] hover:bg-[#1e173b] border-[#291f4a]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <PixelSprite
                    id={ag.id}
                    color={ag.color}
                    hair={ag.hair}
                    skin={ag.skin}
                    size={28}
                  />
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-white truncate">{ag.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono truncate">{ag.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded uppercase whitespace-nowrap ${
                      ag.status === 'working'
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {ag.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: RUNNING GOAL LIST */}
        <div className="flex flex-col rounded-xl bg-[#120e24] border border-[#261e47] p-3.5 shadow-lg max-h-[320px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#211a3b]">
            <h3 className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wide whitespace-nowrap">
              RUNNING GOAL LIST
            </h3>
            <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">Q4 SPRINT</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-2 pr-1">
            <div className="p-2.5 rounded-lg bg-[#181330] border border-[#291f4a] flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400 font-bold whitespace-nowrap">1. 2.5D ISOMETRIC ENGINE</span>
                <span className="text-emerald-400 font-bold whitespace-nowrap">✓ COMPLETED</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                Extruded 3D floating slab, 10 color-coded rooms, and A* corridor navigation for 23 agents.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#181330] border border-[#291f4a] flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-bold whitespace-nowrap">2. MULTI-PROVIDER LLM RUNTIME</span>
                <span className="text-emerald-400 font-bold whitespace-nowrap">✓ ACTIVE</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                Gemini, Claude 3.5 Sonnet, and OpenAI hierarchy with resilient fallback and SSE streaming.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-[#181330] border border-[#291f4a] flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-purple-400 font-bold whitespace-nowrap">3. HUMAN-IN-THE-LOOP GO-SIGNAL</span>
                <span className="text-amber-400 font-bold whitespace-nowrap">ACTIVE RAILS</span>
              </div>
              <p className="text-[11px] text-slate-300 font-mono">
                Mandatory Go-Signal gating on production deployments, emails, and database schema mutations.
              </p>
            </div>
          </div>
        </div>

        {/* COLUMN 3: RAW ACTIVITY LOG */}
        <div className="flex flex-col rounded-xl bg-[#120e24] border border-[#261e47] p-3.5 shadow-lg max-h-[320px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#211a3b]">
            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wide whitespace-nowrap">
              ACTIVITY LOG
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 whitespace-nowrap">REAL-TIME</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 font-mono text-[11px] text-slate-300 pr-1">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-center py-4">Waiting for studio telemetry...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="leading-snug border-b border-[#1b1536] pb-1 last:border-b-0">
                  <span className="text-amber-400 font-bold">&gt;</span> <span>{log}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. SLIDE-OUT AGENT INSPECTOR (When an agent is selected) */}
      {/* ========================================================================= */}
      {selectedAgent && (
        <div className="fixed bottom-4 right-4 z-50 w-96 rounded-xl bg-[#140f29] border-2 border-[#382b63] shadow-2xl p-4 flex flex-col gap-3 backdrop-blur-md animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between border-b border-[#291f4a] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-bold text-amber-400 whitespace-nowrap">
                {`${selectedAgent.name.toUpperCase()} // WORKSTATION`}
              </span>
            </div>
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-slate-400 hover:text-white font-bold font-mono text-xs whitespace-nowrap"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3">
            <PixelSprite
              id={selectedAgent.id}
              color={selectedAgent.color}
              hair={selectedAgent.hair}
              skin={selectedAgent.skin}
              size={36}
            />
            <div className="min-w-0">
              <h4 className="font-mono text-sm font-bold text-white truncate">{selectedAgent.name}</h4>
              <p className="text-xs text-slate-400 font-mono truncate">{selectedAgent.role}</p>
              <p className="text-[10px] text-cyan-300 font-mono whitespace-nowrap">{selectedAgent.room}</p>
            </div>
          </div>

          {/* Terminal / Active File Preview */}
          <div className="p-2.5 rounded bg-[#0a0714] border border-[#261e47] text-xs font-mono space-y-1">
            <div className="flex justify-between text-slate-400 text-[10px]">
              <span>ACTIVE WORK:</span>
              <span className="text-emerald-400 font-bold">{selectedAgent.progress_pct ?? 100}%</span>
            </div>
            <p className="text-slate-300 text-[11px] truncate">
              {selectedAgent.current_task || 'Idle at desk'}
            </p>
            {selectedAgent.terminal_preview && (
              <pre className="text-[10px] text-emerald-400 bg-black/60 p-2 rounded overflow-x-auto whitespace-pre-wrap font-mono mt-1 border border-emerald-950">
                {selectedAgent.terminal_preview}
              </pre>
            )}
          </div>

          {/* Directive Dispatch Form */}
          <form onSubmit={handleDispatchDirective} className="flex gap-2">
            <input
              type="text"
              value={directiveInput}
              onChange={(e) => setDirectiveInput(e.target.value)}
              placeholder={`Assign task to ${selectedAgent.name}...`}
              className="flex-1 px-2.5 py-1.5 rounded bg-[#0a0714] border border-[#2b224d] text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={isSubmitting || !directiveInput.trim()}
              className="px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono transition whitespace-nowrap disabled:opacity-50"
            >
              Dispatch
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
