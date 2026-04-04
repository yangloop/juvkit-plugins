import React, { useState, useEffect, useCallback } from 'react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { watchTheme } from '@juvkit/plugin-sdk';
import './App.css';

// ========== Types ==========

interface KVPair {
  key: string;
  value: string;
  description: string;
  enabled: boolean;
}

interface HttpResponse {
  status: number;
  statusText: string;
  time: number;
  headers: Record<string, string>;
  body: string;
  bodyPreview: string;
  size: number;
}

interface HistoryEntry {
  id: string;
  method: string;
  url: string;
  status: number;
  time: number;
  timestamp: number;
}

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
const STORAGE_KEY = 'http_client_history';
const MAX_HISTORY = 50;

// ========== Helpers ==========

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function statusClass(status: number): string {
  if (status >= 200 && status < 300) return 'status-success';
  if (status >= 300 && status < 400) return 'status-warning';
  return 'status-error';
}

// ========== Icons ==========

function ChevronDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="spinner-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-9.678" />
    </svg>
  );
}

// ========== KV Editor ==========

function KVEditor({ pairs, onUpdate, onRemove, onAdd }: {
  pairs: KVPair[];
  onUpdate: (index: number, field: keyof KVPair, value: string | boolean) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="kv-editor">
      <div className="kv-header-row">
        <span className="kv-col-check"></span>
        <span className="kv-col-key">Key</span>
        <span className="kv-col-value">Value</span>
        <span className="kv-col-desc">Description</span>
        <span className="kv-col-action"></span>
      </div>
      {pairs.map((pair, i) => (
        <div className={`kv-row ${!pair.enabled ? 'disabled' : ''}`} key={i}>
          <span className="kv-col-check">
            <input
              type="checkbox"
              checked={pair.enabled}
              onChange={e => onUpdate(i, 'enabled', e.currentTarget.checked)}
            />
          </span>
          <span className="kv-col-key">
            <input
              className="kv-input"
              placeholder="Key"
              value={pair.key}
              onChange={e => onUpdate(i, 'key', e.currentTarget.value)}
            />
          </span>
          <span className="kv-col-value">
            <input
              className="kv-input"
              placeholder="Value"
              value={pair.value}
              onChange={e => onUpdate(i, 'value', e.currentTarget.value)}
            />
          </span>
          <span className="kv-col-desc">
            <input
              className="kv-input"
              placeholder="Description"
              value={pair.description}
              onChange={e => onUpdate(i, 'description', e.currentTarget.value)}
            />
          </span>
          <span className="kv-col-action">
            <button className="icon-btn danger" onClick={() => onRemove(i)} title="删除">
              <TrashIcon />
            </button>
          </span>
        </div>
      ))}
      <button className="kv-add-btn" onClick={onAdd}>
        <PlusIcon /> 添加
      </button>
    </div>
  );
}

// ========== Main App ==========

interface AppProps {
  api: ExternalPluginAPI;
}

export default function App({ api }: AppProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [requestTab, setRequestTab] = useState<'params' | 'body' | 'headers' | 'auth'>('params');

  // Request config
  const [headers, setHeaders] = useState<KVPair[]>([{ key: '', value: '', description: '', enabled: true }]);
  const [params, setParams] = useState<KVPair[]>([{ key: '', value: '', description: '', enabled: true }]);
  const [bodyType, setBodyType] = useState<'json' | 'text'>('json');
  const [bodyContent, setBodyContent] = useState('');

  // Response
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [error, setError] = useState('');
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  // Theme
  useEffect(() => watchTheme(setTheme), []);

  // Load history
  useEffect(() => {
    api.storage.get<HistoryEntry[]>(STORAGE_KEY).then(data => {
      if (data) setHistory(data);
    }).catch(() => {});
  }, []);

  // KV helpers
  const addKV = useCallback((setter: React.Dispatch<React.SetStateAction<KVPair[]>>) => {
    setter(prev => [...prev, { key: '', value: '', description: '', enabled: true }]);
  }, []);

  const removeKV = useCallback((setter: React.Dispatch<React.SetStateAction<KVPair[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateKV = useCallback((setter: React.Dispatch<React.SetStateAction<KVPair[]>>, index: number, field: keyof KVPair, value: string | boolean) => {
    setter(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }, []);

  // Build final URL with query params
  const buildUrl = useCallback((): string => {
    const rawUrl = url.trim();
    if (!rawUrl) return '';
    const enabledParams = params.filter(p => p.enabled && p.key.trim());
    if (enabledParams.length === 0) return rawUrl;
    try {
      const parsed = new URL(rawUrl);
      enabledParams.forEach(p => parsed.searchParams.set(p.key.trim(), p.value));
      return parsed.toString();
    } catch {
      const qs = enabledParams.map(p =>
        `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`
      ).join('&');
      return rawUrl + (rawUrl.includes('?') ? '&' : '?') + qs;
    }
  }, [url, params]);

  // Send request
  const sendRequest = useCallback(async () => {
    const finalUrl = buildUrl();
    if (!finalUrl) return;

    const reqHeaders: Record<string, string> = {};
    for (const h of headers) {
      if (h.enabled && h.key.trim()) {
        reqHeaders[h.key.trim()] = h.value;
      }
    }

    setLoading(true);
    setError('');
    setResponse(null);
    const startTime = performance.now();

    try {
      const hasBody = !['GET', 'HEAD'].includes(method);

      const fetchOptions: Parameters<typeof api.http.fetch>[1] = {
        method,
        headers: reqHeaders,
        timeout: 30000,
      };

      if (hasBody && bodyContent.trim()) {
        if (bodyType === 'json') {
          try {
            JSON.parse(bodyContent);
          } catch {
            setError('JSON 格式无效，请检查输入');
            setLoading(false);
            return;
          }
          reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'application/json';
          fetchOptions.body = JSON.parse(bodyContent);
        } else {
          reqHeaders['Content-Type'] = reqHeaders['Content-Type'] || 'text/plain';
          fetchOptions.rawBody = bodyContent;
        }
        fetchOptions.headers = reqHeaders;
      }

      const resp = await api.http.fetch(finalUrl, fetchOptions);
      const elapsed = Math.round(performance.now() - startTime);

      const bodyText = await resp.text();
      let bodyPreview = bodyText;
      try {
        const parsed = JSON.parse(bodyText);
        bodyPreview = JSON.stringify(parsed, null, 2);
      } catch { /* not JSON */ }

      const respHeaders: Record<string, string> = {};
      resp.headers.forEach((v, k) => { respHeaders[k] = v; });

      const httpResp: HttpResponse = {
        status: resp.status,
        statusText: resp.ok ? 'OK' : 'Error',
        time: elapsed,
        headers: respHeaders,
        body: bodyText,
        bodyPreview,
        size: new Blob([bodyText]).size,
      };

      setResponse(httpResp);

      // Save to history
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        method,
        url: url.trim(),
        status: resp.status,
        time: elapsed,
        timestamp: Date.now(),
      };
      const updated = [entry, ...history].slice(0, MAX_HISTORY);
      setHistory(updated);
      api.storage.set(STORAGE_KEY, updated).catch(() => {});

    } catch (err: any) {
      setError(err?.message || err?.toString() || '请求失败');
    } finally {
      setLoading(false);
    }
  }, [api, buildUrl, method, headers, params, bodyType, bodyContent, history, url]);

  // Load history entry
  const loadHistoryEntry = useCallback((entry: HistoryEntry) => {
    setMethod(entry.method);
    setUrl(entry.url);
    setShowHistory(false);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    api.storage.set(STORAGE_KEY, []).catch(() => {});
  }, [api]);

  // Copy to clipboard
  const copyText = useCallback(async (text: string) => {
    try {
      await api.helpers.copyToClipboard(text);
    } catch {
      await navigator.clipboard.writeText(text);
    }
  }, [api]);

  const hasBody = !['GET', 'HEAD'].includes(method);

  const requestTabs: { id: typeof requestTab; label: string; badge?: number }[] = [
    { id: 'params', label: 'Parameters', badge: params.filter(p => p.enabled && p.key.trim()).length || undefined },
    { id: 'body', label: 'Body' },
    { id: 'headers', label: 'Headers', badge: headers.filter(h => h.enabled && h.key.trim()).length || undefined },
    { id: 'auth', label: 'Authorization' },
  ];

  return (
    <div className={`hoppscotch theme-${theme}`}>
      {/* ===== Request Tab Bar ===== */}
      <div className="req-tab-bar">
        <div className="req-tab active">
          <span className={`method-badge ${method.toLowerCase()}`}>{method}</span>
          <span className="req-tab-title">{url ? new URL(url).pathname + new URL(url).search : 'Untitled'}</span>
        </div>
        <button className="req-tab-add" title="新建标签">
          <PlusIcon />
        </button>
      </div>

      {/* ===== URL Bar ===== */}
      <div className="url-bar">
        <div className="method-selector-wrapper">
          <button
            className={`method-selector ${method.toLowerCase()}`}
            onClick={() => setShowMethodDropdown(!showMethodDropdown)}
          >
            {method}
            <ChevronDownIcon />
          </button>
          {showMethodDropdown && (
            <div className="method-dropdown">
              {METHODS.map(m => (
                <button
                  key={m}
                  className={`method-option ${m.toLowerCase()} ${method === m ? 'active' : ''}`}
                  onClick={() => { setMethod(m); setShowMethodDropdown(false); }}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          className="url-input"
          value={url}
          onChange={e => setUrl(e.currentTarget.value)}
          placeholder="输入请求 URL..."
          onKeyDown={e => { if (e.key === 'Enter') sendRequest(); }}
          spellCheck={false}
        />
        <button
          className="send-btn"
          onClick={sendRequest}
          disabled={loading || !url.trim()}
        >
          {loading ? <SpinnerIcon /> : 'Send'}
          <ChevronDownIcon />
        </button>
        <button
          className={`icon-btn history-btn ${showHistory ? 'active' : ''}`}
          onClick={() => setShowHistory(!showHistory)}
          title="历史记录"
        >
          <ClockIcon />
        </button>
      </div>

      {/* ===== Request Tabs ===== */}
      <div className="req-tabs">
        {requestTabs.map(tab => (
          <button
            key={tab.id}
            className={`req-config-tab ${requestTab === tab.id ? 'active' : ''} ${tab.id === 'body' && !hasBody ? 'disabled' : ''}`}
            onClick={() => hasBody || tab.id !== 'body' ? setRequestTab(tab.id) : undefined}
          >
            {tab.label}
            {tab.badge ? <span className="tab-badge">{tab.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* ===== Main Split ===== */}
      <div className="main-split">
        {/* Request Config */}
        <div className="config-panel">
          {requestTab === 'headers' && (
            <KVEditor
              pairs={headers}
              onUpdate={(i, f, v) => updateKV(setHeaders, i, f, v)}
              onRemove={i => removeKV(setHeaders, i)}
              onAdd={() => addKV(setHeaders)}
            />
          )}
          {requestTab === 'params' && (
            <KVEditor
              pairs={params}
              onUpdate={(i, f, v) => updateKV(setParams, i, f, v)}
              onRemove={i => removeKV(setParams, i)}
              onAdd={() => addKV(setParams)}
            />
          )}
          {requestTab === 'body' && hasBody && (
            <div className="body-editor">
              <div className="body-type-bar">
                <button
                  className={`body-type-btn ${bodyType === 'json' ? 'active' : ''}`}
                  onClick={() => setBodyType('json')}
                >JSON</button>
                <button
                  className={`body-type-btn ${bodyType === 'text' ? 'active' : ''}`}
                  onClick={() => setBodyType('text')}
                >Text</button>
              </div>
              <textarea
                className="body-textarea"
                value={bodyContent}
                onChange={e => setBodyContent(e.currentTarget.value)}
                placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : '输入请求体内容...'}
                rows={6}
                spellCheck={false}
              />
            </div>
          )}
          {requestTab === 'body' && !hasBody && (
            <div className="body-disabled">{method} 请求不支持 Body</div>
          )}
          {requestTab === 'auth' && (
            <div className="auth-placeholder">
              <div className="auth-empty">
                <span>Authorization 配置暂未实现</span>
                <span className="auth-hint">可通过 Headers 栱签手动添加认证头</span>
              </div>
            </div>
          )}
        </div>

        {/* Response */}
        <div className="response-panel">
          <div className="response-header">
            <span className="response-label">响应</span>
            {response && (
              <>
                <span className={`status-chip ${statusClass(response.status)}`}>
                  {response.status} {response.statusText}
                </span>
                <span className="response-meta">{response.time}ms</span>
                <span className="response-meta">{formatSize(response.size)}</span>
              </>
            )}
            {response && (
              <button className="icon-btn copy-response" onClick={() => copyText(response.bodyPreview)} title="复制响应">
                <CopyIcon />
              </button>
            )}
            {loading && (
              <span className="response-loading">
                <SpinnerIcon /> 请求中...
              </span>
            )}
          </div>

          {error && <div className="response-error">{error}</div>}

          {response && (
            <>
              <div className="response-tabs">
                <button
                  className={`resp-tab ${responseTab === 'body' ? 'active' : ''}`}
                  onClick={() => setResponseTab('body')}
                >Body</button>
                <button
                  className={`resp-tab ${responseTab === 'headers' ? 'active' : ''}`}
                  onClick={() => setResponseTab('headers')}
                >Headers</button>
              </div>
              <div className="response-content">
                {responseTab === 'body' && (
                  <pre className="response-body">{response.bodyPreview || '(空响应)'}</pre>
                )}
                {responseTab === 'headers' && (
                  <div className="response-headers">
                    {Object.entries(response.headers).map(([k, v]) => (
                      <div className="header-row" key={k}>
                        <span className="header-key">{k}</span>
                        <span className="header-value">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!response && !error && !loading && (
            <div className="response-empty">
              <div className="empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </div>
              <span>输入 URL 并点击 Send 发送请求</span>
            </div>
          )}
        </div>
      </div>

      {/* ===== History Panel ===== */}
      {showHistory && (
        <div className="history-overlay" onClick={() => setShowHistory(false)}>
          <div className="history-panel" onClick={e => e.stopPropagation()}>
            <div className="history-header">
              <span className="history-title">
                <ClockIcon /> 历史记录
              </span>
              {history.length > 0 && (
                <button className="history-clear" onClick={clearHistory}>清空</button>
              )}
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <div className="history-empty">暂无记录</div>
              ) : (
                history.map(entry => (
                  <div
                    className="history-item"
                    key={entry.id}
                    onClick={() => loadHistoryEntry(entry)}
                  >
                    <span className={`history-method ${entry.method.toLowerCase()}`}>{entry.method}</span>
                    <span className="history-url">{entry.url}</span>
                    <span className={`history-status ${statusClass(entry.status)}`}>{entry.status}</span>
                    <span className="history-meta">{entry.time}ms</span>
                    <span className="history-date">{formatTime(entry.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
