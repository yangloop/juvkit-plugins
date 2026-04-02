import React, { useState } from 'react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { generateKeyPair, maxPlaintextBytes } from '../utils/rsa';
import type { RSAKeyPair, RSAKeySize } from '../utils/rsa';
import KeyDisplay from './KeyDisplay';
import { downloadAsFile } from '../utils/download';

interface KeyGeneratorProps {
  api: ExternalPluginAPI;
  keyPair: RSAKeyPair | null;
  onKeyGenerated: (kp: RSAKeyPair) => void;
}

const KEY_SIZES: { value: RSAKeySize; label: string }[] = [
  { value: 2048, label: '2048' },
  { value: 3072, label: '3072' },
  { value: 4096, label: '4096' },
];

export default function KeyGenerator({ api, keyPair, onKeyGenerated }: KeyGeneratorProps) {
  const [keySize, setKeySize] = useState<RSAKeySize>(2048);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const kp = await generateKeyPair(keySize);
      onKeyGenerated(kp);
    } catch (e: any) {
      setError(e?.message || e?.toString() || '密钥生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadAll = () => {
    if (!keyPair) return;
    const content = `${keyPair.privateKeyPEM}\n\n${keyPair.publicKeyPEM}`;
    downloadAsFile(content, `rsa_${keyPair.keySize}_${Date.now()}.pem`);
  };

  return (
    <div className="key-generator">
      <div className="gen-section">
        <div className="form-row">
          <label>密钥长度</label>
          <div className="key-size-selector">
            {KEY_SIZES.map(s => (
              <button
                key={s.value}
                className={`key-size-option ${keySize === s.value ? 'active' : ''}`}
                onClick={() => setKeySize(s.value)}
              >
                {s.label} bit
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary btn-generate"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? '生成中...' : '生成密钥对'}
        </button>

        {error && <div className="form-error">{error}</div>}
      </div>

      {keyPair && (
        <div className="gen-results">
          <KeyDisplay
            label="公钥 (Public Key)"
            value={keyPair.publicKeyPEM}
            filename="public_key.pem"
            api={api}
          />
          <KeyDisplay
            label="私钥 (Private Key)"
            value={keyPair.privateKeyPEM}
            filename="private_key.pem"
            api={api}
          />

          <div className="gen-footer">
            <div className="gen-info">
              {keyPair.keySize} 位密钥 · 加密最大 {maxPlaintextBytes(keyPair.keySize)} 字节
            </div>
            <button className="btn btn-secondary" onClick={handleDownloadAll}>
              全部下载
            </button>
          </div>

          <div className="gen-warning">
            关闭窗口后密钥将丢失，请及时复制或下载保存
          </div>
        </div>
      )}
    </div>
  );
}
