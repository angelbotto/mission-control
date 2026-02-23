const dagre = {
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
};

module.exports = dagre;
module.exports.default = dagre;
