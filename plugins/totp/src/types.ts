/** TOTP 账户条目 */
export interface TOTPAccount {
  id: string;
  issuer: string;
  accountName: string;
  secret: string;
  digits: 6 | 8;
  period: number;
  algorithm: 'SHA-1' | 'SHA-256' | 'SHA-512';
  createdAt: string;
}

/** 解析 otpauth:// URL 后的参数 */
export interface OTPAuthParams {
  issuer: string;
  accountName: string;
  secret: string;
  digits: number;
  period: number;
  algorithm: string;
}

/** 导出文件格式 */
export interface ExportData {
  format: 'juvkit-totp-v1';
  version: number;
  exportedAt: string;
  accounts: TOTPAccount[];
}

/** 弹窗类型 */
export type ModalType = 'none' | 'add' | 'edit' | 'import' | 'export' | 'qr';

/** TOTP 验证码状态 */
export interface TOTPCodeState {
  code: string;
  remaining: number;
}
