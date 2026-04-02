import React, { useState } from 'react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { downloadAsFile } from '../utils/download';

interface KeyDisplayProps {
  label: string;
  value: string;
  filename: string;
  api: ExternalPluginAPI;
}

export default function KeyDisplay({ label, value, filename, api }: KeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await api.helpers.copyToClipboard(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleDownload = () => {
    downloadAsFile(value, filename);
  };

  return (
    <div className="key-display">
      <div className="key-display-header">
        <span className="key-label">{label}</span>
        <div className="key-actions">
          <button className="action-btn" onClick={handleCopy} title="复制">
            {copied ? '✓' : '⎘'}
          </button>
          <button className="action-btn" onClick={handleDownload} title="下载">
            ⬇
          </button>
        </div>
      </div>
      <textarea
        className="key-textarea"
        value={value}
        readOnly
        rows={6}
      />
    </div>
  );
}
