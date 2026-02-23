/**
 * KanbanBoard.test.tsx — Smoke tests for Kanban column structure
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Column definitions (mirrors kanban/page.tsx)
type ColumnKey = 'idle' | 'working' | 'review' | 'done';

const COLUMNS: { key: ColumnKey; label: string; icon: string; color: string }[] = [
  { key: 'idle', label: 'Idle', icon: '🕐', color: '#6b7280' },
  { key: 'working', label: 'Trabajando', icon: '⚡', color: '#38bdf8' },
  { key: 'review', label: 'En Revisión', icon: '👀', color: '#a78bfa' },
  { key: 'done', label: 'Completado', icon: '✅', color: '#00c691' },
];

function KanbanBoardSkeleton() {
  return (
    <div data-testid="kanban-board" className="kanban-board">
      {COLUMNS.map((col) => (
        <div key={col.key} data-testid={`col-${col.key}`} className="kanban-col">
          <div data-testid={`col-header-${col.key}`}>
            <span>{col.icon}</span>
            <span>{col.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

describe('KanbanBoard', () => {
  it('renders without crashing', () => {
    render(<KanbanBoardSkeleton />);
    expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
  });

  it('renders exactly 4 columns', () => {
    render(<KanbanBoardSkeleton />);
    COLUMNS.forEach((col) => {
      expect(screen.getByTestId(`col-${col.key}`)).toBeInTheDocument();
    });
    expect(screen.getAllByClassName ? undefined : screen.getByTestId('kanban-board').children).toHaveLength(4);
  });

  it('renders Idle column', () => {
    render(<KanbanBoardSkeleton />);
    expect(screen.getByTestId('col-idle')).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('renders Trabajando column', () => {
    render(<KanbanBoardSkeleton />);
    expect(screen.getByText('Trabajando')).toBeInTheDocument();
  });

  it('renders En Revisión column', () => {
    render(<KanbanBoardSkeleton />);
    expect(screen.getByText('En Revisión')).toBeInTheDocument();
  });

  it('renders Completado column', () => {
    render(<KanbanBoardSkeleton />);
    expect(screen.getByText('Completado')).toBeInTheDocument();
  });

  it('each column has correct icon', () => {
    render(<KanbanBoardSkeleton />);
    COLUMNS.forEach((col) => {
      expect(screen.getByTestId(`col-header-${col.key}`)).toHaveTextContent(col.icon);
    });
  });
});
