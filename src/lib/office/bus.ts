/**
 * Real-Time Inter-Agent Message Bus for EasyUp Software Solution HQ
 * Handles team communications, cross-desk messaging, and activity logs.
 */

export interface OfficeMessage {
  id: string;
  from: string;
  fromName: string;
  to: string;
  toName: string;
  text: string;
  timestamp: string;
  channel?: string;
}

export type MessageListener = (msg: OfficeMessage) => void;

class OfficeMessageBus {
  private listeners: Set<MessageListener> = new Set();
  private history: OfficeMessage[] = [];
  private maxHistory = 100;

  public subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public publish(msg: Omit<OfficeMessage, 'id' | 'timestamp'>): OfficeMessage {
    const fullMessage: OfficeMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };

    this.history.unshift(fullMessage);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    this.listeners.forEach((listener) => {
      try {
        listener(fullMessage);
      } catch (err) {
        console.error('[OfficeBus] Error in message listener:', err);
      }
    });

    return fullMessage;
  }

  public getHistory(): OfficeMessage[] {
    return [...this.history];
  }

  public clear(): void {
    this.history = [];
  }
}

export const officeBus = new OfficeMessageBus();

// Realistic Authentic Conversations between the 23 Agents
export const PRESET_OFFICE_DIALOGUES: Array<{
  from: string;
  fromName: string;
  to: string;
  toName: string;
  text: string;
  replyText: string;
}> = [
  {
    from: 'arwin',
    fromName: 'Arwin',
    to: 'neil_mar',
    toName: 'Neil Mar',
    text: '@Neil Mar API endpoints for multi-agent telemetry ready for UI integration.',
    replyText: '@Arwin Hooking up the reactive cards and canvas overlays now.',
  },
  {
    from: 'khent',
    fromName: 'Khent',
    to: 'john_arvy',
    toName: 'John Arvy',
    text: '@John Arvy OWASP Top 10 penetration sweep clean. Checking auth JWT.',
    replyText: '@Khent CSRF and session revocation verified. Zero leaks detected.',
  },
  {
    from: 'bonnie',
    fromName: 'Bonnie',
    to: 'josiah',
    toName: 'Josiah',
    text: '@Josiah Production CI/CD build green. Staged for Go-Signal authorization.',
    replyText: '@Bonnie Excellent work. Reviewing change summary for production release.',
  },
  {
    from: 'roy_jhan',
    fromName: 'Roy Jhan',
    to: 'gabriel',
    toName: 'Gabriel',
    text: '@Gabriel Gemini 2.5 Flash TTFT hit 72ms on reasoning benchmark.',
    replyText: '@Roy Jhan Guardrails calibrated. Zero hallucination rate achieved.',
  },
  {
    from: 'mary_grace',
    fromName: 'Mary Grace',
    to: 'anthony',
    toName: 'Anthony',
    text: '@Anthony Cloud infrastructure budget is -14.2% below forecast.',
    replyText: '@Mary Grace Idle instances reclaimed and reserved capacity allocated.',
  },
  {
    from: 'nelmar',
    fromName: 'Nelmar',
    to: 'john_lloyd',
    toName: 'John Lloyd',
    text: '@John Lloyd PostgreSQL telemetry query execution latency dropped under 0.3ms.',
    replyText: '@Nelmar Partition indexes verified on live staging data.',
  },
  {
    from: 'jo_vincent',
    fromName: 'Jo Vincent',
    to: 'jesmond',
    toName: 'Jesmond',
    text: '@Jesmond Organic lead funnel conversions increased +34.8% week-over-week.',
    replyText: '@Jo Vincent Programmatic SEO landing pages ranking in Top 3 search positions.',
  },
  {
    from: 'gloria',
    fromName: 'Gloria',
    to: 'jb',
    toName: 'JB',
    text: '@JB Sprint 44 deliverable milestones aligned across all 23 agents.',
    replyText: '@Gloria Delivery gates on track. No critical blockers detected.',
  },
  {
    from: 'keiru',
    fromName: 'Keiru',
    to: 'ryan',
    toName: 'Ryan',
    text: '@Ryan Multimodal visual parser bounding box accuracy reached 99.8%.',
    replyText: '@Keiru Quantized weights deployed to edge inference worker.',
  },
  {
    from: 'blaze',
    fromName: 'Blaze',
    to: 'ferwin',
    toName: 'Ferwin',
    text: '@Ferwin Webhook incident alerts verified on Discord and Slack channels.',
    replyText: '@Blaze 200 OK responses confirmed across all webhook subscribers.',
  },
];
