export type RSAKeySize = 2048 | 3072 | 4096;

export interface RSAKeyPair {
  publicKeyPEM: string;
  privateKeyPEM: string;
  keySize: RSAKeySize;
}

/** RSA-OAEP SHA-256 最大明文字节数 */
export function maxPlaintextBytes(keySize: RSAKeySize): number {
  return keySize / 8 - 66;
}

const tauri = (window as any).__TAURI__;

function getPluginId(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || '';
}

function ipc(method: string, ...args: any[]): Promise<any> {
  return tauri.core.invoke('handle_plugin_ipc', {
    pluginId: getPluginId(),
    method,
    args,
  });
}

/** 通过 Rust 后端生成 RSA 密钥对 */
export async function generateKeyPair(keySize: RSAKeySize): Promise<RSAKeyPair> {
  return ipc('rsa.generateKeyPair', keySize);
}

/** 通过 Rust 后端加密 */
export async function encrypt(plaintext: string, publicKeyPEM: string): Promise<string> {
  const result = await ipc('rsa.encrypt', plaintext, publicKeyPEM);
  return result.ciphertext;
}

/** 通过 Rust 后端解密 */
export async function decrypt(ciphertext: string, privateKeyPEM: string): Promise<string> {
  const result = await ipc('rsa.decrypt', ciphertext, privateKeyPEM);
  return result.plaintext;
}
