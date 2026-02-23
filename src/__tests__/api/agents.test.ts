/**
 * agents.test.ts — Unit tests for agent utilities
 */

import { AGENTS, getStatusFromTimestamp, formatRelativeTime } from '@/lib/agents';

describe('AGENTS definition', () => {
  it('contains all 7 required agents', () => {
    expect(AGENTS).toHaveLength(7);
  });

  it('each agent has required fields', () => {
    AGENTS.forEach((a) => {
      expect(a.key).toBeTruthy();
      expect(a.emoji).toBeTruthy();
      expect(a.dirName).toBeTruthy();
      expect(a.defaultModel).toBeTruthy();
      expect(a.role).toBeTruthy();
    });
  });

  it('contains K as orquestador', () => {
    const k = AGENTS.find((a) => a.key === 'K');
    expect(k).toBeDefined();
    expect(k?.role).toBe('Orquestador');
    expect(k?.dirName).toBe('main');
  });

  it('no duplicate keys', () => {
    const keys = AGENTS.map((a) => a.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(AGENTS.length);
  });
});

describe('getStatusFromTimestamp', () => {
  it('returns offline when lastActivity is null', () => {
    expect(getStatusFromTimestamp(null)).toBe('offline');
  });

  it('returns online when activity < 10 min ago', () => {
    const ts = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(getStatusFromTimestamp(ts)).toBe('online');
  });

  it('returns idle when activity between 10min and 4h', () => {
    const ts = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
    expect(getStatusFromTimestamp(ts)).toBe('idle');
  });

  it('returns offline when activity > 4 hours ago', () => {
    const ts = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // 5 hours ago
    expect(getStatusFromTimestamp(ts)).toBe('offline');
  });

  it('boundary: exactly 10 min returns idle', () => {
    const ts = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(getStatusFromTimestamp(ts)).toBe('idle');
  });
});

describe('formatRelativeTime', () => {
  it('returns "nunca" for null', () => {
    expect(formatRelativeTime(null)).toBe('nunca');
  });

  it('formats seconds correctly', () => {
    const ts = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatRelativeTime(ts)).toMatch(/hace \d+s/);
  });

  it('formats minutes correctly', () => {
    const ts = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ts)).toMatch(/hace \d+m/);
  });

  it('formats hours correctly', () => {
    const ts = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ts)).toMatch(/hace \d+h/);
  });

  it('formats days correctly', () => {
    const ts = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(ts)).toMatch(/hace \d+d/);
  });
});
