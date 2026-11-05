import { describe, it, expect } from 'vitest';
import { dialogueEngine } from '../src/lib/office/dialogueEngine';

describe('Dynamic Dialogue Engine', () => {
  it('generates valid non-empty dialogues between real office agents', () => {
    const dialogue = dialogueEngine.getNextDialogue();

    expect(dialogue).toBeDefined();
    expect(dialogue.from).toBeTruthy();
    expect(dialogue.to).toBeTruthy();
    expect(dialogue.fromName).toBeTruthy();
    expect(dialogue.toName).toBeTruthy();
    expect(dialogue.text.length).toBeGreaterThan(10);
    expect(dialogue.replyText.length).toBeGreaterThan(10);
    expect(['engineering', 'secops', 'ai', 'operations', 'growth', 'command', 'casual']).toContain(dialogue.topic);
  });

  it('generates varied dialogue contents across consecutive cycles without instant looping', () => {
    const dialogues: string[] = [];
    for (let i = 0; i < 15; i++) {
      const d = dialogueEngine.getNextDialogue();
      dialogues.push(`${d.from}->${d.to}:${d.text}`);
    }

    const uniqueCount = new Set(dialogues).size;
    // Across 15 generations, should produce multiple distinct conversations
    expect(uniqueCount).toBeGreaterThanOrEqual(10);
  });
});
