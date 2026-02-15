import { describe, it, expect } from 'vitest';

// Extract the join code generation logic for testing
const adjectives = [
  "red", "blue", "green", "swift", "calm", "bold", "warm", "cool",
  "bright", "dark", "wild", "gentle", "happy", "quiet", "loud", "soft"
];
const nouns = [
  "tiger", "eagle", "river", "mountain", "forest", "ocean", "star", "moon",
  "wolf", "bear", "fox", "hawk", "storm", "flame", "frost", "wind"
];

function generateJoinCode(): string {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${noun}-${num}`;
}

describe('generateJoinCode', () => {
  it('should generate a code in the format adjective-noun-number', () => {
    const code = generateJoinCode();
    const parts = code.split('-');

    expect(parts).toHaveLength(3);
    expect(adjectives).toContain(parts[0]);
    expect(nouns).toContain(parts[1]);
    expect(parseInt(parts[2])).toBeGreaterThanOrEqual(0);
    expect(parseInt(parts[2])).toBeLessThan(100);
  });

  it('should generate unique codes', () => {
    const codes = new Set<string>();
    // Generate 50 codes and check for uniqueness
    // Note: There's a small chance of collision, but 50 out of 256*100 is very unlikely
    for (let i = 0; i < 50; i++) {
      codes.add(generateJoinCode());
    }
    // Allow for rare collisions but expect most to be unique
    expect(codes.size).toBeGreaterThan(40);
  });

  it('should only use valid adjectives from the list', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateJoinCode();
      const adjective = code.split('-')[0];
      expect(adjectives).toContain(adjective);
    }
  });

  it('should only use valid nouns from the list', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateJoinCode();
      const noun = code.split('-')[1];
      expect(nouns).toContain(noun);
    }
  });
});
