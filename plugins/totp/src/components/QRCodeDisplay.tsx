import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { TOTPAccount } from '../types';
import { buildOTPAuthURL } from '../utils/totp';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';

interface QRCodeDisplayProps {
  account: TOTPAccount;
  api: ExternalPluginAPI;
  onClose: () => void;
}

export default function QRCodeDisplay({ account, api, onClose }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const otpauthUrl = buildOTPAuthURL(account);

  useEffect(() => {
    QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(url => {
      setQrDataUrl(url);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [otpauthUrl]);

  const handleCopyUrl = async () => {
    await api.helpers.copyToClipboard(otpauthUrl);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content qr-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{account.issuer} - {account.accountName}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="qr-display">
          {loading ? (
            <div className="qr-loading">生成中...</div>
          ) : qrDataUrl ? (
            <img src={qrDataUrl} alt="TOTP QR Code" className="qr-image" />
          ) : (
            <div className="qr-loading">生成失败</div>
          )}
        </div>

        <div className="qr-url">
          <code>{otpauthUrl}</code>
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
          <button className="btn btn-primary" onClick={handleCopyUrl}>复制 URL</button>
        </div>
      </div>
    </div>
  );
}
