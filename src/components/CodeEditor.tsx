'use client';

import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
}

export default function CodeEditor({ value, onChange }: CodeEditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Keep a ref to latest onChange to avoid stale closure
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!ref.current || viewRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          oneDark,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) onChangeRef.current(u.state.doc.toString());
          }),
          EditorView.theme({
            '&': { height: '100%', background: '#0a0a0a' },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-geist-mono), ui-monospace, monospace' },
            '.cm-content': { padding: '16px 16px' },
            '.cm-gutters': { background: '#0d0d0d', borderRight: '1px solid #1a1a1a' },
            '.cm-activeLineGutter': { background: '#111' },
            '.cm-activeLine': { background: '#111' },
          }),
        ],
      }),
      parent: ref.current,
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. when a different file is loaded)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={ref} style={{ height: '100%', fontSize: '13px' }} />;
}
