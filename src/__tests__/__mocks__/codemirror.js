module.exports = {
  EditorState: { create: jest.fn(() => ({})) },
  EditorView: jest.fn(() => ({ destroy: jest.fn(), dispatch: jest.fn(), state: { doc: { toString: () => '' } } })),
  basicSetup: [],
  markdown: jest.fn(() => []),
  markdownLanguage: {},
  languages: [],
  oneDark: [],
};
