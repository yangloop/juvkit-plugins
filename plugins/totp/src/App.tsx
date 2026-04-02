import React, { useState, useEffect, useCallback } from 'react';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import { watchTheme } from '@juvkit/plugin-sdk';
import type { TOTPAccount, TOTPCodeState, ModalType } from './types';
import { generateCodes } from './utils/totp';
import AccountList from './components/AccountList';
import AccountForm from './components/AccountForm';
import ImportExport from './components/ImportExport';
import QRCodeDisplay from './components/QRCodeDisplay';
import './App.css';

interface AppProps {
  api: ExternalPluginAPI;
}

export default function App({ api }: AppProps) {
  const [accounts, setAccounts] = useState<TOTPAccount[]>([]);
  const [codes, setCodes] = useState<Map<string, TOTPCodeState>>(new Map());
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [editingAccount, setEditingAccount] = useState<TOTPAccount | null>(null);
  const [qrAccount, setQrAccount] = useState<TOTPAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载账户
  useEffect(() => {
    api.storage.get<TOTPAccount[]>('accounts').then(data => {
      if (data && Array.isArray(data)) setAccounts(data);
    });
  }, [api]);

  // 主题监听
  useEffect(() => watchTheme(setTheme), []);

  // 每秒刷新验证码
  useEffect(() => {
    const update = () => setCodes(generateCodes(accounts));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [accounts]);

  // 持久化账户
  const saveAccounts = useCallback((updated: TOTPAccount[]) => {
    setAccounts(updated);
    api.storage.set('accounts', updated);
  }, [api]);

  const addAccount = useCallback((data: Omit<TOTPAccount, 'id' | 'createdAt'>) => {
    const account: TOTPAccount = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    saveAccounts([...accounts, account]);
    setActiveModal('none');
  }, [accounts, saveAccounts]);

  const updateAccount = useCallback((data: Omit<TOTPAccount, 'id' | 'createdAt'>) => {
    if (!editingAccount) return;
    saveAccounts(accounts.map(a =>
      a.id === editingAccount.id ? { ...a, ...data } : a
    ));
    setEditingAccount(null);
    setActiveModal('none');
  }, [accounts, editingAccount, saveAccounts]);

  const deleteAccount = useCallback((id: string) => {
    saveAccounts(accounts.filter(a => a.id !== id));
  }, [accounts, saveAccounts]);

  const importAccounts = useCallback((imported: TOTPAccount[]) => {
    const existingIds = new Set(accounts.map(a => a.id));
    const newAccounts = imported.filter(a => !existingIds.has(a.id));
    saveAccounts([...accounts, ...newAccounts]);
  }, [accounts, saveAccounts]);

  const handleEdit = useCallback((account: TOTPAccount) => {
    setEditingAccount(account);
    setActiveModal('edit');
  }, []);

  const handleShowQR = useCallback((account: TOTPAccount) => {
    setQrAccount(account);
    setActiveModal('qr');
  }, []);

  return (
    <div className={`totp-app theme-${theme}`}>
      <div className="toolbar">
        <div className="toolbar-left">
          <input
            className="search-input"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索账户..."
          />
        </div>
        <div className="toolbar-right">
          <button className="toolbar-btn" onClick={() => setActiveModal('import')} title="导入/导出">⬆</button>
          <button className="toolbar-btn primary" onClick={() => { setEditingAccount(null); setActiveModal('add'); }} title="添加账户">+</button>
        </div>
      </div>

      <AccountList
        accounts={accounts}
        codes={codes}
        searchQuery={searchQuery}
        api={api}
        onEdit={handleEdit}
        onDelete={deleteAccount}
        onShowQR={handleShowQR}
      />

      {activeModal === 'add' && (
        <AccountForm
          account={null}
          onSave={addAccount}
          onCancel={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'edit' && editingAccount && (
        <AccountForm
          account={editingAccount}
          onSave={updateAccount}
          onCancel={() => { setEditingAccount(null); setActiveModal('none'); }}
        />
      )}

      {activeModal === 'import' && (
        <ImportExport
          accounts={accounts}
          api={api}
          onImport={importAccounts}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'qr' && qrAccount && (
        <QRCodeDisplay
          account={qrAccount}
          api={api}
          onClose={() => { setQrAccount(null); setActiveModal('none'); }}
        />
      )}
    </div>
  );
}
