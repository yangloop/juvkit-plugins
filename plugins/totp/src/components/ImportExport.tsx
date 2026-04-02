import React, { useState, useRef, useEffect } from 'react';
import type { TOTPAccount } from '../types';
import { buildOTPAuthURL } from '../utils/totp';
import { exportToJSON, parseImportJSON, downloadFile } from '../utils/export';
import { parseOTPAuthURL } from '../utils/totp';
import QRCode from 'qrcode';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';

interface ImportExportProps {
  accounts: TOTPAccount[];
  api: ExternalPluginAPI;
  onImport: (accounts: TOTPAccount[]) => void;
  onClose: () => void;
}

export default function ImportExport({ accounts, api, onImport, onClose }: ImportExportProps) {
  const [tab, setTab] = useState<'import' | 'export'>('import');
  const [importText, setImportText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // QR export state
  const [qrIndex, setQrIndex] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (tab === 'export' && accounts.length > 0) {
      generateQR(qrIndex);
    }
  }, [tab, qrIndex, accounts]);

  const generateQR = async (index: number) => {
    if (index >= accounts.length) return;
    const url = buildOTPAuthURL(accounts[index]);
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch { setQrDataUrl(''); }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    setError('');
    setSuccess('');
    const text = importText.trim();
    if (!text) { setError('请输入或选择导入内容'); return; }

    try {
      // 尝试解析为 otpauth URL
      if (text.startsWith('otpauth://')) {
        const params = parseOTPAuthURL(text);
        if (params) {
          const account: TOTPAccount = {
            id: crypto.randomUUID(),
            issuer: params.issuer,
            accountName: params.accountName,
            secret: params.secret,
            digits: (params.digits === 8 ? 8 : 6) as 6 | 8,
            period: params.period || 30,
            algorithm: (['SHA-1', 'SHA-256', 'SHA-512'].includes(params.algorithm) ? params.algorithm : 'SHA-1') as any,
            createdAt: new Date().toISOString(),
          };
          onImport([account]);
          setSuccess(`成功导入 1 个账户`);
          return;
        }
        setError('无法解析 otpauth URL');
        return;
      }

      // 解析 JSON
      const imported = parseImportJSON(text);
      if (imported.length === 0) { setError('未找到有效账户'); return; }
      onImport(imported);
      setSuccess(`成功导入 ${imported.length} 个账户`);
    } catch (e: any) {
      setError('导入失败: ' + e.message);
    }
  };

  const handleExportJSON = () => {
    const json = exportToJSON(accounts);
    downloadFile(json, 'totp-backup.json', 'application/json');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content import-export-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>导入 / 导出</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tab-bar">
          <button className={`tab-btn ${tab === 'import' ? 'active' : ''}`} onClick={() => setTab('import')}>导入</button>
          <button className={`tab-btn ${tab === 'export' ? 'active' : ''}`} onClick={() => setTab('export')}>导出</button>
        </div>

        {tab === 'import' && (
          <div className="tab-content">
            <div className="import-area">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
              <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                选择 JSON 文件
              </button>
              <span className="import-or">或粘贴内容</span>
            </div>
            <textarea
              className="form-textarea"
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={'粘贴 JSON 备份或 otpauth://totp/... URL'}
              rows={6}
            />
            {error && <div className="form-error">{error}</div>}
            {success && <div className="form-success">{success}</div>}
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={onClose}>关闭</button>
              <button className="btn btn-primary" onClick={handleImport}>导入</button>
            </div>
          </div>
        )}

        {tab === 'export' && (
          <div className="tab-content">
            <div className="export-buttons">
              <button className="btn btn-primary" onClick={handleExportJSON}>
                导出 JSON 备份
              </button>
            </div>

            {accounts.length > 0 && (
              <div className="qr-export">
                <div className="qr-export-label">
                  QR 码迁移 ({qrIndex + 1} / {accounts.length})
                </div>
                <div className="qr-export-card">
                  <div className="qr-export-info">{accounts[qrIndex].issuer} - {accounts[qrIndex].accountName}</div>
                  {qrDataUrl && <img src={qrDataUrl} alt="QR" className="qr-export-image" />}
                </div>
                <div className="qr-export-nav">
                  <button
                    className="btn btn-secondary"
                    disabled={qrIndex === 0}
                    onClick={() => setQrIndex(i => i - 1)}
                  >上一个</button>
                  <button
                    className="btn btn-secondary"
                    disabled={qrIndex >= accounts.length - 1}
                    onClick={() => setQrIndex(i => i + 1)}
                  >下一个</button>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={onClose}>关闭</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
