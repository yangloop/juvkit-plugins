import React, { useState } from 'react';
import type { TOTPAccount, TOTPCodeState } from '../types';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import CircularProgress from './CircularProgress';

interface AccountCardProps {
  account: TOTPAccount;
  codeState: TOTPCodeState | undefined;
  api: ExternalPluginAPI;
  onEdit: (account: TOTPAccount) => void;
  onDelete: (id: string) => void;
  onShowQR: (account: TOTPAccount) => void;
}

export default function AccountCard({ account, codeState, api, onEdit, onDelete, onShowQR }: AccountCardProps) {
  const [copied, setCopied] = useState(false);

  const code = codeState?.code || '------';
  const remaining = codeState?.remaining || 0;
  const progress = account.period > 0 ? remaining / account.period : 0;

  const formatCode = (c: string) => {
    if (c.length === 6) return c.slice(0, 3) + ' ' + c.slice(3);
    if (c.length === 8) return c.slice(0, 4) + ' ' + c.slice(4);
    return c;
  };

  const handleCopy = async () => {
    if (!codeState) return;
    await api.helpers.copyToClipboard(codeState.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="account-card">
      <div className="account-info">
        <div className="account-issuer">{account.issuer || '未命名'}</div>
        <div className="account-name">{account.accountName}</div>
      </div>

      <div className="account-code-area" onClick={handleCopy}>
        <span className={`totp-code ${copied ? 'copied' : ''}`}>
          {copied ? '已复制!' : formatCode(code)}
        </span>
      </div>

      <div className="account-timer">
        <CircularProgress progress={progress} remaining={remaining} period={account.period} />
      </div>

      <div className="account-actions">
        <button className="action-btn" onClick={() => onShowQR(account)} title="二维码">⬒</button>
        <button className="action-btn" onClick={() => onEdit(account)} title="编辑">✎</button>
        {showConfirm ? (
          <div className="delete-confirm">
            <button className="action-btn danger" onClick={() => { onDelete(account.id); setShowConfirm(false); }}>确认</button>
            <button className="action-btn" onClick={() => setShowConfirm(false)}>取消</button>
          </div>
        ) : (
          <button className="action-btn danger" onClick={() => setShowConfirm(true)} title="删除">✕</button>
        )}
      </div>
    </div>
  );
}
