const React = require('react');

const mockFn = () => ({});
const mockHook = () => [[], jest.fn(), jest.fn()];

module.exports = {
  ReactFlow: ({ children }) => React.createElement('div', { 'data-testid': 'react-flow' }, children),
  ReactFlowProvider: ({ children }) => React.createElement('div', null, children),
  Background: () => null,
  BackgroundVariant: { Dots: 'dots' },
  Panel: ({ children }) => React.createElement('div', null, children),
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  useReactFlow: () => ({ fitView: jest.fn() }),
};
