import type { TOTPAccount, ExportData } from '../types';

/** 导出账户为 JSON 字符串 */
export function exportToJSON(accounts: TOTPAccount[]): string {
  const data: ExportData = {
    format: 'juvkit-totp-v1',
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
  };
  return JSON.stringify(data, null, 2);
}

/** 解析导入的 JSON */
export function parseImportJSON(json: string): TOTPAccount[] {
  const data = JSON.parse(json);
  if (Array.isArray(data)) return validateAccounts(data);
  if (data.accounts && Array.isArray(data.accounts)) return validateAccounts(data.accounts);
  throw new Error('无效的导入格式');
}

/** 验证账户数组字段完整性 */
function validateAccounts(accounts: any[]): TOTPAccount[] {
  return accounts.filter(a =>
    a && typeof a.issuer === 'string' &&
    typeof a.accountName === 'string' &&
    typeof a.secret === 'string'
  ).map(a => ({
    id: a.id || crypto.randomUUID(),
    issuer: a.issuer,
    accountName: a.accountName,
    secret: a.secret,
    digits: a.digits === 8 ? 8 : 6,
    period: typeof a.period === 'number' ? a.period : 30,
    algorithm: ['SHA-1', 'SHA-256', 'SHA-512'].includes(a.algorithm) ? a.algorithm : 'SHA-1',
    createdAt: a.createdAt || new Date().toISOString(),
  }));
}

/** 触发浏览器文件下载 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
