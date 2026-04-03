import React, { useState } from 'react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { encrypt, decrypt, maxPlaintextBytes } from '../utils/rsa';
import type { RSAKeyPair, RSAKeySize } from '../utils/rsa';

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

  // 自定义密钥输入
  const [useCustomKey, setUseCustomKey] = useState(false);
  const [customKeyPEM, setCustomKeyPEM] = useState('');

  // 优先使用自定义密钥，否则用生成的密钥
  const activeKeyPEM = useCustomKey
    ? customKeyPEM.trim()
    : (mode === 'encrypt' ? keyPair?.publicKeyPEM : keyPair?.privateKeyPEM) || '';
  const hasKey = activeKeyPEM.length > 0;

  // 估算密钥大小（从 PEM 推算）
  const estimatedSize = (): RSAKeySize | null => {
    const b64 = activeKeyPEM.replace(/-----[\s\S]*?-----/g, '').replace(/\s/g, '');
    const byteLen = Math.floor(b64.length * 3 / 4);
    // PKCS#8 私钥 DER 约 keySize/8 + 200~300, SPKI 公钥约 keySize/8 + 30
    if (byteLen > 500) return 4096;
    if (byteLen > 350) return 3072;
    return 2048;
  };
  const maxSize = hasKey ? maxPlaintextBytes(estimatedSize() || 2048) : 0;

  const inputBytes = new TextEncoder().encode(input).length;

  const handleAction = async () => {
    if (!hasKey || !input.trim()) return;

    setLoading(true);
    setError(null);
    setResult('');

    try {
      if (mode === 'encrypt') {
        if (inputBytes > maxSize) {
          setError(`明文过长：${inputBytes} 字节，最大约 ${maxSize} 字节`);
          return;
        }
        const ciphertext = await encrypt(input, activeKeyPEM);
        setResult(ciphertext);
      } else {
        const plaintext = await decrypt(input.trim(), activeKeyPEM);
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

  const keyLabel = mode === 'encrypt' ? '公钥 (PEM)' : '私钥 (PEM)';

  return (
    <div className="crypto-panel">
      {/* 密钥来源切换 */}
      <div className="key-source-bar">
        <button
          className={`key-source-btn ${!useCustomKey ? 'active' : ''}`}
          onClick={() => setUseCustomKey(false)}
          disabled={!keyPair}
        >
          生成的密钥
        </button>
        <button
          className={`key-source-btn ${useCustomKey ? 'active' : ''}`}
          onClick={() => setUseCustomKey(true)}
        >
          粘贴密钥
        </button>
      </div>

      {/* 自定义密钥输入 */}
      {useCustomKey && (
        <div className="form-row">
          <label>{keyLabel}</label>
          <textarea
            className="crypto-textarea"
            value={customKeyPEM}
            onChange={e => setCustomKeyPEM(e.target.value)}
            placeholder={`粘贴 ${mode === 'encrypt' ? '公钥' : '私钥'} PEM...\n-----BEGIN ${mode === 'encrypt' ? 'PUBLIC' : 'PRIVATE'} KEY-----\n...\n-----END ${mode === 'encrypt' ? 'PUBLIC' : 'PRIVATE'} KEY-----`}
            rows={4}
          />
        </div>
      )}

      {/* 密钥状态提示 */}
      {!hasKey && (
        <div className="form-error">
          {useCustomKey
            ? `请粘贴 ${mode === 'encrypt' ? '公钥' : '私钥'} PEM`
            : '请先在「密钥生成」标签页生成密钥对，或切换到「粘贴密钥」'}
        </div>
      )}
      {hasKey && (
        <div className="key-info-badge">
          密钥已就绪 · 加密最大约 {maxSize} 字节
        </div>
      )}

      {/* 数据输入 */}
      <div className="form-row">
        <label>{mode === 'encrypt' ? '明文' : '密文 (Base64)'}</label>
        <textarea
          className="crypto-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === 'encrypt' ? '输入要加密的文本...' : '输入 Base64 密文...'}
          rows={4}
        />
        {mode === 'encrypt' && hasKey && (
          <div className={`char-counter ${inputBytes > maxSize ? 'over' : ''}`}>
            {inputBytes} / {maxSize} 字节
          </div>
        )}
      </div>

      <button
        className="btn btn-primary"
        onClick={handleAction}
        disabled={loading || !input.trim() || !hasKey}
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
