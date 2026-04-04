import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { watchTheme } from '@juvkit/plugin-sdk';
import type { editor } from 'monaco-editor';
import './App.css';

interface AppProps {
  api: ExternalPluginAPI;
}

type StatusType = 'idle' | 'valid' | 'error';

export default function App({ api }: AppProps) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<StatusType>('idle');
  const [statusText, setStatusText] = useState('');
  const [theme, setTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // 监听主题变更
  useEffect(() => {
    return watchTheme(t => setTheme(t === 'dark' ? 'vs-dark' : 'light'));
  }, []);

  const isDark = theme === 'vs-dark';

  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // 注册全局编辑处理器，供 Tauri 原生菜单 Cmd+A/C/V/X/Z 回调
    (window as any).__juvkitEditAction = (action: string) => {
      const ed = editorRef.current;
      const inMonaco = ed && ed.getContainerDomNode().contains(document.activeElement);
      if (ed && inMonaco) {
        // 焦点在编辑器正文 → 使用 Monaco API
        if (ed.hasTextFocus()) {
          switch (action) {
            case 'undo':
              ed.trigger('menu', 'undo', null);
              return;
            case 'redo':
              ed.trigger('menu', 'redo', null);
              return;
            case 'select_all':
              ed.trigger('menu', 'editor.action.selectAll', null);
              return;
            case 'copy': {
              const text = ed.getModel()?.getValueInRange(ed.getSelection()!);
              if (text) (window as any).juvkit?.clipboard?.writeText(text);
              return;
            }
            case 'cut': {
              const sel = ed.getSelection()!;
              const text = ed.getModel()?.getValueInRange(sel);
              if (text) {
                (window as any).juvkit?.clipboard?.writeText(text);
                ed.executeEdits('menu', [{ range: sel, text: '' }]);
              }
              return;
            }
            case 'paste': {
              (window as any).juvkit?.clipboard?.readText()?.then((text: string) => {
                if (text && editorRef.current) {
                  editorRef.current.executeEdits('menu', [{ range: editorRef.current.getSelection()!, text }]);
                }
              });
              return;
            }
          }
        }
        // 焦点在 Monaco widget 内（如搜索框）→ 对活跃 input 元素执行操作
        const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          switch (action) {
            case 'copy': {
              const sel = active.selectionStart !== null ? active.value.substring(active.selectionStart!, active.selectionEnd!) : '';
              if (sel) (window as any).juvkit?.clipboard?.writeText(sel);
              return;
            }
            case 'cut': {
              const s = active.selectionStart!, e = active.selectionEnd!;
              const sel = active.value.substring(s, e);
              if (sel) {
                (window as any).juvkit?.clipboard?.writeText(sel);
                active.setRangeText('');
              }
              return;
            }
            case 'paste': {
              (window as any).juvkit?.clipboard?.readText()?.then((text: string) => {
                if (text && document.activeElement === active) {
                  active.focus();
                  document.execCommand('insertText', false, text);
                }
              });
              return;
            }
            case 'select_all':
              active.select();
              return;
          }
        }
      }
      // 非 Monaco 区域回退到 execCommand
      const cmdMap: Record<string, string> = {
        'undo': 'undo', 'redo': 'redo', 'cut': 'cut',
        'copy': 'copy', 'paste': 'paste', 'select_all': 'selectAll',
      };
      document.execCommand(cmdMap[action] || action);
    };

    // 自动从剪贴板读取 JSON
    api.clipboard.readText().then((text) => {
      if (text) {
        try {
          const parsed = JSON.parse(text);
          const formatted = JSON.stringify(parsed, null, 2);
          editor.setValue(formatted);
          setStatus('valid');
          setStatusText('已从剪贴板读取并格式化');
        } catch {
          // 不是有效 JSON，不自动填充
        }
      }
    }).catch(() => {});
  };

  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    if (editorRef.current) {
      editorRef.current.setValue(newContent);
    }
  }, []);

  const validateJson = useCallback((text: string): { valid: boolean; message: string } => {
    if (!text.trim()) return { valid: true, message: '' };
    try {
      JSON.parse(text);
      return { valid: true, message: '有效 JSON' };
    } catch (e: any) {
      return { valid: false, message: e.message };
    }
  }, []);

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      updateContent(formatted);
      setStatus('valid');
      setStatusText('已格式化');
    } catch (e: any) {
      setStatus('error');
      setStatusText(e.message);
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(content);
      const minified = JSON.stringify(parsed);
      updateContent(minified);
      setStatus('valid');
      setStatusText('已压缩');
    } catch (e: any) {
      setStatus('error');
      setStatusText(e.message);
    }
  };

  const handleEscape = () => {
    const escaped = JSON.stringify(content);
    updateContent(escaped);
    setStatus('valid');
    setStatusText('已转义');
  };

  const handleUnescape = () => {
    try {
      const unescaped = JSON.parse(content);
      if (typeof unescaped === 'string') {
        updateContent(unescaped);
        setStatus('valid');
        setStatusText('已去转义');
      } else {
        updateContent(JSON.stringify(unescaped, null, 2));
        setStatus('valid');
        setStatusText('已去转义（非字符串内容）');
      }
    } catch (e: any) {
      setStatus('error');
      setStatusText('去转义失败: ' + e.message);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus('valid');
    setStatusText('已下载');
  };

  const handleCopy = async () => {
    await api.helpers.copyToClipboard(content);
    setStatus('valid');
    setStatusText('已复制到剪贴板');
  };

  const handleClear = () => {
    updateContent('');
    setStatus('idle');
    setStatusText('');
  };

  const handleEditorChange = (value: string | undefined) => {
    const text = value || '';
    setContent(text);
    const { valid, message } = validateJson(text);
    if (!text.trim()) {
      setStatus('idle');
      setStatusText('');
    } else if (valid) {
      setStatus('valid');
      setStatusText('有效 JSON');
    } else {
      setStatus('error');
      setStatusText(message);
    }
  };

  return (
    <div className={`json-tool ${isDark ? 'theme-dark' : 'theme-light'}`}>
      <div className="toolbar">
        <div className="toolbar-left">
          <button className="tool-btn btn-format" onClick={handleFormat} title="格式化 (Ctrl+Shift+F)">格式化</button>
          <button className="tool-btn btn-minify" onClick={handleMinify} title="压缩">压缩</button>
          <div className="toolbar-divider" />
          <button className="tool-btn btn-escape" onClick={handleEscape} title="转义为 JSON 字符串">转义</button>
          <button className="tool-btn btn-unescape" onClick={handleUnescape} title="去转义 JSON 字符串">去转义</button>
          <div className="toolbar-divider" />
          <button className="tool-btn btn-copy" onClick={handleCopy} title="复制到剪贴板">复制</button>
          <button className="tool-btn btn-download" onClick={handleDownload} title="下载为文件">下载</button>
          <button className="tool-btn btn-clear" onClick={handleClear} title="清空内容">清空</button>
        </div>
      </div>

      <div className="editor-wrapper">
        <Editor
          height="100%"
          language="json"
          theme={theme}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 8 },
            renderLineHighlight: 'all',
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
          }}
          loading={
            <div className="editor-loading">
              <div className="loading-spinner" />
              <span>加载编辑器...</span>
            </div>
          }
        />
      </div>

      <div className={`status-bar status-${status}`}>
        <span className="status-indicator" />
        <span className="status-text">{statusText}</span>
      </div>
    </div>
  );
}
