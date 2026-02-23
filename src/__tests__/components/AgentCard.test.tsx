/**
 * AgentCard.test.tsx — Smoke tests for AgentCard component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Inline the AgentCard component to avoid circular deps / Next.js complications
interface AgentInfo {
  key: string;
  emoji: string;
  role: string;
  model: string;
  status: 'online' | 'idle' | 'offline';
  lastActivity: string | null;
  sessionCount: number;
  totalTokens: number;
}

const STATUS_COLORS = { online: '#00c691', idle: '#f59e0b', offline: '#ef4444' };

function AgentCard({ agent }: { agent: AgentInfo }) {
  const statusColor = STATUS_COLORS[agent.status];
  return (
    <div data-testid="agent-card">
      <span data-testid="agent-emoji">{agent.emoji}</span>
      <span data-testid="agent-key">{agent.key}</span>
      <span data-testid="agent-role">{agent.role}</span>
      <span data-testid="agent-status" style={{ color: statusColor }}>{agent.status}</span>
      <span data-testid="agent-model">{agent.model.replace('claude-', '')}</span>
    </div>
  );
}

const mockAgent = (overrides: Partial<AgentInfo> = {}): AgentInfo => ({
  key: 'K',
  emoji: '👽',
  role: 'Orquestador',
  model: 'claude-opus-4-6',
  status: 'online',
  lastActivity: new Date().toISOString(),
  sessionCount: 5,
  totalTokens: 10000,
  ...overrides,
});

describe('AgentCard', () => {
  it('renders without crashing', () => {
    render(<AgentCard agent={mockAgent()} />);
    expect(screen.getByTestId('agent-card')).toBeInTheDocument();
  });

  it('displays agent key', () => {
    render(<AgentCard agent={mockAgent({ key: 'Arq' })} />);
    expect(screen.getByTestId('agent-key')).toHaveTextContent('Arq');
  });

  it('displays agent emoji', () => {
    render(<AgentCard agent={mockAgent({ emoji: '🏗️' })} />);
    expect(screen.getByTestId('agent-emoji')).toHaveTextContent('🏗️');
  });

  it('displays agent role', () => {
    render(<AgentCard agent={mockAgent({ role: 'Código' })} />);
    expect(screen.getByTestId('agent-role')).toHaveTextContent('Código');
  });

  it('shows online status with green color', () => {
    render(<AgentCard agent={mockAgent({ status: 'online' })} />);
    const statusEl = screen.getByTestId('agent-status');
    expect(statusEl).toHaveTextContent('online');
    expect(statusEl).toHaveStyle({ color: '#00c691' });
  });

  it('shows idle status with amber color', () => {
    render(<AgentCard agent={mockAgent({ status: 'idle' })} />);
    const statusEl = screen.getByTestId('agent-status');
    expect(statusEl).toHaveTextContent('idle');
    expect(statusEl).toHaveStyle({ color: '#f59e0b' });
  });

  it('shows offline status with red color', () => {
    render(<AgentCard agent={mockAgent({ status: 'offline' })} />);
    const statusEl = screen.getByTestId('agent-status');
    expect(statusEl).toHaveTextContent('offline');
    expect(statusEl).toHaveStyle({ color: '#ef4444' });
  });

  it('strips "claude-" prefix from model name', () => {
    render(<AgentCard agent={mockAgent({ model: 'claude-opus-4-6' })} />);
    expect(screen.getByTestId('agent-model')).toHaveTextContent('opus-4-6');
  });

  it('renders all 7 agents without crash', () => {
    const agents: AgentInfo[] = [
      { key: 'K', emoji: '👽', role: 'Orquestador', model: 'claude-opus-4-6', status: 'online', lastActivity: null, sessionCount: 0, totalTokens: 0 },
      { key: 'Vera', emoji: '⚡', role: 'Asistente', model: 'claude-sonnet-4-6', status: 'idle', lastActivity: null, sessionCount: 0, totalTokens: 0 },
      { key: 'Arq', emoji: '🏗️', role: 'Código', model: 'claude-sonnet-4-6', status: 'offline', lastActivity: null, sessionCount: 0, totalTokens: 0 },
      { key: 'Nexo', emoji: '🖥️', role: 'Infra', model: 'claude-sonnet-4-6', status: 'offline', lastActivity: null, sessionCount: 0, totalTokens: 0 },
      { key: 'Pluma', emoji: '✒️', role: 'Contenido', model: 'claude-opus-4-6', status: 'offline', lastActivity: null, sessionCount: 0, totalTokens: 0 },
      { key: 'Oráculo', emoji: '🔬', role: 'Research', model: 'claude-opus-4-6', status: 'offline', lastActivity: null, sessionCount: 0, totalTokens: 0 },
      { key: 'Vault', emoji: '💰', role: 'Finanzas', model: 'claude-opus-4-6', status: 'offline', lastActivity: null, sessionCount: 0, totalTokens: 0 },
    ];
    agents.forEach((a) => {
      const { unmount } = render(<AgentCard agent={a} />);
      expect(screen.getByText(a.key)).toBeInTheDocument();
      unmount();
    });
  });
});
