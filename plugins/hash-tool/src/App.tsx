import React, { useState, useEffect, useCallback } from 'react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { watchTheme } from '@juvkit/plugin-sdk';
import {
  type HashAlgorithm,
  ALGORITHM_INFO,
  computeHash,
  computeHMAC,
  hashFile,
  openFilePicker,
  isHMACSupported,
} from './utils/hash';
import './App.css';

type TabType = 'text' | 'hmac' | 'file';

const ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

interface AppProps {
  api: ExternalPluginAPI;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function App({ api }: AppProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<TabType>('text');
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA-256');
  const [inputText, setInputText] = useState('');
  const [hmacKey, setHmacKey] = useState('');
  const [hmacText, setHmacText] = useState('');
  const [filePath, setFilePath] = useState('');
  const [result, setResult] = useState('');
  const [resultBitCount, setResultBitCount] = useState(0);
  const [resultHexLength, setResultHexLength] = useState(0);
  const [resultFileSize, setResultFileSize] = useState<number | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const pluginId = api.id;

  useEffect(() => watchTheme(setTheme), []);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await api.helpers.copyToClipboard(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [api, result]);

  const handleTextHash = useCallback(async () => {
    if (!inputText) return;
    setIsComputing(true);
    setError('');
    setResult('');
    try {
      const encoder = new TextEncoder();
      const res = await computeHash(pluginId, encoder.encode(inputText).buffer, algorithm);
      setResult(res.hash);
      setResultBitCount(res.bitCount);
      setResultHexLength(res.hexLength);
      setResultFileSize(null);
    } catch (e: any) {
      setError(e?.message || e?.toString() || '计算失败');
    } finally {
      setIsComputing(false);
    }
  }, [inputText, algorithm, pluginId]);

  const handleHMAC = useCallback(async () => {
    if (!hmacText || !hmacKey) return;
    if (!isHMACSupported(algorithm)) {
      setError('HMAC 不支持 MD5 算法');
      return;
    }
    setIsComputing(true);
    setError('');
    setResult('');
    try {
      const encoder = new TextEncoder();
      const res = await computeHMAC(
        pluginId,
        encoder.encode(hmacText).buffer,
        hmacKey,
        algorithm as 'SHA-1' | 'SHA-256' | 'SHA-512'
      );
      setResult(res.hash);
      setResultBitCount(res.bitCount);
      setResultHexLength(res.hexLength);
      setResultFileSize(null);
    } catch (e: any) {
      setError(e?.message || e?.toString() || '计算失败');
    } finally {
      setIsComputing(false);
    }
  }, [hmacKey, hmacText, algorithm, pluginId]);

  const handleFileHash = useCallback(async () => {
    if (!filePath.trim()) {
      setError('请输入文件路径');
      return;
    }
    setIsComputing(true);
    setError('');
    setResult('');
    try {
      const res = await hashFile(pluginId, filePath.trim(), algorithm);
      setResult(res.hash);
      setResultBitCount(res.bitCount);
      setResultHexLength(res.hexLength);
      setResultFileSize(res.fileSize);
    } catch (e: any) {
      setError(e?.message || e?.toString() || '计算失败');
    } finally {
      setIsComputing(false);
    }
  }, [filePath, algorithm, pluginId]);

  const info = ALGORITHM_INFO[algorithm];

  return (
    <div className={`hash-app theme-${theme}`}>
      <div className="toolbar">
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => { setActiveTab('text'); setResult(''); setError(''); }}
          >
            文本哈希
          </button>
          <button
            className={`tab-btn ${activeTab === 'hmac' ? 'active' : ''}`}
            onClick={() => { setActiveTab('hmac'); setResult(''); setError(''); }}
          >
            HMAC 签名
          </button>
          <button
            className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => { setActiveTab('file'); setResult(''); setError(''); }}
          >
            文件哈希
          </button>
        </div>
      </div>

      <div className="tab-content">
        {/* Algorithm Selector */}
        <div className="form-row">
          <label>选择算法</label>
          <div className="key-size-selector">
            {ALGORITHMS.map(algo => (
              <button
                key={algo}
                className={`key-size-option ${algorithm === algo ? 'active' : ''}`}
                onClick={() => setAlgorithm(algo)}
              >
                {algo}
              </button>
            ))}
          </div>
        </div>

        {/* Text Hash Tab */}
        {activeTab === 'text' && (
          <div className="hash-section">
            <div className="form-row">
              <label>输入文本</label>
              <textarea
                className="crypto-textarea"
                rows={4}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="输入需要计算哈希的文本..."
              />
            </div>
            <button
              className="btn btn-primary btn-compute"
              onClick={handleTextHash}
              disabled={!inputText || isComputing}
            >
              {isComputing ? '计算中...' : '计算哈希'}
            </button>
          </div>
        )}

        {/* HMAC Tab */}
        {activeTab === 'hmac' && (
          <div className="hash-section">
            {!isHMACSupported(algorithm) && (
              <div className="form-warning">
                HMAC 不支持 MD5 算法，请选择 SHA 系列算法
              </div>
            )}
            <div className="form-row">
              <label>密钥 (Secret Key)</label>
              <input
                type="text"
                className="hash-input"
                value={hmacKey}
                onChange={e => setHmacKey(e.target.value)}
                placeholder="输入 HMAC 密钥..."
              />
            </div>
            <div className="form-row">
              <label>输入文本</label>
              <textarea
                className="crypto-textarea"
                rows={4}
                value={hmacText}
                onChange={e => setHmacText(e.target.value)}
                placeholder="输入需要签名的文本..."
              />
            </div>
            <button
              className="btn btn-primary btn-compute"
              onClick={handleHMAC}
              disabled={!hmacText || !hmacKey || isComputing || !isHMACSupported(algorithm)}
            >
              {isComputing ? '计算中...' : '计算 HMAC'}
            </button>
          </div>
        )}

        {/* File Hash Tab */}
        {activeTab === 'file' && (
          <div className="hash-section">
            <div className="form-row">
              <label>选择文件</label>
              <button
                className="btn btn-secondary btn-file"
                onClick={async () => {
                  const path = await openFilePicker(pluginId);
                  if (path) {
                    setFilePath(path);
                    setResult('');
                    setError('');
                    setResultFileSize(null);
                  }
                }}
              >
                选择文件...
              </button>
            </div>
            {filePath && (
              <div className="file-info">
                <span className="file-name">{filePath.split('/').pop() || filePath}</span>
                <span className="file-path">{filePath}</span>
              </div>
            )}
            {resultFileSize !== null && (
              <div className="file-meta">
                <span className="key-info-badge">{formatFileSize(resultFileSize)}</span>
              </div>
            )}
            <button
              className="btn btn-primary btn-compute"
              onClick={handleFileHash}
              disabled={!filePath || isComputing}
            >
              {isComputing ? '计算中...' : '计算文件哈希'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && <div className="form-error">{error}</div>}

        {/* Result */}
        {result && (
          <div className="crypto-result">
            <div className="crypto-result-header">
              <label>计算结果</label>
              <button className="action-btn" onClick={handleCopy} title="复制">
                {copied ? '✓' : '⎘'}
              </button>
            </div>
            <textarea
              className="crypto-textarea result"
              rows={4}
              value={result}
              readOnly
            />
            <div className="result-info">
              <span className="key-info-badge">{algorithm}</span>
              <span className="key-info-badge">{resultBitCount} bit</span>
              <span className="key-info-badge">{resultHexLength} hex chars</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
