import { TOTP, URI } from 'otpauth';
import type { TOTPAccount, OTPAuthParams, TOTPCodeState } from '../types';

/** 生成 TOTP 验证码 */
export function generateTOTP(account: TOTPAccount): string {
  const totp = new TOTP({
    issuer: account.issuer,
    label: account.accountName,
    secret: account.secret,
    digits: account.digits,
    period: account.period,
    algorithm: account.algorithm,
  });
  return totp.generate();
}

/** 构建 otpauth:// URL */
export function buildOTPAuthURL(account: TOTPAccount): string {
  const totp = new TOTP({
    issuer: account.issuer,
    label: account.accountName,
    secret: account.secret,
    digits: account.digits,
    period: account.period,
    algorithm: account.algorithm,
  });
  return totp.toString();
}

/** 解析 otpauth:// URL */
export function parseOTPAuthURL(url: string): OTPAuthParams | null {
  try {
    const parsed = URI.parse(url);
    if (parsed instanceof TOTP) {
      return {
        issuer: parsed.issuer || '',
        accountName: parsed.label || '',
        secret: (parsed.secret as any)?.buffer
          ? base32Encode((parsed.secret as any).buffer)
          : String(parsed.secret || ''),
        digits: parsed.digits,
        period: parsed.period,
        algorithm: parsed.algorithm,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** 计算当前周期剩余秒数 */
export function getRemainingSeconds(period: number): number {
  const epoch = Math.floor(Date.now() / 1000);
  return period - (epoch % period);
}

/** 批量生成验证码 */
export function generateCodes(accounts: TOTPAccount[]): Map<string, TOTPCodeState> {
  const map = new Map<string, TOTPCodeState>();
  for (const account of accounts) {
    map.set(account.id, {
      code: generateTOTP(account),
      remaining: getRemainingSeconds(account.period),
    });
  }
  return map;
}

/** Base32 编码 */
function base32Encode(buffer: ArrayBuffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = new Uint8Array(buffer);
  let bits = '';
  let result = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    result += alphabet[parseInt(bits.slice(i, i + 5), 2)];
  }
  return result;
}

/** 验证 Base32 密钥格式 */
export function isValidBase32(secret: string): boolean {
  return /^[A-Z2-7]+=*$/i.test(secret) && secret.replace(/=/g, '').length >= 16;
}
