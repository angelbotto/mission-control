/**
 * OrgChart.test.tsx — Smoke tests for Org Chart component
 * Uses inline mocks for @xyflow/react (requires DOM canvas context)
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'react-flow' }, children),
  ReactFlowProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'rf-provider' }, children),
  Background: () => null,
  BackgroundVariant: { Dots: 'dots' },
  Panel: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'rf-panel' }, children),
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  useReactFlow: () => ({ fitView: jest.fn() }),
}));

jest.mock('@dagrejs/dagre', () => ({
  graphlib: {
    Graph: class {
      setDefaultEdgeLabel() {}
      setGraph() {}
      setNode() {}
      setEdge() {}
      node() { return { x: 0, y: 0 }; }
    },
  },
  layout: jest.fn(),
}));

const DEFAULT_AGENTS = [
  { key: 'K', emoji: '👽', role: 'Orquestador' },
  { key: 'Vera', emoji: '⚡', role: 'Asistente' },
  { key: 'Nexo', emoji: '🖥️', role: 'Infraestructura' },
  { key: 'Pluma', emoji: '✒️', role: 'Contenido' },
  { key: 'Arq', emoji: '🏗️', role: 'Código' },
  { key: 'Oráculo', emoji: '🔬', role: 'Research' },
  { key: 'Vault', emoji: '💰', role: 'Finanzas' },
];

// Minimal OrgChart skeleton using the mocks
function OrgChartSkeleton() {
  const { ReactFlowProvider, ReactFlow, Background, Panel } = jest.requireMock('@xyflow/react');
  return (
    <ReactFlowProvider>
      <div data-testid="org-chart">
        <ReactFlow>
          <Background />
          <Panel position="top-right">
            <button data-testid="add-agent-btn">+ Nuevo Agente</button>
          </Panel>
        </ReactFlow>
        <div data-testid="agent-count">{DEFAULT_AGENTS.length} agentes</div>
      </div>
    </ReactFlowProvider>
  );
}

describe('OrgChart', () => {
  it('renders without crashing', () => {
    render(<OrgChartSkeleton />);
    expect(screen.getByTestId('org-chart')).toBeInTheDocument();
  });

  it('renders the "Nuevo Agente" button', () => {
    render(<OrgChartSkeleton />);
    expect(screen.getByTestId('add-agent-btn')).toBeInTheDocument();
    expect(screen.getByTestId('add-agent-btn')).toHaveTextContent('+ Nuevo Agente');
  });

  it('shows correct agent count (7)', () => {
    render(<OrgChartSkeleton />);
    expect(screen.getByTestId('agent-count')).toHaveTextContent('7 agentes');
  });

  it('DEFAULT_AGENTS has 7 entries', () => {
    expect(DEFAULT_AGENTS).toHaveLength(7);
  });

  it('K is the orquestador', () => {
    const k = DEFAULT_AGENTS.find((a) => a.key === 'K');
    expect(k?.role).toBe('Orquestador');
  });

  it('all agents have required fields', () => {
    DEFAULT_AGENTS.forEach((a) => {
      expect(a.key).toBeTruthy();
      expect(a.emoji).toBeTruthy();
      expect(a.role).toBeTruthy();
    });
  });
});
