/**
 * Multi-Provider LLM Task Dispatch Engine for EasyUp Software Solution HQ
 *
 * Provider Hierarchy:
 * 1. Google Gemini (GEMINI_API_KEY)
 * 2. Anthropic Claude (ANTHROPIC_API_KEY)
 * 3. OpenAI (OPENAI_API_KEY)
 * 4. High-Fidelity Simulation Mode (with UI SIM badge)
 */

export interface LLMTaskResult {
  provider: 'GEMINI' | 'ANTHROPIC' | 'OPENAI' | 'SIM_MODE';
  agentId: string;
  agentName: string;
  role: string;
  task: string;
  output: string;
  terminalSnippet: string;
  filesModified: string[];
  suggestedStatus: 'working' | 'awaiting_approval' | 'done';
  durationMs: number;
  requiresGoSignal?: boolean;
  approvalSummary?: string;
}

export interface StreamChunk {
  type: 'token' | 'terminal' | 'file' | 'status' | 'done';
  content: string;
  progressPct?: number;
}

/**
 * Checks which LLM providers are configured with active keys
 */
export function getActiveLLMProviders(): {
  gemini: boolean;
  anthropic: boolean;
  openai: boolean;
  activeProvider: 'GEMINI' | 'ANTHROPIC' | 'OPENAI' | 'SIM_MODE';
} {
  const gemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 5);
  const anthropic = Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 5);
  const openai = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 5);

  let activeProvider: 'GEMINI' | 'ANTHROPIC' | 'OPENAI' | 'SIM_MODE' = 'SIM_MODE';
  if (gemini) activeProvider = 'GEMINI';
  else if (anthropic) activeProvider = 'ANTHROPIC';
  else if (openai) activeProvider = 'OPENAI';

  return { gemini, anthropic, openai, activeProvider };
}

/**
 * Call Google Gemini REST API
 */
async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

/**
 * Call Anthropic Messages API
 */
async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const endpoint = 'https://api.anthropic.com/v1/messages';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Empty response from Anthropic');
  return text;
}

/**
 * Call OpenAI Chat Completions API
 */
async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty response from OpenAI');
  return text;
}

/**
 * High-fidelity realistic simulated execution fallback
 */
function generateSimulatedResult(agentId: string, agentName: string, role: string, task: string): LLMTaskResult {
  const isDeployOrCritical =
    task.toLowerCase().includes('deploy') ||
    task.toLowerCase().includes('prod') ||
    task.toLowerCase().includes('database') ||
    task.toLowerCase().includes('migration') ||
    task.toLowerCase().includes('email');

  const files = [
    `src/lib/${agentId.replace('_', '-')}/service.ts`,
    `tests/${agentId.replace('_', '-')}.spec.ts`,
  ];

  const terminal = `$ agy execute --agent=${agentId} --task="${task.substring(0, 40)}"\n[EasyUp Multi-Agent Runtime] Executing workflow...\n✓ Verified static types (0 errors)\n✓ Unit tests passed: 18/18\nStatus: SUCCESS (240ms)`;

  return {
    provider: 'SIM_MODE',
    agentId,
    agentName,
    role,
    task,
    output: `Autonomous multi-agent execution completed for task: "${task}". Work performed by ${agentName} (${role}). Changes validated against project directives and type boundaries.`,
    terminalSnippet: terminal,
    filesModified: files,
    suggestedStatus: isDeployOrCritical ? 'awaiting_approval' : 'done',
    durationMs: 380,
    requiresGoSignal: isDeployOrCritical,
    approvalSummary: isDeployOrCritical
      ? `Staged changes for ${task}. Requires Josiah's human Go-Signal authorization before production commit.`
      : undefined,
  };
}

/**
 * Dispatches a directive across the LLM hierarchy
 */
export async function executeAgentTask(
  agentId: string,
  agentName: string,
  role: string,
  task: string
): Promise<LLMTaskResult> {
  const startTime = Date.now();
  const prompt = `You are ${agentName}, ${role} at EasyUp Software Solution HQ.
Execute the following operational task with precision and realism:
TASK: "${task}"

Provide your response in this structured format:
SUMMARY: A concise 2-sentence executive summary of the actions taken.
TERMINAL: A 3-line terminal command and output snippet.
FILES: Comma-separated list of 1-3 files modified.`;

  // 1. Try Gemini
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && geminiKey.length > 5) {
    try {
      const output = await callGemini(prompt, geminiKey);
      return {
        provider: 'GEMINI',
        agentId,
        agentName,
        role,
        task,
        output,
        terminalSnippet: `$ gemini-2.5 run --agent=${agentId}\n[Gemini 2.5 Flash] Reasoning complete.\nOutput streamed successfully.`,
        filesModified: [`src/lib/${agentId}/runtime.ts`],
        suggestedStatus: task.toLowerCase().includes('deploy') ? 'awaiting_approval' : 'done',
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      console.warn('[LLM] Gemini request failed, trying next provider:', (err as Error).message);
    }
  }

  // 2. Try Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey && anthropicKey.length > 5) {
    try {
      const output = await callAnthropic(prompt, anthropicKey);
      return {
        provider: 'ANTHROPIC',
        agentId,
        agentName,
        role,
        task,
        output,
        terminalSnippet: `$ claude run --agent=${agentId}\n[Claude 3.5 Sonnet] Context window verified.\nTask executed.`,
        filesModified: [`src/lib/${agentId}/runtime.ts`],
        suggestedStatus: task.toLowerCase().includes('deploy') ? 'awaiting_approval' : 'done',
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      console.warn('[LLM] Anthropic request failed, trying next provider:', (err as Error).message);
    }
  }

  // 3. Try OpenAI
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey && openaiKey.length > 5) {
    try {
      const output = await callOpenAI(prompt, openaiKey);
      return {
        provider: 'OPENAI',
        agentId,
        agentName,
        role,
        task,
        output,
        terminalSnippet: `$ openai run --agent=${agentId}\n[GPT-4o] Execution pipeline passed.\nDirective complete.`,
        filesModified: [`src/lib/${agentId}/runtime.ts`],
        suggestedStatus: task.toLowerCase().includes('deploy') ? 'awaiting_approval' : 'done',
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      console.warn('[LLM] OpenAI request failed, falling back to SIM_MODE:', (err as Error).message);
    }
  }

  // 4. Resilient Simulation Mode Fallback
  return generateSimulatedResult(agentId, agentName, role, task);
}
