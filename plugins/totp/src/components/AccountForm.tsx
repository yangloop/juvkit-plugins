import React, { useState, useEffect } from 'react';
import type { TOTPAccount, OTPAuthParams } from '../types';
import { parseOTPAuthURL, isValidBase32 } from '../utils/totp';

interface AccountFormProps {
  account: TOTPAccount | null; // null = add mode, otherwise edit mode
  onSave: (data: Omit<TOTPAccount, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export default function AccountForm({ account, onSave, onCancel }: AccountFormProps) {
  const [issuer, setIssuer] = useState('');
  const [accountName, setAccountName] = useState('');
  const [secret, setSecret] = useState('');
  const [digits, setDigits] = useState<6 | 8>(6);
  const [period, setPeriod] = useState(30);
  const [algorithm, setAlgorithm] = useState<'SHA-1' | 'SHA-256' | 'SHA-512'>('SHA-1');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (account) {
      setIssuer(account.issuer);
      setAccountName(account.accountName);
      setSecret(account.secret);
      setDigits(account.digits);
      setPeriod(account.period);
      setAlgorithm(account.algorithm);
    }
  }, [account]);

  const handleParseUrl = () => {
    if (!otpauthUrl.trim()) return;
    const params = parseOTPAuthURL(otpauthUrl.trim());
    if (params) {
      setIssuer(params.issuer);
      setAccountName(params.accountName);
      setSecret(params.secret);
      if (params.digits === 8) setDigits(8);
      if ([15, 30, 60].includes(params.period)) setPeriod(params.period);
      if (['SHA-1', 'SHA-256', 'SHA-512'].includes(params.algorithm)) {
        setAlgorithm(params.algorithm as any);
      }
      setOtpauthUrl('');
      setError('');
    } else {
      setError('无法解析 otpauth:// URL');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!issuer.trim()) { setError('请输入发行者名称'); return; }
    if (!accountName.trim()) { setError('请输入账户名'); return; }
    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
    if (!isValidBase32(cleanSecret)) { setError('密钥格式无效，需要有效的 Base32 字符串（至少16位）'); return; }

    onSave({
      issuer: issuer.trim(),
      accountName: accountName.trim(),
      secret: cleanSecret,
      digits,
      period,
      algorithm,
    });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{account ? '编辑账户' : '添加账户'}</h3>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>

        <div className="otpauth-parse">
          <input
            className="form-input otpauth-input"
            value={otpauthUrl}
            onChange={e => setOtpauthUrl(e.target.value)}
            placeholder="粘贴 otpauth://totp/... URL 自动填充"
            onKeyDown={e => e.key === 'Enter' && handleParseUrl()}
          />
          <button className="btn btn-secondary" onClick={handleParseUrl} disabled={!otpauthUrl.trim()}>
            解析
          </button>
        </div>

        <form onSubmit={handleSubmit} className="account-form">
          <div className="form-row">
            <label>发行者</label>
            <input className="form-input" value={issuer} onChange={e => setIssuer(e.target.value)} placeholder="如 GitHub, Google" />
          </div>
          <div className="form-row">
            <label>账户名</label>
            <input className="form-input" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="user@email.com" />
          </div>
          <div className="form-row">
            <label>密钥 (Base32)</label>
            <input className="form-input mono" value={secret} onChange={e => setSecret(e.target.value.toUpperCase())} placeholder="JBSWY3DPEHPK3PXP" />
          </div>
          <div className="form-row-inline">
            <div className="form-row compact">
              <label>位数</label>
              <select className="form-select" value={digits} onChange={e => setDigits(Number(e.target.value) as 6 | 8)}>
                <option value={6}>6 位</option>
                <option value={8}>8 位</option>
              </select>
            </div>
            <div className="form-row compact">
              <label>周期(秒)</label>
              <select className="form-select" value={period} onChange={e => setPeriod(Number(e.target.value))}>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={60}>60</option>
              </select>
            </div>
            <div className="form-row compact">
              <label>算法</label>
              <select className="form-select" value={algorithm} onChange={e => setAlgorithm(e.target.value as any)}>
                <option value="SHA-1">SHA-1</option>
                <option value="SHA-256">SHA-256</option>
                <option value="SHA-512">SHA-512</option>
              </select>
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>取消</button>
            <button type="submit" className="btn btn-primary">{account ? '保存' : '添加'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
