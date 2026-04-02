import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { watchTheme } from '@juvkit/plugin-sdk';
import type { editor } from 'monaco-editor';
import './App.css';

interface AppProps {
  api: ExternalPluginAPI;
}

type DiffMode = 'side-by-side' | 'inline';
type Language = 'json' | 'javascript' | 'typescript' | 'html' | 'css' | 'xml' | 'plaintext';

interface DiffStats {
  added: number;
  removed: number;
  changes: number;
}

interface DiffChange {
  startLine: number;
  endLine: number;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'plaintext', label: '纯文本' },
  { value: 'json', label: 'JSON' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'xml', label: 'XML' },
];

export default function App({ api }: AppProps) {
  const [original, setOriginal] = useState('');
  const [modified, setModified] = useState('');
  const [language, setLanguage] = useState<Language>('json');
  const [diffMode, setDiffMode] = useState<DiffMode>('side-by-side');
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const [stats, setStats] = useState<DiffStats>({ added: 0, removed: 0, changes: 0 });
  const [currentChange, setCurrentChange] = useState(-1);

  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null);
  const changesRef = useRef<DiffChange[]>([]);
  const modifiedEditorRef = useRef<editor.ICodeEditor | null>(null);
  // 用 ref 追踪编辑器当前内容，避免 onDidChangeModelContent → setState → prop 反写导致光标跳动
  const originalRef = useRef(original);
  const modifiedRef = useRef(modified);

  // 监听主题变更
  useEffect(() => {
    return watchTheme(t => setTheme(t === 'dark' ? 'vs-dark' : 'light'));
  }, []);

  const computeStats = useCallback((diffEditor: editor.IStandaloneDiffEditor) => {
    try {
      const changes = diffEditor.getLineChanges();
      if (!changes || changes.length === 0) {
        changesRef.current = [];
        setStats({ added: 0, removed: 0, changes: 0 });
        setCurrentChange(-1);
        return;
      }
      let added = 0;
      let removed = 0;

      const diffChanges: DiffChange[] = changes.map(c => {
        const addedLines = (c.modifiedEndLineNumber || 0) - (c.modifiedStartLineNumber || 0) + (c.modifiedEndLineNumber ? 1 : 0);
        const removedLines = (c.originalEndLineNumber || 0) - (c.originalStartLineNumber || 0) + (c.originalEndLineNumber ? 1 : 0);
        if (addedLines > removedLines) {
          added += addedLines - removedLines;
        } else {
          removed += removedLines - addedLines;
        }
        return {
          startLine: c.modifiedStartLineNumber || c.originalStartLineNumber,
          endLine: Math.max(c.modifiedEndLineNumber || 0, c.originalEndLineNumber || 0),
        };
      });

      changesRef.current = diffChanges;
      setStats({ added, removed, changes: diffChanges.length });
      setCurrentChange(-1);
    } catch {
      // ignore
    }
  }, []);

  const handleEditorMount = (diffEditor: editor.IStandaloneDiffEditor) => {
    diffEditorRef.current = diffEditor;
    modifiedEditorRef.current = diffEditor.getModifiedEditor();

    // 注册全局编辑处理器，供 Tauri 原生菜单 Cmd+A/C/V/X/Z 回调
    (window as any).__juvkitEditAction = (action: string) => {
      const modified = diffEditor.getModifiedEditor();
      const original = diffEditor.getOriginalEditor();
      const target = modified.hasTextFocus() ? modified
                    : original.hasTextFocus() ? original
                    : modified;

      switch (action) {
        case 'undo':
          target.trigger('menu', 'undo', null);
          return;
        case 'redo':
          target.trigger('menu', 'redo', null);
          return;
        case 'select_all':
          target.trigger('menu', 'editor.action.selectAll', null);
          return;
        case 'copy': {
          const text = target.getModel()?.getValueInRange(target.getSelection()!);
          if (text) (window as any).juvkit?.clipboard?.writeText(text);
          return;
        }
        case 'cut': {
          const sel = target.getSelection()!;
          const text = target.getModel()?.getValueInRange(sel);
          if (text) {
            (window as any).juvkit?.clipboard?.writeText(text);
            target.executeEdits('menu', [{ range: sel, text: '' }]);
          }
          return;
        }
        case 'paste': {
          (window as any).juvkit?.clipboard?.readText()?.then((text: string) => {
            if (text) {
              const t = modified.hasTextFocus() ? modified
                       : original.hasTextFocus() ? original
                       : modified;
              t.executeEdits('menu', [{ range: t.getSelection()!, text }]);
            }
          });
          return;
        }
      }
    };
    const originalEditor = diffEditor.getOriginalEditor();

    originalEditor.onDidChangeModelContent(() => {
      originalRef.current = originalEditor.getValue();
      computeStats(diffEditor);
    });
    modifiedEditorRef.current.onDidChangeModelContent(() => {
      modifiedRef.current = modifiedEditorRef.current!.getValue();
      computeStats(diffEditor);
    });

    computeStats(diffEditor);
  };

  const handleSwap = () => {
    const tmp = originalRef.current;
    originalRef.current = modifiedRef.current;
    modifiedRef.current = tmp;
    setOriginal(originalRef.current);
    setModified(modifiedRef.current);
  };

  const handleClear = () => {
    setOriginal('');
    setModified('');
    setStats({ added: 0, removed: 0, changes: 0 });
    setCurrentChange(-1);
    changesRef.current = [];
  };

  const formatJson = (text: string, sortKeys: boolean): string => {
    if (!text.trim()) return text;
    try {
      const parsed = JSON.parse(text);
      if (sortKeys) {
        const sortObj = (obj: any): any => {
          if (Array.isArray(obj)) return obj.map(sortObj);
          if (obj !== null && typeof obj === 'object') {
            return Object.keys(obj).sort().reduce((acc: any, key) => {
              acc[key] = sortObj(obj[key]);
              return acc;
            }, {});
          }
          return obj;
        };
        return JSON.stringify(sortObj(parsed), null, 2);
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  };

  const handleFormat = () => {
    if (language === 'json') {
      const o = formatJson(originalRef.current, false);
      const m = formatJson(modifiedRef.current, false);
      originalRef.current = o;
      modifiedRef.current = m;
      setOriginal(o);
      setModified(m);
    } else if (modifiedEditorRef.current && diffEditorRef.current) {
      // 使用 Monaco 内置格式化
      const originalEditor = diffEditorRef.current.getOriginalEditor();
      try {
        originalEditor?.getAction('editor.action.formatDocument')?.run();
        modifiedEditorRef.current.getAction('editor.action.formatDocument')?.run();
      } catch {
        // 部分语言可能没有格式化 provider
      }
    }
  };

  const handleSortJson = () => {
    const o = formatJson(originalRef.current, true);
    const m = formatJson(modifiedRef.current, true);
    originalRef.current = o;
    modifiedRef.current = m;
    setOriginal(o);
    setModified(m);
  };

  const navigateChange = (direction: 'next' | 'prev') => {
    const changes = changesRef.current;
    if (changes.length === 0) return;

    let next: number;
    if (direction === 'next') {
      next = currentChange < changes.length - 1 ? currentChange + 1 : 0;
    } else {
      next = currentChange > 0 ? currentChange - 1 : changes.length - 1;
    }

    setCurrentChange(next);
    const change = changes[next];
    const editor = modifiedEditorRef.current;
    if (editor && change) {
      editor.revealLineInCenter(change.startLine);
      editor.setSelection({
        startLineNumber: change.startLine,
        startColumn: 1,
        endLineNumber: change.endLine,
        endColumn: 1,
      });
      editor.focus();
    }
  };

  const toolbarBg = theme === 'vs-dark' ? '#2d2d2d' : '#f0f0f0';
  const toolbarBorder = theme === 'vs-dark' ? '#3c3c3c' : '#d4d4d4';
  const statusBg = theme === 'vs-dark' ? '#007acc' : '#0078d4';
  const selectBg = theme === 'vs-dark' ? '#3c3c3c' : '#fff';
  const selectColor = theme === 'vs-dark' ? '#ccc' : '#333';
  const selectBorder = theme === 'vs-dark' ? '#555' : '#ccc';

  return (
    <div className="diff-tool" style={{ background: theme === 'vs-dark' ? '#1e1e1e' : '#fff' }}>
      {/* Toolbar */}
      <div className="toolbar" style={{ background: toolbarBg, borderBottomColor: toolbarBorder }}>
        <div className="toolbar-group">
          <button
            className={`tool-btn ${diffMode === 'side-by-side' ? 'active' : ''}`}
            onClick={() => setDiffMode('side-by-side')}
            title="并排对比"
          >
            并排
          </button>
          <button
            className={`tool-btn ${diffMode === 'inline' ? 'active' : ''}`}
            onClick={() => setDiffMode('inline')}
            title="行内对比"
          >
            行内
          </button>
        </div>

        <div className="toolbar-divider" style={{ background: toolbarBorder }} />

        <select
          className="lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          style={{ background: selectBg, color: selectColor, borderColor: selectBorder }}
        >
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>

        <div className="toolbar-divider" style={{ background: toolbarBorder }} />

        <button className="tool-btn" onClick={handleFormat} title="格式化代码">格式化</button>
        {language === 'json' && (
          <button className="tool-btn" onClick={handleSortJson} title="JSON 按 key 排序后格式化">排序格式化</button>
        )}

        <div className="toolbar-divider" style={{ background: toolbarBorder }} />

        <button className="tool-btn" onClick={handleSwap} title="交换左右内容">交换</button>
        <button className="tool-btn" onClick={handleClear} title="清空内容">清空</button>
      </div>

      {/* DiffEditor */}
      <div className="editor-wrapper">
        <DiffEditor
          height="100%"
          language={language}
          original={original}
          modified={modified}
          theme={theme}
          onMount={handleEditorMount}
          options={{
            renderSideBySide: diffMode === 'side-by-side',
            readOnly: false,
            originalEditable: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            renderOverviewRuler: true,
            padding: { top: 8 },
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
          }}
          loading={
            <div className="editor-loading" style={{ color: theme === 'vs-dark' ? '#888' : '#666' }}>
              <div className="loading-spinner" />
              <span>加载编辑器...</span>
            </div>
          }
        />
      </div>

      {/* Status Bar */}
      <div className="status-bar" style={{ background: statusBg }}>
        <div className="stats">
          <span className="stat-item stat-added">+{stats.added}</span>
          <span className="stat-item stat-removed">-{stats.removed}</span>
          <span className="stat-item stat-changes">{stats.changes} 处差异</span>
        </div>
        <div className="nav-group">
          <span className="nav-indicator">
            {stats.changes > 0 ? `${currentChange + 1}/${stats.changes}` : '0/0'}
          </span>
          <button className="nav-btn" onClick={() => navigateChange('prev')} disabled={stats.changes === 0} title="上一个差异">
            ↑
          </button>
          <button className="nav-btn" onClick={() => navigateChange('next')} disabled={stats.changes === 0} title="下一个差异">
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}
