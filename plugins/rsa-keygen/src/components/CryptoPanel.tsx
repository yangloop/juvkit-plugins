import React, { useState } from 'react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { encrypt, decrypt, maxPlaintextBytes } from '../utils/rsa';
import type { RSAKeyPair } from '../utils/rsa';

interface CryptoPanelProps {
  api: ExternalPluginAPI;
  keyPair: RSAKeyPair | null;
  mode: 'encrypt' | 'decrypt';
}

export default function CryptoPanel({ api, keyPair, mode }: CryptoPanelProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inputBytes = new TextEncoder().encode(input).length;
  const maxSize = keyPair ? maxPlaintextBytes(keyPair.keySize) : 0;

  const handleAction = async () => {
    if (!keyPair || !input.trim()) return;

    setLoading(true);
    setError(null);
    setResult('');

    try {
      if (mode === 'encrypt') {
        if (inputBytes > maxSize) {
          setError(`明文过长：${inputBytes} 字节，最大 ${maxSize} 字节`);
          return;
        }
        const ciphertext = await encrypt(input, keyPair.publicKeyPEM);
        setResult(ciphertext);
      } else {
        const plaintext = await decrypt(input.trim(), keyPair.privateKeyPEM);
        setResult(plaintext);
      }
    } catch (e: any) {
      setError(e?.message || e?.toString() || (mode === 'encrypt' ? '加密失败' : '解密失败，请检查密文和密钥是否匹配'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await api.helpers.copyToClipboard(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (!keyPair) {
    return (
      <div className="crypto-panel">
        <div className="crypto-empty">
          请先在「密钥生成」标签页生成密钥对
        </div>
      </div>
    );
  }

  return (
    <div className="crypto-panel">
      <div className="key-info-badge">
        {keyPair.keySize} 位密钥 · 最大 {maxSize} 字节
      </div>

      <div className="form-row">
        <label>{mode === 'encrypt' ? '明文' : '密文 (Base64)'}</label>
        <textarea
          className="crypto-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === 'encrypt' ? '输入要加密的文本...' : '输入 Base64 密文...'}
          rows={4}
        />
        {mode === 'encrypt' && (
          <div className={`char-counter ${inputBytes > maxSize ? 'over' : ''}`}>
            {inputBytes} / {maxSize} 字节
          </div>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={handleAction}
        disabled={loading || !input.trim()}
      >
        {loading ? '处理中...' : mode === 'encrypt' ? '加密' : '解密'}
      </button>

      {error && <div className="form-error">{error}</div>}

      {result && (
        <div className="crypto-result">
          <div className="crypto-result-header">
            <label>{mode === 'encrypt' ? '密文 (Base64)' : '解密结果'}</label>
            <button className="action-btn" onClick={handleCopy}>
              {copied ? '✓' : '⎘'}
            </button>
          </div>
          <textarea
            className="crypto-textarea result"
            value={result}
            readOnly
            rows={4}
          />
        </div>
      )}
    </div>
  );
}
