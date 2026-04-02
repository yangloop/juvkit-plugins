import React from 'react';
import type { TOTPAccount, TOTPCodeState } from '../types';
import type { ExternalPluginAPI } from '@juvkit/plugin-sdk';
import AccountCard from './AccountCard';

interface AccountListProps {
  accounts: TOTPAccount[];
  codes: Map<string, TOTPCodeState>;
  searchQuery: string;
  api: ExternalPluginAPI;
  onEdit: (account: TOTPAccount) => void;
  onDelete: (id: string) => void;
  onShowQR: (account: TOTPAccount) => void;
}

export default function AccountList({ accounts, codes, searchQuery, api, onEdit, onDelete, onShowQR }: AccountListProps) {
  const filtered = searchQuery
    ? accounts.filter(a =>
        a.issuer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.accountName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : accounts;

  if (filtered.length === 0) {
    return (
      <div className="account-list-empty">
        {accounts.length === 0
          ? '还没有账户，点击上方 + 添加'
          : '没有匹配的账户'}
      </div>
    );
  }

  return (
    <div className="account-list">
      {filtered.map(account => (
        <AccountCard
          key={account.id}
          account={account}
          codeState={codes.get(account.id)}
          api={api}
          onEdit={onEdit}
          onDelete={onDelete}
          onShowQR={onShowQR}
        />
      ))}
    </div>
  );
}
