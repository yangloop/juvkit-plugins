import React, { useState, useEffect } from 'react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { watchTheme } from '@juvkit/plugin-sdk';
import type { RSAKeyPair } from './utils/rsa';
import KeyGenerator from './components/KeyGenerator';
import CryptoPanel from './components/CryptoPanel';
import './App.css';

type TabType = 'generate' | 'encrypt' | 'decrypt';

interface AppProps {
  api: ExternalPluginAPI;
}

export default function App({ api }: AppProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [keyPair, setKeyPair] = useState<RSAKeyPair | null>(null);

  useEffect(() => watchTheme(setTheme), []);

  return (
    <div className={`rsa-app theme-${theme}`}>
      <div className="toolbar">
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            密钥生成
          </button>
          <button
            className={`tab-btn ${activeTab === 'encrypt' ? 'active' : ''}`}
            onClick={() => setActiveTab('encrypt')}
          >
            加密测试
          </button>
          <button
            className={`tab-btn ${activeTab === 'decrypt' ? 'active' : ''}`}
            onClick={() => setActiveTab('decrypt')}
          >
            解密测试
          </button>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'generate' && (
          <KeyGenerator api={api} keyPair={keyPair} onKeyGenerated={setKeyPair} />
        )}
        {(activeTab === 'encrypt' || activeTab === 'decrypt') && (
          <CryptoPanel api={api} keyPair={keyPair} mode={activeTab} />
        )}
      </div>
    </div>
  );
}
